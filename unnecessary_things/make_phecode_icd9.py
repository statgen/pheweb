#!/usr/bin/env python3

'''
$ wget https://github.com/PheWAS/PheWAS/blob/master/data/phemap.rda
$ wget https://github.com/PheWAS/PheWAS/blob/master/data/pheinfo.rda
$ r
> load('phemap.rda')
> load('pheinfo.rda')
> write.csv(phemap, 'phemap.csv', row.names=F)
> write.csv(pheinfo, 'pheinfo.csv', row.names=F)

# found this link at <https://www.cms.gov/medicare/coding/ICD9providerdiagnosticcodes/codes.html>
$ wget https://www.cms.gov/Medicare/Coding/ICD9ProviderDiagnosticCodes/Downloads/ICD-9-CM-v32-master-descriptions.zip
$ unzip ICD-9-CM-v32-master-descriptions.zip

$ wget https://medschool.vanderbilt.edu/cpm/files/cpm/public_files/perl_phewas.zip
$ unzip perl_phewas.zip
$ cat code_translation.txt | tr "\r" "\n" > icd9s.tsv
'''

import csv
import json

icd9s = list(csv.DictReader(open('icd9s.tsv'), delimiter='\t'))
string_for_icd9 = {}
for x in icd9s:
    string_for_icd9[x['CODE']] = x['STR_SHORT']

icd9s_2 = list(open("ICD-9-CM-v32-master-descriptions/CMS32_DESC_LONG_DX.txt", encoding="ISO-8859-1"))
string_for_icd9_2 = {}
for x in icd9s_2:
    icd9, desc = x.strip().split(' ', 1)
    icd9 = icd9[:3] + '.' + icd9[3:]
    string_for_icd9_2[icd9] = desc

phemap = list(csv.DictReader(open('phemap.csv')))
icd9s_for_phecode = {}
for x in phemap:
    icd9s_for_phecode.setdefault(x['phecode'], []).append(x['icd9'])

pheinfo = list(csv.DictReader(open("pheinfo.csv")))
info_for_phecode = {}
for x in pheinfo:
    info_for_phecode[x['phecode']] = {
        'desc': x['description'],
        'category': x['group'],
        'color': x['color'],
    }

def cmp(a,b):
    print(len(set(a)-set(b)), len(set(b)-set(a)), len(set(a).intersection(b)))
cmp(info_for_phecode, icd9s_for_phecode)
cmp(string_for_icd9, string_for_icd9_2)

for phecode in info_for_phecode:
    ii = []
    for icd9 in icd9s_for_phecode[phecode]:
        if icd9 in string_for_icd9_2: # this one takes priority b/c from government
            desc = string_for_icd9_2[icd9]
        elif icd9 in string_for_icd9:
            desc = string_for_icd9[icd9]
        else:
            desc = '?'
        ii.append({'icd9': icd9, 'desc': desc})
    ii = sorted(ii, key=lambda x: x['icd9'])
    info_for_phecode[phecode]['icd9s'] = ii

with open('phecodes_icd9.json', 'w') as f:
    json.dump(info_for_phecode, f, sort_keys=True, indent=1)
