#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

import glob
import re
import os.path
import json
import gzip
import math
import datetime

BIN_LENGTH = 1e7
NEGLOG10_PVAL_BIN_DIGITS = 1 # Use 0.1, 0.2, etc
BIN_THRESHOLD = 1e-4 # pvals less than this threshold don't get binned.


def parse_marker_id(marker_id):
    chr1, pos1, ref, alt, chr2, pos2 = re.match(r'([^:]+):([0-9]+)_([-ATCG]+)/([-ATCG]+)_([^:]+):([0-9]+)', marker_id).groups()
    assert chr1 == chr2
    assert pos1 == pos2
    return chr1, int(pos1), ref, alt

def parse_variant_tuple(variant):
    chrom, pos, maf, pval, beta = variant[0], int(variant[1]), float(variant[3]), float(variant[4]), float(variant[5])
    chrom2, pos2, ref, alt = parse_marker_id(variant[2])
    assert chrom == chrom2
    assert pos == pos2
    return (chrom, pos, ref, alt, maf, pval)

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
                'maf': maf,
                'pval': pval,
            })

        else:
            if len(bins) == 0 or chrom != bins[-1]['chrom'] or pos > bins[-1]['startpos'] + BIN_LENGTH:
                bins.append({
                    'chrom': chrom,
                    'startpos': pos,
                    'neglog10_pvals': set(),
                })
            bins[-1]['neglog10_pvals'].add(round(-math.log10(pval), NEGLOG10_PVAL_BIN_DIGITS))

    for b in bins:
        b['neglog10_pvals'] = sorted(b['neglog10_pvals'])
        b['pos'] = b['startpos'] + BIN_LENGTH/2
        del b['startpos']

    return bins, unbinned_variants


files_to_convert = glob.glob('/var/pheweb_data/gwas-one-pheno/*.vcf.gz')
for filename in files_to_convert:

    basename = os.path.basename(filename)
    dest_filename = '/var/pheweb_data/gwas-json-binned/{}.json'.format(basename.replace('.vcf.gz', ''))
    if os.path.exists(dest_filename):
        continue
    print('{}\t{} -> {}'.format(datetime.datetime.now(), filename, dest_filename))

    with gzip.open(filename) as f:
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

    with open(dest_filename, 'w') as f:
        json.dump(rv, f, sort_keys=True, indent=0)
