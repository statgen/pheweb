#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

import glob
import re
import os.path
import os
import json
import gzip
import math

BIN_LENGTH = 1e7
NEGLOG10_PVAL_BIN_DIGITS = 1 # Use 0.1, 0.2, etc
BIN_THRESHOLD = 5e-8 # pvals less than this threshold don't get binned.


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
    binned_variants = []
    unbinned_variants = []

    cur_bin = None
    def empty_cur_bin():
        for neglog10_pval in cur_bin['neglog10_pvals']:
            binned_variants.append({
                'chrom': cur_bin['chrom'],
                'pos': cur_bin['startpos'] + BIN_LENGTH/2,
                'neglog10_pval': neglog10_pval,
            })

    for variant in variants:
        chrom, pos, ref, alt, maf, pval = parse_variant_tuple(variant)
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
            if cur_bin is None or chrom != cur_bin['chrom'] or pos > cur_bin['startpos'] + BIN_LENGTH:
                if cur_bin is not None:
                    empty_cur_bin()
                cur_bin = {
                    'chrom': chrom,
                    'startpos': pos,
                    'neglog10_pvals': set(),
                }
            cur_bin['neglog10_pvals'].add(round(-math.log10(pval), NEGLOG10_PVAL_BIN_DIGITS))

    empty_cur_bin()

    return binned_variants, unbinned_variants


files_to_convert = glob.glob('/var/pheweb_data/gwas-one-pheno/*.vcf.gz')
for filename in files_to_convert:

    basename = os.path.basename(filename)
    dest_filename = '/var/pheweb_data/gwas-json-binned/{}.json'.format(basename.replace('.vcf.gz', ''))
    if os.path.exists(dest_filename):
        continue
    print('{} -> {}'.format(filename, dest_filename))

    with gzip.open(filename) as f:
        header = f.readline().rstrip('\n').split('\t')
        assert len(header) == 6, header
        assert header[:4] == ['#CHROM', 'BEG', 'MARKER_ID', 'MAF']
        assert re.match(r'[0-9]+(?:\.[0-9]+)?\.P', header[4])
        assert re.match(r'[0-9]+(?:\.[0-9]+)?\.B', header[5])

        variants = (line.rstrip('\n').split('\t') for line in f)
        binned_variants, unbinned_variants = bin_variants(variants)

    rv = {
        'binned_variants': binned_variants,
        'unbinned_variants': unbinned_variants,
    }

    with open(dest_filename, 'w') as f:
        json.dump(rv, f, sort_keys=True, indent=0)
