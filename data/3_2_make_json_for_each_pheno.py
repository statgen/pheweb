#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

import glob
import heapq
import re
import os.path
import os
import json
import subprocess

def parse_marker_id(marker_id):
    chr1, pos1, ref, alt, chr2, pos2 = re.match(r'([^:]+):([0-9]+)_([-ATCG]+)/([-ATCG]+)_([^:]+):([0-9]+)', marker_id).groups()
    assert chr1 == chr2
    assert pos1 == pos2
    return chr1, int(pos1), ref, alt

tmp_file = '/var/pheweb_data/tmp_3_2.vcf'

files_to_convert = glob.glob('/var/pheweb_data/gwas-one-pheno/*.vcf.gz')
for filename in files_to_convert:

    basename = os.path.basename(filename)
    dest_filename = '/var/pheweb_data/gwas-json/{}.json'.format(basename.rstrip('.vcf.gz'))
    if os.path.exists(dest_filename):
        continue
    print('{} -> {}'.format(filename, dest_filename))

    # script = r'''/net/mario/cluster/bin/pigz -dc '{}' | perl -nale 'print if $F[4] < 0.001' > '{}' '''.format(filename, tmp_file)
    script = '''/net/mario/cluster/bin/pigz -dc '{}' |'''.format(filename) + \
             r'''grep -Pv '^([^\t]*\t){4}(1\t|0\.0{0,2}[1-9])' > ''' + \
             ''' '{}' '''.format(tmp_file)
    subprocess.call(script, shell=True)

    with open(tmp_file) as f:
        header = f.readline().rstrip('\n').split('\t')
        assert len(header) == 6
        assert header[:4] == ['#CHROM', 'BEG', 'MARKER_ID', 'MAF']
        assert re.match(r'[0-9]+(?:\.[0-9]+)?\.P', header[4])
        assert re.match(r'[0-9]+(?:\.[0-9]+)?\.B', header[5])

        variants = (line.rstrip('\n').split('\t') for line in f)
        top_variants = heapq.nsmallest(2000, variants, key=lambda v:float(v[4]))

    os.remove(tmp_file)

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
