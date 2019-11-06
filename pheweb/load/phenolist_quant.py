#!/usr/bin/env/python3

#phenolist_quant.py pheno-list.json.orig ATC_translate_minimal.txt R4_COV_PHENO_V1_DRUGS_MARK.txt.gz ./generated-by-pheweb | python -m json.tool > pheno-list.json.

import sys
import json
import gzip
from collections import OrderedDict as od

def run():

    with open(sys.argv[1]) as f:
        phenolist = json.load(f)

    code2pheno = {pheno['phenocode']:pheno for pheno in phenolist}

    atc2name = {}
    with open(sys.argv[2]) as f:
        for line in f:
            s = line.strip().split('\t')
            if len(s) > 1:
                atc2name[s[0]] = s[1]
    
    with gzip.open(sys.argv[3], 'rt') as f:
        header_index = [(i, h) for i,h in enumerate(f.readline().strip().split('\t')) if h in code2pheno]
        for line in f:
            s = line.strip().split('\t')
            for i_h in header_index:
                if s[i_h[0]] != 'NA':
                    if 'num_samples' not in code2pheno[i_h[1]]:
                        code2pheno[i_h[1]]['num_samples'] = 0
                    code2pheno[i_h[1]]['num_samples'] = code2pheno[i_h[1]]['num_samples'] + 1

    for pheno in phenolist:
        atc = pheno['phenocode'].replace('ATC_', '').replace('_IRN', '')
        pheno['phenostring'] = atc2name[atc]
        pheno['atc'] = atc
        pheno['category'] = 'ATC'
        with open(sys.argv[4] + '/qq/' + pheno['phenocode'] + '.json') as f:
            qq = json.load(f)
            pheno['gc_lambda'] = qq['overall']['gc_lambda']
        with open(sys.argv[4] + '/manhattan/' + pheno['phenocode'] + '.json') as f:
            manha = json.load(f)
            pheno['num_gw_significant'] = len([v for v in manha['unbinned_variants'] if 'peak' in v and v['peak'] == True and float(v['pval']) < 5e-8])
    
    print(json.dumps(phenolist))

if __name__=='__main__':
    run()
