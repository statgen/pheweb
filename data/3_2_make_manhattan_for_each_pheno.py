#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

# Load config
import os.path
import imp
my_dir = os.path.dirname(os.path.abspath(__file__))
conf = imp.load_source('conf', os.path.join(my_dir, '../config.config'))

# Activate virtualenv
activate_this = os.path.join(conf.virtualenv_dir, 'bin/activate_this.py')
execfile(activate_this, dict(__file__=activate_this))

import sys
sys.path.insert(0, os.path.join(my_dir, '..'))
from utils import round_sig, mkdir_p

import glob
import re
import os
import json
import math
import datetime
import multiprocessing
import csv
import collections
import errno


BIN_LENGTH = int(3e6)
NEGLOG10_PVAL_BIN_SIZE = 0.05 # Use 0.05, 0.1, 0.15, etc
NEGLOG10_PVAL_BIN_DIGITS = 2 # Then round to this many digits
BIN_THRESHOLD = 1e-4 # pvals less than this threshold don't get binned.


Variant = collections.namedtuple('Variant', ['chrom', 'pos', 'ref', 'alt', 'pval', 'maf', 'nearest_genes', 'rsids'])
def get_variants(f):
    for variant_row in csv.DictReader(f, delimiter='\t'):
        chrom = variant_row['chr']
        pos = int(variant_row['pos'])
        ref = variant_row['ref']
        alt = variant_row['alt']
        nearest_genes = variant_row['nearest_genes']
        rsids = variant_row['rsids']
        maf = float(variant_row['maf'])
        if maf < .01:
            continue
        try:
            pval = float(variant_row['pval'])
        except ValueError:
            continue
        yield Variant(chrom=chrom, pos=pos, ref=ref, alt=alt, pval=pval, maf=maf, nearest_genes=nearest_genes, rsids=rsids)

def rounded_neglog10(pval):
    return round(-math.log10(pval) // NEGLOG10_PVAL_BIN_SIZE * NEGLOG10_PVAL_BIN_SIZE, NEGLOG10_PVAL_BIN_DIGITS)

def get_pvals_and_pval_extents(pvals):
    # expects that NEGLOG10_PVAL_BIN_SIZE is the distance between adjacent bins.
    pvals = sorted(pvals)
    extents = [[pvals[0], pvals[0]]]
    for p in pvals:
        if extents[-1][1] + NEGLOG10_PVAL_BIN_SIZE * 1.1 > p:
            extents[-1][1] = p
        else:
            extents.append([p,p])
    rv_pvals, rv_pval_extents = [], []
    for (start, end) in extents:
        if start == end:
            rv_pvals.append(start)
        else:
            rv_pval_extents.append([start,end])
    return (rv_pvals, rv_pval_extents)

def bin_variants(variants):
    bins = []
    unbinned_variants = []

    prev_chrom, prev_pos = -1, -1
    for variant in variants:
        assert variant.pos >= prev_pos or int(variant.chrom) > int(prev_chrom), (variant, prev_chrom, prev_pos)
        prev_chrom, prev_pos = variant.chrom, variant.pos
        if variant.pval < BIN_THRESHOLD:
            unbinned_variants.append({
                'chrom': variant.chrom,
                'pos': variant.pos,
                'ref': variant.ref,
                'alt': variant.alt,
                'maf': round_sig(variant.maf, 3),
                'pval': round_sig(variant.pval, 2),
                'nearest_genes': variant.nearest_genes,
                'rsids': variant.rsids,
            })

        else:
            if len(bins) == 0 or variant.chrom != bins[-1]['chrom']:
                # We need a new bin, starting with this variant.
                bins.append({
                    'chrom': variant.chrom,
                    'startpos': variant.pos,
                    'neglog10_pvals': set(),
                })
            elif variant.pos > bins[-1]['startpos'] + BIN_LENGTH:
                # We need a new bin following the last one.
                bins.append({
                    'chrom': variant.chrom,
                    'startpos': bins[-1]['startpos'] + BIN_LENGTH,
                    'neglog10_pvals': set(),
                })
            bins[-1]['neglog10_pvals'].add(rounded_neglog10(variant.pval))

    bins = [b for b in bins if len(b['neglog10_pvals']) != 0]
    for b in bins:
        b['neglog10_pvals'], b['neglog10_pval_extents'] = get_pvals_and_pval_extents(b['neglog10_pvals'])
        b['pos'] = int(b['startpos'] + BIN_LENGTH/2)
        del b['startpos']

    return bins, unbinned_variants


def label_genes_to_show(variants):
    variants_by_gene = {}
    for v in variants:
        if v['pval'] < 1e-5: # This is my arbitrary cutoff.
            for gene in v['nearest_genes'].split(','):
                variants_by_gene.setdefault(gene, []).append(v)

    for variants_in_gene in variants_by_gene.values():
        best_variant = min(variants_in_gene, key=lambda v: v['pval'])
        best_variant['show_gene'] = True


def make_json_file(args):
    src_filename, dest_filename, tmp_filename = args['src'], args['dest'], args['tmp']
    assert not os.path.exists(dest_filename), dest_filename

    with open(src_filename) as f:
        variants = get_variants(f)
        variant_bins, unbinned_variants = bin_variants(variants)

    label_genes_to_show(unbinned_variants)

    rv = {
        'variant_bins': variant_bins,
        'unbinned_variants': unbinned_variants,
    }

    # Avoid getting killed while writing dest_filename, to stay idempotent despite me frequently killing the program
    with open(tmp_filename, 'w') as f:
        json.dump(rv, f, sort_keys=True, indent=0)
        os.fsync(f.fileno()) # Recommended by <http://stackoverflow.com/a/2333979/1166306>
    print('{}\t{} -> {}'.format(datetime.datetime.now(), src_filename, dest_filename))
    os.rename(tmp_filename, dest_filename)


def get_conversions_to_do():
    src_filenames = glob.glob(conf.data_dir + '/augmented_pheno/*')
    print('number of source files:', len(src_filenames))
    for src_filename in src_filenames:
        pheno_code = os.path.basename(src_filename)
        assert not 'tmp' in pheno_code
        dest_filename = '{}/manhattan/{}.json'.format(conf.data_dir, pheno_code)
        tmp_filename = '{}/tmp/manhattan-{}.json'.format(conf.data_dir, pheno_code)
        if not os.path.exists(dest_filename):
            yield {'src':src_filename, 'dest':dest_filename, 'tmp':tmp_filename}

mkdir_p(conf.data_dir + '/manhattan')
mkdir_p(conf.data_dir + '/tmp')

conversions_to_do = list(get_conversions_to_do())
print('number of files to convert:', len(conversions_to_do))
num_processes = multiprocessing.cpu_count() * 3//4 + 1
p = multiprocessing.Pool(num_processes)
p.map_async(make_json_file, conversions_to_do).get(1e8) # Makes KeyboardInterrupt work
#print(conversions_to_do[0]); make_json_file(conversions_to_do[0]) # debugging
