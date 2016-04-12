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

files_to_convert = glob.glob('/var/pheweb_data/gwas-one-pheno/*.vcf.gz')
for filename in files_to_convert:
    basename = os.path.basename(filename)
    dest_filename = '/var/pheweb_data/gwas-json/{}.json'.format(basename.rstrip('.vcf.gz'))
    if os.path.exists(dest_filename):
        continue
    print('{} -> {}'.format(filename, dest_filename))

    with gzip.open(filename) as f:
        header = f.readline().rstrip('\n').split('\t')
        assert len(header) == 6
        assert header[:4] == ['#CHROM', 'BEG', 'MARKER_ID', 'MAF']
        assert re.match(r'[0-9]+(?:\.[0-9]+)?\.P', header[4])
        assert re.match(r'[0-9]+(?:\.[0-9]+)?\.B', header[5])

        variants = (line.rstrip('\n').split('\t') for line in f)
        top_variants = heapq.nsmallest(2000, variants, key=lambda v:float(v[4]))

    rv = []
    for variant in top_variants:
        chrom1, pos1, marker_id, maf, pval, beta = variant[0], int(variant[1]), variant[2], float(variant[3]), float(variant[4]), float(variant[5])
        chrom2, pos2, ref, alt = parse_marker_id(variant[2])
        assert chrom1 == chrom2
        assert pos1 == pos2

        rv.append({
            'chrom': chrom1,
            'pos': pos1,
            'ref': ref,
            'alt': alt,
            'maf': maf,
            'pval': pval,
            # TODO: include beta
        })

    with open(dest_filename, 'w') as f:
        json.dump(rv, f, sort_keys=True, indent=0)
