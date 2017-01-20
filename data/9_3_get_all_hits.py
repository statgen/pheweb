#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

# Load config, utils, venv
import os.path
import imp
my_dir = os.path.dirname(os.path.abspath(__file__))
utils = imp.load_source('utils', os.path.join(my_dir, '../utils.py'))
conf = utils.conf
utils.activate_virtualenv()

import json

# TODO:
# - it'd be great if they also listed all the rsids and variants, so that on-click we could display a variants-in-this-loci table.
# - Somewhere have a user-extendable whitelist of info that should be copied about each pheno.  Copy all of that stuff.


LOCI_SPREAD_FROM_BEST_HIT = int(500e3)
PVAL_CUTOFF = 1e-6

def get_hits(pheno):
    fname = os.path.join(conf.data_dir, 'manhattan/{}.json'.format(pheno['phenocode']))
    with open(fname) as f:
        variants = json.load(f)['unbinned_variants']

    hits_by_chrom = dict()
    for v in variants:
        if v['pval'] <= PVAL_CUTOFF:
            v['phenocode'] = pheno['phenocode']
            hits_by_chrom.setdefault(v['chrom'], []).append(v)

    for hits in hits_by_chrom.values():
        while hits:
            best_hit = min(hits, key=lambda hit: hit['pval'])
            best_hit['nearest_genes'] = sorted(best_hit['nearest_genes'].split(','))
            if 'show_gene' in best_hit:
                del best_hit['show_gene']
            remaining_hits = []
            for hit in hits:
                if hit is best_hit:
                    pass
                elif abs(hit['pos'] - best_hit['pos']) >= LOCI_SPREAD_FROM_BEST_HIT:
                    remaining_hits.append(hit)
            hits = remaining_hits
            try: best_hit['phenostring'] = pheno['phenostring']
            except KeyError: pass
            yield best_hit


if __name__ == '__main__':
    phenos = utils.get_phenolist()

    hits = []
    for pheno in phenos:
        hits.extend(get_hits(pheno))

    hits = sorted(hits, key=lambda hit: hit['pval'])
    out_fname = os.path.join(conf.data_dir, 'top_hits.json')
    with open(out_fname, 'w') as f:
        json.dump(hits, f, sort_keys=True, indent=0)
    print("wrote {} hits to {}".format(len(hits), out_fname))