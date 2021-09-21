#!/usr/bin/env python3

import argparse
import json
from os import sep
import pandas as pd
import subprocess
import shlex

def run():

    parser = argparse.ArgumentParser(description='Create the custom json required by pheweb import')
    parser.add_argument('in_mapping_file', action='store', type=str, help='A tab-delimited text file with phenotype mapping information between studies')
    parser.add_argument('--out_json', action='store', type=str, default='pheweb_import.custom.json', help='Output json name. Default: "pheweb_import.custom.json"')
    parser.add_argument('--bucket', action='store', type=str, help='GCS bucket path')
    parser.add_argument('--sep', action='store', type=str, default='\t', help='in_mapping_file field separator. Default: "\\t"')
    parser.add_argument('--study_prefixes', action='store', type=str, default='fg,ukbb,estbb', help='Study identifiers in column names as prefixes. Separate multiple identifiers by comma. Default: "fg,ukbb,estbb"')
    parser.add_argument('--phenotype_col', action='store', type=str, default='\t', help='Phenotype column in in_mapping_file. Default: "phenotype"')
    parser.add_argument('--link_col', action='store', type=str, default='\t', help='Sumstat link column in in_mapping_file. Default: "link"')

    args = parser.parse_args()

    # Generate lists of required columns from input arguments
    REQUIRED_COLS = ['name', 'category', args.phenotype_col, args.link_col]
    studies = args.study_prefixes.strip().split(',')
    n_cases_cols = [s + '_n_cases' for s in studies]
    n_controls_cols = [s + '_n_controls' for s in studies]
    REQUIRED_COLS.extend(n_cases_cols)
    REQUIRED_COLS.extend(n_controls_cols)

    # Check mapping is ok and filter
    print('Checking mapping...')
    mapping = pd.read_csv(args.in_mapping_file, sep=args.sep)
    missing_cols = [col for col in REQUIRED_COLS if col not in mapping.columns]
    if len(missing_cols) > 0:
        raise Exception('Missing required columns: ' + ', '.join(missing_cols))
    mapping.dropna(axis=0, how='any', inplace=True)
    mapping['n_cases'] = mapping[n_cases_cols].sum(axis=1)
    mapping['n_controls'] = mapping[n_controls_cols].sum(axis=1)

    # Replace gs prefix with cromwell_root for cromwell run
    mapping[args.link_col] = mapping[args.link_col].replace('^gs:/', '/cromwell_root', regex=True)

    # Generate json configs for meta-analysis
    print('Generating custom json...')
    custom_json_list = [{'phenostring':name,'num_cases':cases,'num_controls':controls,'uk_file':link,'name':pheno,'description':name,'category':category} for (name,category,pheno,cases,controls,link) in zip(mapping['name'],mapping['category'],mapping[args.phenotype_col],mapping['n_cases'],mapping['n_controls'],mapping[args.link_col])]
    with open(args.out_json, 'w') as out_file:
        json.dump(custom_json_list, out_file, indent=4)

    if args.bucket is not None:
        print(f'Transferring custom json to bucket {args.bucket} ...')
        cmd = f'gsutil cp {args.out_json} {args.bucket}'
        subprocess.run(shlex.split(cmd))
    
    print('Done.')


if __name__ == '__main__':
    run()
