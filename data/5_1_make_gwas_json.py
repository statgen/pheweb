#!/usr/bin/env python2

'''
This script creates `gwas.json` from `gwas-trait-mapping.csv` and `$data_dir/gwas-catalog/gwas-catalog.tsv`.

Note: it uses pyliftover, which has something odd about zero-indexed positions.  It might not be perfect.  Also, you might need to delete a cached chain file in an unreadable directory.

Note: `MAPPED_TRAIT` can have multiple values, comma-separated

Note: AAAAAHHHHH the GWAS Catalog is a mess AAAAHHHHH
'''

from __future__ import print_function, division, absolute_import

# Load config
import os.path
import imp
my_dir = os.path.dirname(os.path.abspath(__file__))
conf = imp.load_source('conf', os.path.join(my_dir, '../config.config'))

# Activate virtualenv
activate_this = os.path.join(conf.virtualenv_dir, 'bin/activate_this.py')
execfile(activate_this, dict(__file__=activate_this))

import csv
import pyliftover
import json

mapping_filename = my_dir + '/gwas-trait-mapping.csv'
gwas_filename = conf.data_dir + '/gwas-catalog/gwas-catalog.tsv'
out_filename = conf.data_dir + '/gwas-catalog/gwas.json'


lo = pyliftover.LiftOver('hg38', 'hg19')
def grch38_to_hg19(chrom, pos):
    chrom = str(chrom)
    if not chrom.startswith('chr'):
        chrom = 'chr' + chrom
    pos = int(pos)
    matches = lo.convert_coordinate(chrom, pos)
    if matches is None or len(matches) == 0:
        raise ValueError('failed to convert to hg19: {}:{}'.format(chrom,pos))
    chrom, pos = matches[0][:2]
    if chrom.startswith('chr'):
        chrom = chrom[3:]
    return (chrom, pos)

with open(gwas_filename) as f:
    # header_cols = next(f_gwas).strip().split('\t')
    # for idx, text in enumerate(header_cols):
    #     print(idx, text)
    # TRAIT_COL = header_cols.index('MAPPED_TRAIT')

    hits_by_trait = {}

    gwas_catalog_reader = csv.DictReader(f, delimiter='\t')
    for gwas_catalog_hit in gwas_catalog_reader:

        chrom, pos = gwas_catalog_hit['CHR_ID'], gwas_catalog_hit['CHR_POS']
        if not pos.strip():
            if not gwas_catalog_hit['SNPS']:
                print('failed hit:', gwas_catalog_hit)
                continue # Hopeless?
            elif ':' in gwas_catalog_hit['SNPS'] and ',' not in gwas_catalog_hit['SNPS']:
                chrom, pos = gwas_catalog_hit['SNPS'].lstrip('Cchr').split(':')
            elif gwas_catalog_hit['SNPS'].startswith('rs'):
                print('can\'t handle rs# yet:', gwas_catalog_hit['SNPS'])
                # TODO: handle rs#
                continue
            else:
                print('confusing SNPS:', gwas_catalog_hit['SNPS'])
                continue
        try:
            chrom, pos = grch38_to_hg19(chrom, pos)
        except ValueError as exc:
            print(exc)

        try:
            pval = float(gwas_catalog_hit['P-VALUE'])
        except ValueError:
            if gwas_catalog_hit['P-VALUE'].strip():
                print('failed at pval:', gwas_catalog_hit['P-VALUE'])
            continue

        traits = [trait.strip() for trait in gwas_catalog_hit['MAPPED_TRAIT'].split(',') if trait.strip()]
        for trait in traits:
            hits_by_trait.setdefault(trait, []).append({
                'OR_or_Beta': gwas_catalog_hit['OR or BETA'],
                'trait': gwas_catalog_hit['DISEASE/TRAIT'],
                'link': 'http://' + gwas_catalog_hit['LINK'],
                'chrom': chrom,
                'pos': pos,
                'reported_genes': gwas_catalog_hit['REPORTED GENE(S)'],
                'pval': pval,
            })

# # To view all available GWAS Catalog traits, for matching up with out phenotypes.
# for t in sorted(hits_by_trait):
#     print(t)

hits_by_pheno = {}
with open(mapping_filename) as f:
    mapping_reader = csv.DictReader(f)
    for mapping in mapping_reader:
        hits_by_pheno.setdefault(mapping['pheno_code'], []).extend(hits_by_trait.get(mapping['gwas_catalog_mapped_trait'], []))

with open(out_filename, 'w') as f:
    json.dump(hits_by_pheno, f)
