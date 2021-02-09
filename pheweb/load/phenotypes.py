
from ..utils import get_phenolist
from ..file_utils import write_json, get_filepath, get_pheno_filepath, write_heterogenous_variantfile

import json
from typing import Iterator,Dict,Any,List

def get_phenotypes_including_top_variants() -> Iterator[Dict[str,Any]]:
    for pheno in get_phenolist():
        with open(get_pheno_filepath('manhattan', pheno['phenocode'])) as f:
            variants = json.load(f)['unbinned_variants']
        top_variant = min(variants, key=lambda v: v['pval'])
        num_peaks = sum(variant.get('peak',False) for variant in variants)
        ret = {
            'phenocode': pheno['phenocode'],
            'pval': top_variant['pval'],
            'nearest_genes': top_variant['nearest_genes'],
            'chrom': top_variant['chrom'],
            'pos': top_variant['pos'],
            'ref': top_variant['ref'],
            'alt': top_variant['alt'],
            'rsids': top_variant['rsids'],
            'num_peaks': num_peaks,
        }
        if 'category' in pheno: ret['category'] = pheno['category']
        if 'phenostring' in pheno: ret['phenostring'] = pheno['phenostring']
        if isinstance(ret['nearest_genes'], list): ret['nearest_genes'] = ','.join(ret['nearest_genes'])
        yield ret

def run(argv:List[str]) -> None:
    if '-h' in argv or '--help' in argv:
        print('Make a file summarizing information about each phenotype (for use in the phenotypes table)')
        exit(1)

    data = sorted(get_phenotypes_including_top_variants(), key=lambda p: p['pval'])

    out_filepath = get_filepath('phenotypes_summary', must_exist=False)
    write_json(filepath=out_filepath, data=data)
    print("wrote {} phenotypes to {}".format(len(data), out_filepath))

    out_filepath_tsv = get_filepath('phenotypes_summary_tsv', must_exist=False)
    write_heterogenous_variantfile(out_filepath_tsv, data, use_gzip=False)
    print("wrote {} phenotypes to {}".format(len(data), out_filepath_tsv))
