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
        headers = f.readline().strip().split('\t')
        header_index = [(i, h) for i,h in enumerate(headers) if h in code2pheno]
        header_index_raw = [(i, h) for i,h in enumerate(headers) if (h + '_IRN') in code2pheno]
        for line in f:
            s = line.strip().split('\t')
            for i_h in header_index_raw:
                irn = i_h[1] + '_IRN'
                if s[i_h[0]] != '0.5':
                    if 'num_samples' not in code2pheno[irn]:
                        code2pheno[irn]['num_samples'] = 0
                        code2pheno[irn]['num_events'] = 0
                    code2pheno[irn]['num_samples'] = code2pheno[irn]['num_samples'] + 1
                    code2pheno[irn]['num_events'] = code2pheno[irn]['num_events'] + int(s[i_h[0]])

    for pheno in phenolist:
        atc = pheno['phenocode'].replace('ATC_', '').replace('_IRN', '')
        pheno['category'] = 'ATC'
        if atc in atc2name:
            pheno['phenostring'] = atc2name[atc]
            pheno['atc'] = atc
        else:
            pheno['phenostring'] = pheno['phenocode']
            pheno['atc'] = 'none'
            #pheno['category'] = 'Age of onset'
        with open(sys.argv[4] + '/qq/' + pheno['phenocode'] + '.json') as f:
            qq = json.load(f)
            pheno['gc_lambda'] = qq['overall']['gc_lambda']
        with open(sys.argv[4] + '/manhattan/' + pheno['phenocode'] + '.json') as f:
            manha = json.load(f)
            pheno['num_gw_significant'] = len([v for v in manha['unbinned_variants'] if 'peak' in v and v['peak'] == True and float(v['pval']) < 5e-8])
    
    print(json.dumps(phenolist))

if __name__=='__main__':
    run()
