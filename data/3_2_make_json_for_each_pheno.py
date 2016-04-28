#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

import os.path

my_dir = os.path.dirname(os.path.abspath(__file__))
activate_this = os.path.join(my_dir, '../../venv/bin/activate_this.py')
execfile(activate_this, dict(__file__=activate_this))

import glob
import re
import os
import json
import gzip
import math
import datetime
import multiprocessing

import sys
sys.path.insert(0, os.path.join(my_dir, '..'))
from utils import round_sig, parse_marker_id

data_dir = '/var/pheweb_data/'
BIN_LENGTH = int(3e6)
NEGLOG10_PVAL_BIN_SIZE = 0.05 # Use 0.05, 0.1, 0.15, etc
NEGLOG10_PVAL_BIN_DIGITS = 2 # Then round to this many digits
BIN_THRESHOLD = 1e-4 # pvals less than this threshold don't get binned.


def parse_variant_tuple(variant):
    chrom, pos, maf, pval, beta = variant[0], int(variant[1]), float(variant[3]), float(variant[4]), float(variant[5])
    chrom2, pos2, ref, alt = parse_marker_id(variant[2])
    assert chrom == chrom2
    assert pos == pos2
    return (chrom, pos, ref, alt, maf, pval)

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
        chrom, pos, ref, alt, maf, pval = parse_variant_tuple(variant)
        assert pos >= prev_pos or int(chrom) > int(prev_chrom), (chrom, pos, prev_chrom, prev_pos)
        prev_chrom, prev_pos = chrom, pos
        if pval < BIN_THRESHOLD:
            unbinned_variants.append({
                'chrom': chrom,
                'pos': pos,
                'ref': ref,
                'alt': alt,
                'maf': round_sig(maf, 3),
                'pval': round_sig(pval, 2),
            })

        else:
            if len(bins) == 0 or chrom != bins[-1]['chrom']:
                # We need a new bin, starting with this variant.
                bins.append({
                    'chrom': chrom,
                    'startpos': pos,
                    'neglog10_pvals': set(),
                })
            elif pos > bins[-1]['startpos'] + BIN_LENGTH:
                # We need a new bin following the last one.
                bins.append({
                    'chrom': chrom,
                    'startpos': bins[-1]['startpos'] + BIN_LENGTH,
                    'neglog10_pvals': set(),
                })
            bins[-1]['neglog10_pvals'].add(rounded_neglog10(pval))

    bins = [b for b in bins if len(b['neglog10_pvals']) != 0]
    for b in bins:
        b['neglog10_pvals'], b['neglog10_pval_extents'] = get_pvals_and_pval_extents(b['neglog10_pvals'])
        b['pos'] = int(b['startpos'] + BIN_LENGTH/2)
        del b['startpos']

    return bins, unbinned_variants


def make_json_file(args):
    src_filename, dest_filename, tmp_filename = args
    assert not os.path.exists(dest_filename), dest_filename

    with gzip.open(src_filename) as f:
        header = f.readline().rstrip('\n').split('\t')
        assert len(header) == 6, header
        assert header[:4] == ['#CHROM', 'BEG', 'MARKER_ID', 'MAF']
        assert re.match(r'[0-9]+(?:\.[0-9]+)?\.P', header[4])
        assert re.match(r'[0-9]+(?:\.[0-9]+)?\.B', header[5])

        variants = (line.rstrip('\n').split('\t') for line in f)
        variant_bins, unbinned_variants = bin_variants(variants)

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


def get_files_to_convert():
    src_filenames = glob.glob(data_dir + '/gwas-one-pheno/*.vcf.gz')
    print('source files:', len(src_filenames))
    for src_filename in src_filenames:
        basename = os.path.basename(src_filename)
        dest_filename = '{}/gwas-json-binned/{}.json'.format(data_dir, basename.replace('.vcf.gz', ''))
        tmp_filename = '{}/gwas-json-binned/tmp-{}.json'.format(data_dir, basename.replace('.vcf.gz', ''))
        assert not os.path.exists(tmp_filename), tmp_filename # It's not really a problem, just surprising.
        if not os.path.exists(dest_filename):
            yield (src_filename, dest_filename, tmp_filename)

files_to_convert = list(get_files_to_convert())
print('files to convert:', len(files_to_convert))
p = multiprocessing.Pool(30)
#p.map(make_json_file, files_to_convert)
p.map_async(make_json_file, files_to_convert).get(1e8) # Makes KeyboardInterrupt work
