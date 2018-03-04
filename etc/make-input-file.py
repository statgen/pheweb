#!/usr/bin/env python3

'''
This script is for getting more test data.
In theory I could just make random variants from the reference, but I don't have an `hg19.fa` on hand.
'''

import csv
import requests
import random
import re
import itertools

def format_float(x):
    if x >= 0.01: return '{:.3}'.format(x)
    rv = '{:.0e}'.format(x).replace('e-0', 'e-').replace('e+00', '')
    if re.match(r'^[0-9]e-1$', rv): return '.{}'.format(rv[0])
    if re.match(r'^[0-9]e-2$', rv): return '.0{}'.format(rv[0])
    return rv

class TSVWriter:
    def __init__(self, filepath):
        self.filepath = filepath
    def __enter__(self):
        self.f = open(self.filepath, 'w')
        return self
    def writerow(self, dct):
        if not hasattr(self, 'writer'):
            self.writer = csv.DictWriter(self.f, fieldnames=list(dct.keys()), delimiter='\t', lineterminator='\n')
            self.writer.writeheader()
        self.writer.writerow(dct)
    def __exit__(self, *args):
        self.f.close()

variants = requests.get('http://pheweb.sph.umich.edu/api/manhattan/pheno/601.json').json()['unbinned_variants']
variants.append(dict(chrom='1', pos=869334, ref='G', alt='A'))
chroms = [str(i) for i in range(1,22+1)] + ['X']
variants = sorted(variants, key=lambda v: (chroms.index(v['chrom']), v['pos']))

def make_pheno(pheno_name, use_maf, use_af, use_ac, use_ns):

    ns = random.randrange(100, int(1e5))
    num_chromosomes = ns*2

    with TSVWriter('input_files/assoc-files/{}.txt'.format(pheno_name)) as writer:

        for v in variants:
            if v['chrom'] == '1' and v['pos'] == 869334 or random.random() < 100 / len(variants):

                d = dict(
                    chrom=v['chrom'],
                    pos=v['pos'],
                    ref=v['ref'],
                    alt=v['alt'],
                    pval=format_float(random.random()),
                )
                ac = random.randrange(0,num_chromosomes+1) # allow MAF=0 b/c I'm sure somebody will.
                af = ac / num_chromosomes
                if use_maf: d['maf'] = format_float(min(af, 1-af))
                if use_af: d['af'] = format_float(af)
                if use_ac: d['ac'] = ac
                if use_ns: d['ns'] = ns

                writer.writerow(d)

for x in itertools.product(*[(True, False)]*4):
    args = dict(zip('maf af ac ns'.split(), x))
    name = 'has-fields-' + '-'.join(k for k in sorted(args) if args[k])
    make_pheno(name, *x)
