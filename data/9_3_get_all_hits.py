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

import json

# TODO:
# each hit should list ALL of the genes that it includes.
# it'd be great if they also listed all the rsids and variants, so that on-click we could display a variants-in-this-loci table.


LOCI_SPREAD_FROM_BEST_HIT = int(500e3)
PVAL_CUTOFF = 1e-6

def get_hits(pheno):
    fname = os.path.join(conf.data_dir, 'manhattan/{}.json'.format(pheno['pheno_code']))
    with open(fname) as f:
        variants = json.load(f)['unbinned_variants']

    hits_by_chrom = dict()
    for v in variants:
        if v['pval'] <= PVAL_CUTOFF:
            v['pheno_code'] = pheno['pheno_code']
            hits_by_chrom.setdefault(v['chrom'], []).append(v)

    for hits in hits_by_chrom.values():
        while hits:
            best_hit = min(hits, key=lambda hit: hit['pval'])
            best_hit['nearest_genes'] = set(best_hit['nearest_genes'].split(','))
            if 'show_gene' in best_hit:
                del best_hit['show_gene']
            remaining_hits = []
            for hit in hits:
                if hit is best_hit:
                    pass
                elif abs(hit['pos'] - best_hit['pos']) < LOCI_SPREAD_FROM_BEST_HIT:
                    best_hit['nearest_genes'].update(hit['nearest_genes'].split(','))
                else:
                    remaining_hits.append(hit)
            hits = remaining_hits
            best_hit['nearest_genes'] = list(best_hit['nearest_genes'])
            yield best_hit


if __name__ == '__main__':
    with open(os.path.join(my_dir, 'phenos.json')) as f:
        phenos = json.load(f)
    #phenos = dict(list(phenos.items())[:10]) # debugging

    hits = []
    for pheno in phenos:
        hits.extend(get_hits(pheno))

    hits = sorted(hits, key=lambda hit: hit['pval'])
    out_fname = os.path.join(conf.data_dir, 'top_hits.json')
    with open(out_fname, 'w') as f:
        json.dump(hits, f, sort_keys=True, indent=0)
    print("wrote {} hits to {}".format(len(hits), out_fname))