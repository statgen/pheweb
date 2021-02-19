
from ..utils import get_phenolist
from .. import conf
from ..file_utils import write_json, write_heterogenous_variantfile, get_filepath, get_pheno_filepath

import json
from pathlib import Path
from typing import Dict,Any,List,Iterator

# TODO: It'd be great if each peak also included a list of all the associations that it is masking, so that on-click we could display a variants-under-this-peak table.
# TODO: Somewhere have a user-extendable whitelist of info that should be copied about each pheno.  Copy all of that stuff.


def get_hits(pheno:Dict[str,Any]) -> Iterator[Dict[str,Any]]:
    with open(get_pheno_filepath('manhattan', pheno['phenocode'])) as f:
        variants = json.load(f)['unbinned_variants']

    for v in variants:
        if v['pval'] <= conf.get_top_hits_pval_cutoff() and 'peak' in v:
            v['phenocode'] = pheno['phenocode']
            for k in ['phenostring', 'category']:
                if k in pheno:
                    v[k] = pheno[k]
            yield v

def get_all_hits() -> List[Dict[str,Any]]:
    return sorted((hit for pheno in get_phenolist() for hit in get_hits(pheno)), key=lambda hit:hit['pval'])

def stringify_assocs(assocs:List[Dict[str,Any]]) -> None:
    for a in assocs:
        if isinstance(a.get('nearest_genes'), list):
            a['nearest_genes'] = ','.join(a['nearest_genes'])

def should_run() -> bool:
    output_filepaths = [Path(get_filepath(name, must_exist=False)) for name in ['top-hits', 'top-hits-1k', 'top-hits-tsv']]
    if not all(fp.exists() for fp in output_filepaths):
        return True
    oldest_output_mtime = min(fp.stat().st_mtime for fp in output_filepaths)
    input_filepaths = [Path(get_pheno_filepath('manhattan', pheno['phenocode'])) for pheno in get_phenolist()]
    newest_input_mtime = max(fp.stat().st_mtime for fp in input_filepaths)
    if newest_input_mtime > oldest_output_mtime:
        return True
    return False

def run(argv:List[str]) -> None:
    out_filepath_json = get_filepath('top-hits', must_exist=False)
    out_filepath_1k_json = get_filepath('top-hits-1k', must_exist=False)
    out_filepath_tsv = get_filepath('top-hits-tsv', must_exist=False)

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
           '{:0.0e}'.format(min(conf.get_top_hits_pval_cutoff(), conf.get_manhattan_peak_pval_threshold())).replace('e-0', 'e-'),
           conf.get_manhattan_num_unbinned(),
           conf.get_within_pheno_mask_around_peak(),
))
        exit(1)

    if not should_run():
        print('Already up-to-date!')
        return

    hits = get_all_hits()

    write_json(filepath=out_filepath_json, data=hits, sort_keys=True)
    print("wrote {} hits to {}".format(len(hits), out_filepath_json))

    write_json(filepath=out_filepath_1k_json, data=hits[:1000], sort_keys=True)
    print("wrote {} hits to {}".format(len(hits[:1000]), out_filepath_1k_json))

    if hits:  # If there are no hits, we can't write a proper tsv
        stringify_assocs(hits)
        write_heterogenous_variantfile(out_filepath_tsv, hits, use_gzip=False)
        print("wrote {} hits to {}".format(len(hits), out_filepath_tsv))
