#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

import gzip
import collections
import csv

phewas_codes_filename = '/net/fantasia/home/schellen/PheWAS/epacts_multi/gwas_17March2016/plots/case_control_counts.txt'
epacts_results_filename = '/var/pheweb_data/phewas_maf_gte_1e-2.vcf.gz'


phenos = collections.OrderedDict()
bad_phenos = {}
with open(phewas_codes_filename) as f:
    for pheno in csv.DictReader(f, delimiter='\t'):
        if int(pheno['case']) >= 20:
            phenos[pheno['phewasCode']] = dict(num_controls=int(pheno['control']), num_cases=int(pheno['case']))
        else:
            bad_phenos[pheno['phewasCode']] = dict(num_controls=int(pheno['control']), num_cases=int(pheno['case']))
assert 1400 <= len(phenos) <= 1500
assert 200 <= len(bad_phenos) <= 500

good_colnames = '#CHROM BEG MARKER_ID MAF'.split()
for pheno in phenos:
    good_colnames.append('{}.P'.format(pheno))
    good_colnames.append('{}.B'.format(pheno))
assert 1400*2 < len(good_colnames) < 1500*2

with gzip.open(epacts_results_filename) as f:

    header = f.readline().rstrip('\n').split('\t')
    good_colnums = [1 + header.index(colname) for colname in good_colnames]
    good_colnums = list(sorted(good_colnums))
    assert 1400*2 < len(good_colnums) < 1500*2
    print(','.join(map(str, good_colnums)))

    # Check that columns are numeric or NA
    first_line = f.readline().rstrip('\n').split('\t')
    for colname, colnum in zip(good_colnames, good_colnums):
        if colname == 'MARKER_ID':
            continue
        else:
            data = first_line[colnum-1]
            if colname in '#CHROM BEG MAF'.split():
                assert float(data)
            elif colname.endswith('.P'):
                assert data == 'NA' or 0 <= float(data) <= 1
            else:
                assert colname.endswith('.B')
                assert data == 'NA' or float(data)

# Check that pairing worked well.
for i, colnum in enumerate(good_colnums):
    if colnum <= 9:
        continue
    elif colnum % 2 == 0:
        assert colnum+1 in good_colnums
        assert good_colnames[i].rstrip('.P') == good_colnames[i+1].rstrip('.B')
    else:
        assert colnum-1 in good_colnums
        assert good_colnames[i-1].rstrip('.P') == good_colnames[i].rstrip('.B')
