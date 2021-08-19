#!/usr/bin/env python3

import argparse
import json
import pandas as pd
import subprocess
import shlex

REQUIRED_COLS = ['name', 'category', 'fg_phenotype', 'ukbb_link', 'fg_n_cases', 'ukbb_n_cases', 'estbb_n_cases', 'fg_n_controls', 'ukbb_n_controls', 'estbb_n_controls']


def run():

    parser = argparse.ArgumentParser(description='Create the custom json required by pheweb import')
    parser.add_argument('in_mapping_file', action='store', type=str, help='A tab-delimited text file with phenotype mapping information between studies')
    parser.add_argument('--out_json', action='store', type=str, default='pheweb_import.custom.json', help='Output json name')
    parser.add_argument('--bucket', action='store', type=str, help='GCS bucket path')

    args = parser.parse_args()

    # Check mapping is ok and filter
    print('Checking mapping...')
    mapping = pd.read_csv(args.in_mapping_file, sep='\t')
    missing_cols = [col for col in REQUIRED_COLS if col not in mapping.columns]
    if len(missing_cols) > 0:
        raise Exception('Missing required columns: ' + ', '.join(missing_cols))
    mapping.dropna(axis=0, how='any', inplace=True)
    mapping['n_cases'] = mapping['fg_n_cases'] + mapping['ukbb_n_cases'] + mapping['estbb_n_cases']
    mapping['n_controls'] = mapping['fg_n_controls'] + mapping['ukbb_n_controls'] + mapping['estbb_n_controls']

    # Replace gs prefix with cromwell_root for cromwell run
    mapping['ukbb_link'] = mapping['ukbb_link'].replace('^gs:/', '/cromwell_root', regex=True)

    # Generate json configs for meta-analysis
    print('Generating custom json...')
    custom_json_list = [{'phenostring':name,'num_cases':cases,'num_controls':controls,'uk_file':link,'name':pheno,'description':name,'category':category} for (name,category,pheno,cases,controls,link) in zip(mapping['name'],mapping['category'],mapping['fg_phenotype'],mapping['n_cases'],mapping['n_controls'],mapping['ukbb_link'])]
    with open(args.out_json, 'w') as out_file:
        json.dump(custom_json_list, out_file, indent=4)

    if args.bucket is not None:
        print(f'Transferring custom json to bucket {args.bucket} ...')
        cmd = f'gsutil cp {args.out_json} {args.bucket}'
        subprocess.run(shlex.split(cmd))
    
    print('Done.')


if __name__ == '__main__':
    run()
