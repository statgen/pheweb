#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

import gzip
import glob
import heapq
import re
import os.path
import json

def parse_marker_id(marker_id):
    chr1, pos1, ref, alt, chr2, pos2 = re.match(r'([^:]+):([0-9]+)_([-ATCG]+)/([-ATCG]+)_([^:]+):([0-9]+)', marker_id).groups()
    assert chr1 == chr2
    assert pos1 == pos2
    return chr1, int(pos1), ref, alt

files_to_convert = glob.glob('/var/pheweb_data/gwas-single-pheno/*.vcf.gz')
for filename in files_to_convert:
    basename = os.path.basename(filename)
    dest_filename = '/var/pheweb_data/gwas-json/{}.json'.format(basename.rstrip('.vcf.gz'))
    if os.path.exists(dest_filename):
        continue
    print('{} -> {}'.format(filename, dest_filename))

    with gzip.open(filename) as f:
        variants = (line.rstrip('\n').split('\t') for line in f)
        variants = ((v[0], int(v[1]), v[2], float(v[3]), float(v[4]), float(v[5])) for v in variants) # chrom, pos, marker_id, maf, pval, beta
        top_variants = heapq.nsmallest(2000, variants, key=lambda v:v[4])

    rv = []
    for variant in top_variants:
        chrom, pos, ref, alt = parse_marker_id(variant[2])
        assert chrom == variant[0]
        assert pos == variant[1]

        rv.append({
            'chrom': chrom,
            'pos': pos,
            'ref': ref,
            'alt': alt,
            'maf': variant[3],
            'pval': variant[4],
            # TODO: include beta
        })

    with open(dest_filename, 'w') as f:
        json.dump(rv, f, sort_keys=True, indent=0)
