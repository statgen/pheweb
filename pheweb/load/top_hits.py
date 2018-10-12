
from ..utils import get_phenolist
from ..conf_utils import conf
from ..file_utils import write_json, write_heterogenous_variantfile, common_filepaths

import json

# TODO: It'd be great if each peak also included a list of all the associations that it is masking, so that on-click we could display a variants-under-this-peak table.
# TODO: Somewhere have a user-extendable whitelist of info that should be copied about each pheno.  Copy all of that stuff.


def get_hits(pheno):
    with open(common_filepaths['manhattan'](pheno['phenocode'])) as f:
        variants = json.load(f)['unbinned_variants']

    for v in variants:
        if v['pval'] <= conf.top_hits_pval_cutoff and 'peak' in v:
            v['phenocode'] = pheno['phenocode']
            try: v['phenostring'] = pheno['phenostring']
            except KeyError: pass
            yield v


def get_all_hits():
    phenos = get_phenolist()
    hits = []
    for pheno in phenos:
        hits.extend(get_hits(pheno))
    return sorted(hits, key=lambda hit: hit['pval'])


def stringify_assocs(assocs):
    for a in assocs:
        if isinstance(a.get('nearest_genes'), list):
            a['nearest_genes'] = ','.join(a['nearest_genes'])


def run(argv):
    out_filepath_json = common_filepaths['top-hits']
    out_filepath_1k_json = common_filepaths['top-hits-1k']
    out_filepath_tsv = common_filepaths['top-hits-tsv']

    if argv and argv[0] == '-h':
        print('''
Make lists of top hits for this PheWeb in {} and {}.

To count as a top hit, a variant must:
- have a p-value < {}
- be among the top {:,} associations in its phenotype
- have the smallest p-value within {:,} bases within its phenotype (well, not exactly, but pretty much)

Some loci may have hits for multiple phenotypes.  If you want a list of loci with
just the top phenotype for each, use `pheweb top-loci`.
'''.format(out_filepath_json,
           out_filepath_tsv,
           '{:0.0e}'.format(min(conf.top_hits_pval_cutoff, conf.manhattan_peak_pval_threshold)).replace('e-0', 'e-'),
           conf.manhattan_num_unbinned,
           conf.within_pheno_mask_around_peak,
))
        exit(1)

    hits = get_all_hits()

    write_json(filepath=out_filepath_json, data=hits, sort_keys=True)
    print("wrote {} hits to {}".format(len(hits), out_filepath_json))

    write_json(filepath=out_filepath_1k_json, data=hits[:1000], sort_keys=True)
    print("wrote {} hits to {}".format(len(hits[:1000]), out_filepath_1k_json))

    stringify_assocs(hits)

    write_heterogenous_variantfile(out_filepath_tsv, hits)
    print("wrote {} hits to {}".format(len(hits), out_filepath_tsv))
