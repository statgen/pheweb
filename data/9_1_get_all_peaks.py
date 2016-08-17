#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

# Load config
import os.path
import imp
my_dir = os.path.dirname(os.path.abspath(__file__))
conf = imp.load_source('conf', os.path.join(my_dir, '../config.config'))

# Activate virtualenv
activate_this = os.path.join(conf.virtualenv_dir, 'bin/activate_this.py')
execfile(activate_this, dict(__file__=activate_this))

utils = imp.load_source('utils', os.path.join(my_dir, '../utils.py'))

# DISTANCE_BETWEEN_HITS = int(1e6)
# PVAL_CUTOFF = 5e-8

DISTANCE_BETWEEN_HITS = int(5e5)
PVAL_CUTOFF = 5e-8

import glob
import json

with open(my_dir + '/phenos.json') as f:
    phenos = json.load(f)

#phenos = dict(list(phenos.items())[:10]) # debugging

hits_by_chrom = dict()
for pheno_code in phenos:
    with open(conf.data_dir + '/manhattan/{}.json'.format(pheno_code)) as f:
        j = json.load(f)
    for v in j['unbinned_variants']:
        if v['pval'] <= PVAL_CUTOFF:
            hits_by_chrom.setdefault(v['chrom'], []).append((v['pos'], v['pval'], v['nearest_genes'], pheno_code))

top_hits = []
for chrom, hits in hits_by_chrom.items():
    while hits:
        best_hit_pos, best_hit_pval, nearest_genes, pheno_code = min(hits, key=lambda hit: hit[1])
        top_hits.append((chrom, best_hit_pos, best_hit_pval, nearest_genes, pheno_code))
        hits = [hit for hit in hits if abs(hit[0] - best_hit_pos) > DISTANCE_BETWEEN_HITS]

with open('top-hits.tsv', 'w') as f:
    for top_hit in sorted(top_hits, key=(lambda hit: 1e12*int(hit[0]) + hit[1])):
        f.write('{}\t{}\t{}\t{}\t{}\t{pheno_string}\n'.format(*top_hit, pheno_string=phenos[top_hit[4]]['phewas_string']))
