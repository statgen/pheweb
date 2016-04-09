#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

import gzip
import collections
import csv

epacts_results_filename = '/var/pheweb_data/phewas_maf_gte_1e-2_ncases_gte_20.vcf.gz'

with gzip.open(epacts_results_filename) as f:

    header = f.readline().rstrip('\n').split('\t')
    assert len(header) == 2900

    phenos = {}
    for colnum, colname in enumerate(header, start=1):
        if colname in ['#CHROM', 'BEG', 'MARKER_ID', 'MAF']:
            continue
        else:
            if colname.endswith('.P'):
                phenos.setdefault(colname.rstrip('.P'), {})['colnum_pval'] = colnum
            elif colname.endswith('.B'):
                phenos.setdefault(colname.rstrip('.B'), {})['colnum_beta'] = colnum
            else: raise

for phewas_code, pheno in sorted(phenos.items()):
    columns = [1,2,3,4, pheno['colnum_pval'], pheno['colnum_beta']]
    print('{} {}'.format(phewas_code, ','.join(map(str, columns))))
