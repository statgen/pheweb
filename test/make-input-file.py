#!/usr/bin/env python3

'''
This script is for getting more test data.
In theory I could just make random variants from the reference, but I don't have an `hg19.fa` on hand.
'''

import csv
import requests
import random
import re

def format_float(x):
    rv = '{:.0e}'.format(x).replace('e-0', 'e-').replace('e+00', '')
    if re.match(r'^[0-9]e-1$', rv): return '.{}'.format(rv[0])
    if re.match(r'^[0-9]e-2$', rv): return '.0{}'.format(rv[0])
    return rv

j = requests.get('http://pheweb.sph.umich.edu:5001/api/manhattan/pheno/Blasts.json').json()
f = open('input_files/snowstorm.txt', 'w')
writer = csv.DictWriter(f, fieldnames='ref alt beg chrom maf pval'.split(), delimiter='\t', lineterminator='\n')
writer.writeheader()
for i, v in enumerate(j['unbinned_variants']):
    if v['maf'] > 0.04:
        writer.writerow(dict(
            chrom=v['chrom'],
            beg=v['pos'],
            ref=v['ref'],
            alt=v['alt'],
            maf=format_float(random.random()/2),
            pval=format_float(10 ** (-20*random.random())) if random.random() > 0.0001 else 0,
        ))
