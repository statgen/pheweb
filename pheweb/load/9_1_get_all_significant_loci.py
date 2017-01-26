#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

from .. import utils
conf = utils.conf

# DISTANCE_BETWEEN_HITS = int(1e6)
# PVAL_CUTOFF = 5e-8

DISTANCE_BETWEEN_HITS = int(5e5)
PVAL_CUTOFF = 5e-8

import glob
import json

phenos = utils.get_phenolist()

hits_by_chrom = dict()
for phenocode in phenos:
    with open(conf.data_dir + '/manhattan/{}.json'.format(phenocode)) as f:
        j = json.load(f)
    for v in j['unbinned_variants']:
        if v['pval'] <= PVAL_CUTOFF:
            hits_by_chrom.setdefault(v['chrom'], []).append((v['pos'], v['pval'], v['nearest_genes'], phenocode))

top_hits = []
for chrom, hits in hits_by_chrom.items():
    while hits:
        best_hit_pos, best_hit_pval, nearest_genes, phenocode = min(hits, key=lambda hit: hit[1])
        top_hits.append((chrom, best_hit_pos, best_hit_pval, nearest_genes, phenocode))
        hits = [hit for hit in hits if abs(hit[0] - best_hit_pos) > DISTANCE_BETWEEN_HITS]

with open('top-hits.tsv', 'w') as f:
    for top_hit in sorted(top_hits, key=(lambda hit: 1e12*int(hit[0]) + hit[1])):
        f.write('{}\t{}\t{}\t{}\t{}\t{phenostring}\n'.format(*top_hit, phenostring=phenos[top_hit[4]]['phenostring']))
