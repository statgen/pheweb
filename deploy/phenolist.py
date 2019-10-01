#!/usr/bin/env/python3

import sys
import json
import gzip
from collections import OrderedDict as od

def run():

    with open(sys.argv[1]) as f:
        phenolist = json.load(f)

    with open(sys.argv[2]) as f:
        phenolist_prev = json.load(f)

    code2pheno = {pheno['phenocode']:pheno for pheno in phenolist}
    code2pheno_prev = {pheno['phenocode']:pheno for pheno in phenolist_prev}
    tag2name = {}
    tag2codes = od()
    
    with open(sys.argv[3]) as f:
        f.readline()
        for line in f:
            s = line.strip().split('\t')
            tag2codes[s[0].strip()] = {}
            tag2name[s[0].strip()] = s[len(s)-1].strip()

    with open(sys.argv[4]) as f:
        h = {h.strip():i for i,h in enumerate(f.readline().strip().split('\t'))}
        f.readline()
        for line in f:
            s = [s.strip() for s in line.strip().split('\t')]
            code = s[h['NAME']].strip()
            tags_this = [t.strip() for t in s[h['TAGS']].split(',')]
            min = 1000
            min_tag = None
            for tag in tags_this:
                i = list(tag2codes.keys()).index(tag)
                if i < min:
                    min = i
                    min_tag = tag
            category = tag2name[min_tag]
            if code in code2pheno:
                code2pheno[code]['phenostring'] = s[h['LONGNAME']].strip()
                code2pheno[code]['num_cases'] = 0
                code2pheno[code]['num_controls'] = 0
                code2pheno[code]['category'] = category
                tag2codes[min_tag][code] = True
                ex = ['_EXMORE', '_EXALLC']
            for e in ex:
                if (code + e) in code2pheno:
                    code2pheno[code + e]['phenostring'] = s[h['LONGNAME']].strip() + ' (more controls excluded)' if e == '_EXMORE' else s[h['LONGNAME']].strip() + ' (other cancers excluded from controls)'
                    code2pheno[code + e]['num_cases'] = 0
                    code2pheno[code + e]['num_controls'] = 0
                    code2pheno[code + e]['category'] = category
                    tag2codes[min_tag][code + e] = True

    for tag in tag2codes:
        for code in tag2codes[tag]:
            if len(tag2codes[tag]) < 20:
                code2pheno[code]['category'] = 'Other'
    
    with gzip.open(sys.argv[5], 'rt') as f:
        header_index = [(i, h) for i,h in enumerate(f.readline().strip().split('\t')) if h in code2pheno]
        for line in f:
            s = line.split('\t')
            for i_h in header_index:
                if s[i_h[0]] == '1':
                    if 'num_cases' not in code2pheno[i_h[1]]:
                        print(code2pheno[i_h[1]])
                    code2pheno[i_h[1]]['num_cases'] = code2pheno[i_h[1]]['num_cases'] + 1
                elif s[i_h[0]] == '0':
                    code2pheno[i_h[1]]['num_controls'] = code2pheno[i_h[1]]['num_controls'] + 1

    for pheno in phenolist:
        with open(sys.argv[6] + '/qq/' + pheno['phenocode'] + '.json') as f:
            qq = json.load(f)
            pheno['gc_lambda'] = qq['overall']['gc_lambda']
        with open(sys.argv[6] + '/manhattan/' + pheno['phenocode'] + '.json') as f:
            manha = json.load(f)
            pheno['num_gw_significant'] = len([v for v in manha['unbinned_variants'] if 'peak' in v and v['peak'] == True and float(v['pval']) < 5e-8])

    for pheno in phenolist:
        if pheno['phenocode'] in code2pheno_prev:
            pheno['num_gw_significant_prev'] = code2pheno_prev[pheno['phenocode']]['num_gw_significant']
            pheno['num_cases_prev'] = code2pheno_prev[pheno['phenocode']]['num_cases']
        else:
            pheno['num_gw_significant_prev'] = 'NA'
            pheno['num_cases_prev'] = 'NA'
    
    print(json.dumps(phenolist))

if __name__=='__main__':
    run()
