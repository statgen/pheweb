
from ..utils import get_phenolist
from ..file_utils import write_json, VariantFileWriter, get_generated_path, common_filepaths

import json


LOCI_SPREAD_FROM_BEST_HIT = int(500e3)
LOCI_SPREAD_FROM_BEST_HIT_WITHIN_PHENOTYPE = int(1e6)
PVAL_CUTOFF = 1e-6

def get_hits():
    phenos = get_phenolist()

    hits_by_chrom = dict()
    for pheno in phenos:
        filepath = get_generated_path('manhattan', '{}.json'.format(pheno['phenocode']))
        with open(filepath) as f:
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
    out_filepath_json = common_filepaths['top-loci']
    out_filepath_tsv = common_filepaths['top-loci-tsv']

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
'''.format(out_filepath_json,
           out_filepath_tsv,
           formatted_pval_cutoff,
           LOCI_SPREAD_FROM_BEST_HIT,
           LOCI_SPREAD_FROM_BEST_HIT_WITHIN_PHENOTYPE,
))
        exit(0)

    hits = sorted(get_hits(), key=lambda hit: hit['pval'])
    write_json(filepath=out_filepath_json, data=hits, sort_keys=True)
    print("wrote {} hits to {}".format(len(hits), out_filepath_json))

    for h in hits: h['nearest_genes'] = ','.join(h['nearest_genes'])
    with VariantFileWriter(out_filepath_tsv, allow_extra_fields=True) as writer:
        writer.write_all(hits)
    print("wrote {} hits to {}".format(len(hits), out_filepath_tsv))
