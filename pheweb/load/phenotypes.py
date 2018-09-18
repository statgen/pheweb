
from ..utils import get_phenolist
from ..file_utils import write_json, common_filepaths

import json

def get_phenotypes_including_top_variants():
    for pheno in get_phenolist():
        with open(common_filepaths['manhattan'](pheno['phenocode'])) as f:
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

def run(argv):
    if '-h' in argv or '--help' in argv:
        print('Make a file summarizing information about each phenotype (for use in the phenotypes table)')
        exit(1)

    out_filepath = common_filepaths['phenotypes_summary']
    data = list(get_phenotypes_including_top_variants())
    data.sort(key=lambda p: p['pval'])
    write_json(filepath=out_filepath, data=data)
    print("wrote {} phenotypes to {}".format(len(data), out_filepath))
