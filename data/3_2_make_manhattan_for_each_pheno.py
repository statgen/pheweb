#!/usr/bin/env python2

# TODO: copy MAX_NUM_UNBINNED from ENCORE
# TODO: combine with QQ

from __future__ import print_function, division, absolute_import

# Load config, utils, venv
import os.path
import imp
my_dir = os.path.dirname(os.path.abspath(__file__))
utils = imp.load_source('utils', os.path.join(my_dir, '../utils.py'))
conf = utils.conf
utils.activate_virtualenv()

import glob
import re
import os
import json
import math
import datetime
import multiprocessing
import csv
import collections
import itertools


BIN_LENGTH = int(3e6)
NEGLOG10_PVAL_BIN_SIZE = 0.05 # Use 0.05, 0.1, 0.15, etc
NEGLOG10_PVAL_BIN_DIGITS = 2 # Then round to this many digits
BIN_THRESHOLD = 1e-4 # pvals less than this threshold don't get binned.

# TODO: just switch to pandas.read_csv
def get_variants(f):
    reader = csv.DictReader(f, delimiter='\t')
    for v in reader:
        v['pos'] = int(v['pos'])
        v['maf'] = float(v['maf'])
        try:
            v['pval'] = float(v['pval'])
        except ValueError:
            v['pval'] = 1
        for key in ['beta', 'sebeta']:
            try:
                v[key] = float(v[key])
            except (ValueError, KeyError):
                continue
        yield v

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

    for variant in variants:
        if variant['pval'] < BIN_THRESHOLD:
            variant['maf'] = utils.round_sig(variant['maf'], 3)
            variant['pval'] = utils.round_sig(variant['pval'], 2)
            unbinned_variants.append(variant)

        else:
            if len(bins) == 0 or variant['chrom'] != bins[-1]['chrom']:
                # We need a new bin, starting with this variant.
                bins.append({
                    'chrom': variant['chrom'],
                    'startpos': variant['pos'],
                    'neglog10_pvals': set(),
                })
            elif variant['pos'] > bins[-1]['startpos'] + BIN_LENGTH:
                # We need a new bin following the last one.
                bins.append({
                    'chrom': variant['chrom'],
                    'startpos': bins[-1]['startpos'] + BIN_LENGTH,
                    'neglog10_pvals': set(),
                })
            bins[-1]['neglog10_pvals'].add(rounded_neglog10(variant['pval']))

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
    for src_filename in glob.glob(conf.data_dir + '/augmented_pheno/*'):
        phenocode = os.path.basename(src_filename)
        assert not 'tmp' in phenocode
        dest_filename = '{}/manhattan/{}.json'.format(conf.data_dir, phenocode)
        tmp_filename = '{}/tmp/manhattan-{}.json'.format(conf.data_dir, phenocode)
        if not os.path.exists(dest_filename) or os.stat(dest_filename).st_mtime < os.stat(src_filename).st_mtime:
            yield {'src':src_filename, 'dest':dest_filename, 'tmp':tmp_filename}

utils.mkdir_p(conf.data_dir + '/manhattan')
utils.mkdir_p(conf.data_dir + '/tmp')

conversions_to_do = list(get_conversions_to_do())
print('number of phenos to process:', len(conversions_to_do))
num_processes = multiprocessing.cpu_count() * 3//4 + 1
p = multiprocessing.Pool(num_processes)
p.map_async(make_json_file, conversions_to_do).get(1e8) # Makes KeyboardInterrupt work
#print(conversions_to_do[0]); make_json_file(conversions_to_do[0]) # debugging
