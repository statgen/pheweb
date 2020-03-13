#!/usr/bin/env/python3

# use this to add metadata to the pheno-list.json file: endpoint names, categories, case/control n, gc lambda, num gw sig hits
# TODO make part of the import wdl, not using the cov_pheno file but precalculating Ns so can be done without red data
# python3 /mnt/nfs/juha/pheweb/pheweb/load/phenolist.py /mnt/nfs/pheweb/r5/pheno-list.json.orig /mnt/nfs/pheweb/r4/pheno-list.json TAGLIST_DF5.txt FINNGEN_ENDPOINTS_DF5_V2_2020-02-11.names_tagged_ordered.txt Endpoints_Controls_FINNGEN_ENDPOINTS_DF5_V2_2020-02-11.utf8.exnames.txt R5_COV_PHENO_V1.txt.gz /mnt/nfs/pheweb/r5/generated-by-pheweb > /mnt/nfs/pheweb/r5/pheno-list.json

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
    code2tag = {}
    tag2index = {}

    with open(sys.argv[3]) as f:
        f.readline()
        for line in f:
            s = line.strip().split('\t')
            tag2name[s[0].strip()] = s[len(s)-1].strip()

    with open(sys.argv[4]) as f:
        f.readline()
        for line in f:
            s = line.strip().split('\t')
            code2tag[s[2]] = s[0]
            if s[0] not in tag2index:
                tag2index[s[0]] = len(tag2index)

    with open(sys.argv[5]) as f:
        h = {h.strip():i for i,h in enumerate(f.readline().strip().split('\t'))}
        f.readline()
        for line in f:
            s = [s.strip() for s in line.strip().split('\t')]
            code = s[h['NAME']].strip()
            if code in code2pheno:
                code2pheno[code]['phenostring'] = s[h['LONGNAME']].strip()
                code2pheno[code]['num_cases'] = 0
                code2pheno[code]['num_controls'] = 0
                code2pheno[code]['category'] = tag2name[code2tag[code]]
                code2pheno[code]['category_index'] = tag2index[code2tag[code]]

    with gzip.open(sys.argv[6], 'rt') as f:
        header_index = [(i, h) for i,h in enumerate(f.readline().strip().split('\t')) if h in code2pheno]
        for line in f:
            s = line.strip().split('\t')
            for i_h in header_index:
                if s[i_h[0]] == '1':
                    code2pheno[i_h[1]]['num_cases'] = code2pheno[i_h[1]]['num_cases'] + 1
                elif s[i_h[0]] == '0':
                    code2pheno[i_h[1]]['num_controls'] = code2pheno[i_h[1]]['num_controls'] + 1

    for pheno in phenolist:
        with open(sys.argv[7] + '/qq/' + pheno['phenocode'] + '.json') as f:
            qq = json.load(f)
            pheno['gc_lambda'] = qq['overall']['gc_lambda']
        with open(sys.argv[7] + '/manhattan/' + pheno['phenocode'] + '.json') as f:
            manha = json.load(f)
            pheno['num_gw_significant'] = len([v for v in manha['unbinned_variants'] if 'peak' in v and v['peak'] == True and float(v['pval']) < 5e-8])
        if pheno['phenocode'] in code2pheno_prev:
            pheno['num_gw_significant_prev'] = code2pheno_prev[pheno['phenocode']]['num_gw_significant']
        else:
            pheno['num_gw_significant_prev'] = 'NA'
        if pheno['phenocode'] in code2pheno_prev:
            pheno['num_cases_prev'] = code2pheno_prev[pheno['phenocode']]['num_cases']
        else:
            pheno['num_cases_prev'] = 'NA'
    
    print(json.dumps(phenolist))

if __name__=='__main__':
    run()
