#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

import os.path

activate_this = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../venv/bin/activate_this.py')
execfile(activate_this, dict(__file__=activate_this))

import gzip
import collections
import os.path
import subprocess
import datetime
import shutil

data_dir = '/var/pheweb_data/'
epacts_results_filename = data_dir + '/phewas_maf_gte_1e-2_ncases_gte_20.vcf.gz'

def get_phenos_in_file(filename):
    with gzip.open(filename) as f:
        header = f.readline().rstrip('\n').split('\t')

    phenos = {}
    for colnum, colname in enumerate(header, start=1):
        if colname in ['#CHROM', 'BEG', 'MARKER_ID', 'MAF']:
            continue
        else:
            if colname.endswith('.P'):
                phenos.setdefault(colname.rstrip('.P'), {})['colnum_pval'] = colnum
            elif colname.endswith('.B'):
                phenos.setdefault(colname.rstrip('.B'), {})['colnum_beta'] = colnum
            else:
                raise
    return collections.OrderedDict(sorted(phenos.items()))

def get_halves(ordered_dict):
    midpoint = len(ordered_dict)//2
    keys = ordered_dict.keys()
    return (keys[:midpoint], keys[midpoint:])

work_todo = [data_dir + '/phewas_maf_gte_1e-2_ncases_gte_20.vcf.gz']

while work_todo:
    print('{} \t{}'.format(
        datetime.datetime.now(),
        ' '.join(path.replace(data_dir,'').replace('gwas-intermediate-splits/','').replace('.vcf.gz','') for path in work_todo)
    ))

    file_to_split = work_todo.pop()
    phenos = get_phenos_in_file(file_to_split)
    assert len(phenos) > 1

    for half in get_halves(phenos):
        if len(half) == 1:
            dest_filename = '{}/gwas-one-pheno/{}.vcf.gz'.format(data_dir, half[0])
        else:
            dest_filename = '{}/gwas-intermediate-splits/{}-{}.vcf.gz'.format(data_dir, half[0], half[-1])

        if os.path.exists(dest_filename):
            print('already exists: {}'.format(dest_filename))
        else:
            columns = [1,2,3,4]
            for phewas_code in half:
                columns.append(phenos[phewas_code]['colnum_pval'])
                columns.append(phenos[phewas_code]['colnum_beta'])
            columns = ','.join(map(str, columns))

            # print('{} \t{} \t{}'.format(datetime.datetime.now(), file_to_split, dest_filename))
            # script = """/net/mario/cluster/bin/pigz -dc '{}' | cut -d "\t" -f '{}' | /net/mario/cluster/bin/pigz > '{}'""".format(file_to_split, columns, dest_filename)

            # Try to be idempotent.
            script = """/net/mario/cluster/bin/pigz -dc '{}' | cut -d "\t" -f '{}' | /net/mario/cluster/bin/pigz > '{}/tmp.vcf.gz'""".format(file_to_split, columns, data_dir)
            subprocess.call(script, shell=True)
            shutil.move('{}/tmp.vcf.gz'.format(data_dir), dest_filename)

        if len(half) != 1:
            work_todo.append(dest_filename)