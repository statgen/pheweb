
from .. import utils
conf = utils.conf

from ..file_utils import write_json, VariantFileWriter

import json
import csv
import os.path

LOCI_SPREAD_FROM_BEST_HIT = int(500e3)
LOCI_SPREAD_FROM_BEST_HIT_WITHIN_PHENOTYPE = int(1e6)
PVAL_CUTOFF = 1e-6

def get_hits():
    phenos = utils.get_phenolist()

    hits_by_chrom = dict()
    for pheno in phenos:
        fname = os.path.join(conf.data_dir, 'manhattan/{}.json'.format(pheno['phenocode']))
        with open(fname) as f:
            variants = json.load(f)['unbinned_variants']

        for v in variants:
            if v['pval'] <= PVAL_CUTOFF:
                v['phenocode'] = pheno['phenocode']
                try: v['phenostring'] = pheno['phenostring']
                except KeyError: pass
                v['nearest_genes'] = sorted(v['nearest_genes'].split(','))
                hits_by_chrom.setdefault(v['chrom'], []).append(v)

    for hits in hits_by_chrom.values():
        while hits:
            best_hit = min(hits, key=lambda hit: hit['pval'])
            remaining_hits = []
            for h in hits:
                if h is best_hit: continue
                if h['phenocode'] == best_hit['phenocode']:
                    if abs(h['pos'] - best_hit['pos']) >= LOCI_SPREAD_FROM_BEST_HIT_WITHIN_PHENOTYPE:
                        remaining_hits.append(h)
                elif abs(h['pos'] - best_hit['pos']) >= LOCI_SPREAD_FROM_BEST_HIT:
                    remaining_hits.append(h)
            hits = remaining_hits
            yield best_hit

def run(argv):
    out_fname_json = os.path.join(conf.data_dir, 'top_loci.json')
    out_fname_tsv = os.path.join(conf.data_dir, 'top_loci.tsv')

    if argv and argv[0] == '-h':
        formatted_pval_cutoff = '{:0.0e}'.format(PVAL_CUTOFF).replace('e-0', 'e-')
        print('''
Make lists of top loci for this PheWeb in {} and {}.

To count as a top loci, a variant must:
- have a p-value < {}
- have the smallest p-value within {:,} bases
- have the smallest p-value within {:,} bases within its phenotype

Each loci will include the phenotype that has the smallest p-value at that location.
Even if this loci also contains significant hits for other phenotypes, they won't be
shown.  If you want all hits, use `pheweb top-hits`.
'''.format(out_fname_json,
           out_fname_tsv,
           formatted_pval_cutoff,
           LOCI_SPREAD_FROM_BEST_HIT,
           LOCI_SPREAD_FROM_BEST_HIT_WITHIN_PHENOTYPE,
))
        exit(0)

    hits = sorted(get_hits(), key=lambda hit: hit['pval'])
    write_json(filename=out_fname_json, data=hits, sort_keys=True)
    print("wrote {} hits to {}".format(len(hits), out_fname_json))

    for h in hits: h['nearest_genes'] = ','.join(h['nearest_genes'])
    with VariantFileWriter(out_fname_tsv, allow_extra_fields=True) as writer:
        writer.write_all(hits)
    print("wrote {} hits to {}".format(len(hits), out_fname_tsv))
