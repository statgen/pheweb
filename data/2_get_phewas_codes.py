#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

import csv
import json

from get_colnumbers import get_phenos

good_phenos = get_phenos()

for phewas_code in good_phenos:
    good_phenos[phewas_code]['icd9s'] = []

pheno_and_icd9_filename = '/net/dumbo/home/larsf/PheWAS/PheWAS_code_translation_v1_2.txt'
with open(pheno_and_icd9_filename) as f:
    for icd9 in csv.DictReader(f, delimiter='\t'):

        pheno = good_phenos.get(icd9['phewas_code'], None)
        if pheno is not None:
            pheno['icd9s'].append({
                'icd9_code': icd9['icd9'],
                'icd9_string': icd9['icd9_string'],
            })

            if 'phewas_string' not in pheno:
                pheno['phewas_string'] = icd9['phewas_string']
            else:
                assert pheno['phewas_string'] == icd9['phewas_string']

            if 'category_string' not in pheno:
                pheno['category_string'] = icd9['category_string']
            else:
                assert pheno['category_string'] == icd9['category_string']

for phewas_code in good_phenos:
    assert len(good_phenos[phewas_code]['icd9s']) > 0

with open('phenos.json', 'w') as f:
    json.dump(good_phenos, f, sort_keys=True, indent=0)
