#!/usr/bin/env python3
# type: ignore

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

# got ICD9_CodeCounts_20160323_LF.txt from group. it differs from others in some ways.

# maybe I should have just downloaded the last 6 icd9 versions and unioned them?
'''

import csv
import json
import itertools
import string

icd9s_1 = list(csv.DictReader(open('icd9s.tsv'), delimiter='\t'))
string_for_icd9_1 = {}
for x in icd9s_1:
    string_for_icd9_1[x['CODE']] = x['STR_SHORT'].strip()

icd9s_2 = list(open("ICD-9-CM-v32-master-descriptions/CMS32_DESC_LONG_DX.txt", encoding="ISO-8859-1"))
string_for_icd9_2 = {}
for x in icd9s_2:
    icd9, desc = x.strip().split(' ', 1)
    icd9 = icd9[:3] + '.' + icd9[3:]
    string_for_icd9_2[icd9] = desc.strip()

icd9s_3 = list(csv.DictReader(open("ICD9_CodeCounts_20160323_LF.txt"), delimiter='\t'))
string_for_icd9_3 = {}
for x in icd9s_3:
    string_for_icd9_3[x['icd9']] = x['icd9_string'].strip()

phemap = list(csv.DictReader(open('phemap.csv')))
icd9s_for_phecode = {}
for x in phemap:
    icd9s_for_phecode.setdefault(x['phecode'], []).append(x['icd9'])

pheinfo = list(csv.DictReader(open("pheinfo.csv")))
info_for_phecode = {}
for x in pheinfo:
    info_for_phecode[x['phecode']] = {
        'desc': x['description'].strip(),
        'category': x['group'].strip(),
        'color': x['color'].strip(),
    }

def cmp(*xs):
    for n in range(1, 1+len(xs)):
        for c in itertools.combinations(range(len(xs)), n):
            print(''.join(string.ascii_letters[i] for i in c), end=':')
            print(len(set.intersection(*[set(xs[i]) for i in c])), end=' ')
    print('')
    for n in range(1, 1+len(xs)):
        for c in itertools.combinations(range(len(xs)), n):
            print(''.join(string.ascii_letters[i] for i in c), end='')
            comp = [i for i in range(len(xs)) if i not in c]
            if comp:
                print('-' + ''.join(string.ascii_letters[i] for i in comp), end='')
            print(':', end='')
            print(len(set.intersection(*[set(xs[i]) for i in c]).difference(*[xs[i] for i in comp])), end=' ')
    print('')
cmp(info_for_phecode, icd9s_for_phecode)
cmp(string_for_icd9_1, string_for_icd9_2, string_for_icd9_3)

for phecode in info_for_phecode:
    ii = []
    for icd9 in icd9s_for_phecode[phecode]:
        # 3 is from group, 2 is from govt, 1 is from vb
        desc = string_for_icd9_3.get(icd9, False) or string_for_icd9_2.get(icd9, False) or string_for_icd9_1.get(icd9, False) or '?'
        ii.append({'icd9': icd9, 'desc': desc})
    ii = sorted(ii, key=lambda x: x['icd9'])
    info_for_phecode[phecode]['icd9s'] = ii

with open('phecodes_icd9.json', 'w') as f:
    json.dump(info_for_phecode, f, sort_keys=True, indent=1)
