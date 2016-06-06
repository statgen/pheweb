#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

import os.path

# Activate virtualenv
activate_this = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../venv/bin/activate_this.py')
execfile(activate_this, dict(__file__=activate_this))

import gzip
import collections
import csv

execfile(os.path.join(my_dir, '../config.config'))



def get_phenos():
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
    return phenos

def get_colnames(phenos):
    good_colnames = '#CHROM BEG MARKER_ID MAF'.split()
    for pheno in phenos:
        good_colnames.append('{}.P'.format(pheno))
        good_colnames.append('{}.B'.format(pheno))
    assert 1400*2 < len(good_colnames) < 1500*2
    return good_colnames

if __name__ == '__main__':
    phenos = get_phenos()
    good_colnames = get_colnames(phenos)

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
