
from ..utils import get_phenolist
from ..file_utils import write_json, VariantFileWriter, common_filepaths

import json

# TODO:
# - it'd be great if they also listed all the rsids and variants, so that on-click we could display a variants-in-this-loci table.
# - Somewhere have a user-extendable whitelist of info that should be copied about each pheno.  Copy all of that stuff.


PVAL_CUTOFF = 1e-6

def get_hits(pheno):
    with open(common_filepaths['manhattan'](pheno['phenocode'])) as f:
        variants = json.load(f)['unbinned_variants']

    for v in variants:
        if v['pval'] <= PVAL_CUTOFF and 'peak' in v:
            v['phenocode'] = pheno['phenocode']
            try: best_hit['phenostring'] = pheno['phenostring']
            except KeyError: pass
            yield v


def run(argv):
    out_filepath_json = common_filepaths['top-hits']
    out_filepath_1k_json = common_filepaths['top-hits-1k']
    out_filepath_tsv = common_filepaths['top-hits-tsv']

    if argv and argv[0] == '-h':
        formatted_pval_cutoff = '{:0.0e}'.format(PVAL_CUTOFF).replace('e-0', 'e-')
        print('''
Make lists of top hits for this PheWeb in {} and {}.

To count as a top hit, a variant must:
- have a p-value < {}
- have the smallest p-value within {:,} bases within its phenotype

Some loci may have hits for multiple phenotypes.  If you want a list of loci with
just the top phenotype for each, use `pheweb top-loci`.
'''.format(out_filepath_json,
           out_filepath_tsv,
           formatted_pval_cutoff,
           LOCI_SPREAD_FROM_BEST_HIT,
))
        exit(0)

    phenos = get_phenolist()

    hits = []
    for pheno in phenos:
        hits.extend(get_hits(pheno))

    hits = sorted(hits, key=lambda hit: hit['pval'])
    write_json(filepath=out_filepath_json, data=hits, sort_keys=True)
    print("wrote {} hits to {}".format(len(hits), out_filepath_json))

    write_json(filepath=out_filepath_1k_json, data=hits[:1000], sort_keys=True)
    print("wrote {} hits to {}".format(len(hits), out_filepath_1k_json))

    for h in hits: h['nearest_genes'] = ','.join(h['nearest_genes'])
    with VariantFileWriter(out_filepath_tsv, allow_extra_fields=True) as writer:
        writer.write_all(hits)
    print("wrote {} hits to {}".format(len(hits), out_filepath_tsv))
