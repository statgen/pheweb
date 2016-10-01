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

utils = imp.load_source('utils', os.path.join(my_dir, '../utils.py'))
input_file_parser = imp.load_source('input_file_parser', os.path.join(my_dir, 'input_file_parsers/{}.py'.format(conf.source_file_parser)))

import datetime
import multiprocessing
import csv
import json


def convert(conversion_to_do):
    src_filename = conversion_to_do['src']
    dest_filename = conversion_to_do['dest']
    tmp_filename = conversion_to_do['tmp']
    assert not os.path.exists(dest_filename), dest_filename

    # Avoid getting killed while writing dest_filename, to stay idempotent despite me frequently killing the program
    with open(tmp_filename, 'w') as f_out:

        minimum_maf = conf.minimum_maf if hasattr(conf, 'minimum_maf') else 0
        variants = input_file_parser.get_variants(src_filename, minimum_maf=minimum_maf)

        fieldnames = next(variants)
        writer = csv.DictWriter(f_out, fieldnames=fieldnames, delimiter='\t')
        writer.writeheader()
        writer.writerows(variants)

        os.fsync(f_out.fileno()) # Recommended by <http://stackoverflow.com/a/2333979/1166306>
    print('{}\t{} -> {}'.format(datetime.datetime.now(), src_filename, dest_filename))
    os.rename(tmp_filename, dest_filename)

def get_conversions_to_do():
    with open(my_dir + '/phenos.json') as f:
        phenos = json.load(f)
    print('number of source files:', len(phenos))
    for pheno in phenos:
        dest_filename = '{}/pheno/{}'.format(conf.data_dir, pheno['pheno_code'])
        tmp_filename = '{}/tmp/pheno-{}'.format(conf.data_dir, pheno['pheno_code'])
        if not os.path.exists(dest_filename):
            yield {
                'src': pheno['src_filename'],
                'dest': dest_filename,
                'tmp': tmp_filename,
            }

utils.mkdir_p(conf.data_dir + '/pheno')
utils.mkdir_p(conf.data_dir + '/tmp')

# TODO: add `--debug` which doesn't use multiprocessing

conversions_to_do = list(get_conversions_to_do())
print('number of conversions to do:', len(conversions_to_do))
p = multiprocessing.Pool(40)
#p.map(convert, conversions_to_do)
p.map_async(convert, conversions_to_do).get(1e8) # Makes KeyboardInterrupt work
#convert(conversions_to_do[0]) # debugging
