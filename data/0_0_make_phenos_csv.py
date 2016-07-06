#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

# Load config
import os.path
import imp
my_dir = os.path.dirname(os.path.abspath(__file__))
conf = imp.load_source('conf', os.path.join(my_dir, '../config.config'))

# Activate virtualenv
activate_this = os.path.join(conf.virtualenv_dir, 'bin/activate_this.py')
execfile(activate_this, dict(__file__=activate_this))


import glob
import re
import csv


def get_phenos():
    src_filenames = glob.glob(conf.source_filenames_pattern)
    print('number of source files:', len(src_filenames))
    for src_filename in src_filenames:
        match = re.search(conf.source_filenames_pheno_code_extracting_regex, src_filename)
        if match is None:
            raise Exception('Failed to match regex {} against the path {}'.format(conf.source_filenames_pheno_code_extracting_regex, src_filename))
        pheno_code = match.groups()[0]
        yield {
            'src_filename': src_filename,
            'pheno_code': pheno_code,
        }

out_filename = conf.data_dir + '/phenos.csv'
with open(out_filename, 'w') as f:
    writer = csv.DictWriter(f, fieldnames = ['pheno_code', 'src_filename'])
    writer.writeheader()
    writer.writerows(get_phenos())

print('successfully wrote to', out_filename)
