#!/usr/bin/env/python3

import sys
import json
import gzip
import glob
import os
import json
import functools

def run():

    with open(sys.argv[1]) as f:
        phenolist = json.load(f)

    pheno2conf = {}
    for file in glob.glob('/mnt/nfs/pheweb/gbma/conf/*.json'):
        with open(file, 'rt') as f:
            conf = json.load(f)
        pheno = os.path.basename(file).replace('_conf.json', '_meta_pheweb')
        pheno2conf[pheno] = conf['meta']

    for pheno in phenolist:
        if pheno['phenocode'] == 'AAA_meta_pheweb':
            pheno['phenostring'] = 'Abdominal aortic aneurysm'
        if pheno['phenocode'] == 'Asthma_meta_pheweb':
            pheno['phenostring'] = 'Asthma'
        if pheno['phenocode'] == 'IPF_meta_pheweb':
            pheno['phenostring'] = 'Idiopathic pulmonary fibrosis'
        if pheno['phenocode'] == 'POAG_meta_pheweb':
            pheno['phenostring'] = 'Primary open-angle glaucoma'
        if pheno['phenocode'] == 'ThC_meta_pheweb':
            pheno['phenostring'] = 'Thyroid cancer'
        if pheno['phenocode'] == 'UtC_meta_pheweb':
            pheno['phenostring'] = 'Uterine cancer'
        code = pheno['phenocode']
        pheno['cohorts'] = [{'cohort': p['name'], 'num_cases': p['n_cases'], 'num_controls': p['n_controls']} for p in pheno2conf[code]]
        pheno['num_cases'] = functools.reduce(lambda s, x: x['n_cases'] + s, pheno2conf[code], 0)
        pheno['num_controls'] = functools.reduce(lambda s, x: x['n_controls'] + s, pheno2conf[code], 0)
        pheno['category'] = 'Pilot phenotype'

    for pheno in phenolist:
        with open('/mnt/nfs/pheweb/gbma/generated-by-pheweb/qq/' + pheno['phenocode'] + '.json') as f:
            qq = json.load(f)
            pheno['gc_lambda'] = qq['overall']['gc_lambda']
        with open('/mnt/nfs/pheweb/gbma/generated-by-pheweb/manhattan/' + pheno['phenocode'] + '.json') as f:
            manha = json.load(f)
            pheno['num_gw_significant'] = len([v for v in manha['unbinned_variants'] if 'peak' in v and v['peak'] == True and float(v['pval']) < 5e-8])

    print(json.dumps(phenolist))

if __name__=='__main__':
    run()
