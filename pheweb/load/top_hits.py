
from .. import utils
conf = utils.conf

import os
import json
import csv

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


def run(argv):
    out_fname_json = os.path.join(conf.data_dir, 'top_hits.json')
    out_fname_tsv = os.path.join(conf.data_dir, 'top_hits.tsv')

    if argv and argv[0] == '-h':
        formatted_pval_cutoff = '{:0.0e}'.format(PVAL_CUTOFF).replace('e-0', 'e-')
        print('''
Make lists of top hits for this PheWeb in {} and {}.

To count as a top hit, a variant must:
- have a p-value < {}
- have the smallest p-value within {:,} bases within its phenotype

Some loci may have hits for multiple phenotypes.  If you want a list of loci with
just the top phenotype for each, use `pheweb top-loci`.
'''.format(out_fname_json,
           out_fname_tsv,
           formatted_pval_cutoff,
           LOCI_SPREAD_FROM_BEST_HIT,
))
        exit(0)

    phenos = utils.get_phenolist()

    hits = []
    for pheno in phenos:
        hits.extend(get_hits(pheno))

    hits = sorted(hits, key=lambda hit: hit['pval'])
    with open(out_fname_json, 'w') as f:
        json.dump(hits, f, sort_keys=True, indent=0)
    print("wrote {} hits to {}".format(len(hits), out_fname_json))

    for h in hits: h['nearest_genes'] = ','.join(h['nearest_genes'])
    with open(out_fname_tsv, 'w') as f:
        fieldnames = 'chrom pos ref alt rsids maf pval'.split()
        fieldnames = fieldnames + list(set(hits[0].keys()) - set(fieldnames))
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter='\t')
        writer.writeheader()
        writer.writerows(hits)
    print("wrote {} hits to {}".format(len(hits), out_fname_tsv))
