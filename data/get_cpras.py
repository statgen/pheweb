#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

# Load config, utils, venv
import os.path
import imp
my_dir = os.path.dirname(os.path.abspath(__file__))
utils = imp.load_source('utils', os.path.join(my_dir, '../utils.py'))
conf = utils.conf
utils.activate_virtualenv()

input_file_parser = imp.load_source('input_file_parser', os.path.join(my_dir, 'input_file_parsers/{}.py'.format(conf.source_file_parser)))

import datetime
import multiprocessing
import csv
import json


@utils.exception_printer
def convert(conversion_to_do):
    pheno = conversion_to_do['pheno']
    dest_filename = conversion_to_do['dest']
    tmp_filename = conversion_to_do['tmp']

    # Avoid getting killed while writing dest_filename, to stay idempotent despite me frequently killing the program
    with open(tmp_filename, 'w') as f_out:

        minimum_maf = conf.minimum_maf if hasattr(conf, 'minimum_maf') else 0
        fieldnames, variants = input_file_parser.get_fieldnames_and_variants(pheno, minimum_maf=minimum_maf)

        writer = csv.DictWriter(f_out, fieldnames=fieldnames, delimiter='\t')
        writer.writeheader()
        writer.writerows(variants)

        os.fsync(f_out.fileno()) # Recommended by <http://stackoverflow.com/a/2333979/1166306>
    print('{}\t{} -> {}'.format(datetime.datetime.now(), pheno['phenocode'], dest_filename))
    os.rename(tmp_filename, dest_filename)

def get_conversions_to_do():
    phenos = utils.get_phenolist()
    print('number of phenos:', len(phenos))
    for pheno in phenos:
        dest_filename = '{}/cpra/{}'.format(conf.data_dir, pheno['phenocode'])
        tmp_filename = '{}/tmp/cpra-{}'.format(conf.data_dir, pheno['phenocode'])

        should_write_file = not os.path.exists(dest_filename)
        if not should_write_file:
            dest_file_mtime = os.stat(dest_filename).st_mtime
            src_file_mtimes = [os.stat(fname).st_mtime for fname in pheno['assoc_files']]
            if dest_file_mtime < max(src_file_mtimes):
                should_write_file = True
        if should_write_file:
            yield {
                'pheno': pheno,
                'dest': dest_filename,
                'tmp': tmp_filename,
            }

def run(argv):

    utils.mkdir_p(conf.data_dir + '/cpra')
    utils.mkdir_p(conf.data_dir + '/tmp')

    conversions_to_do = list(get_conversions_to_do())
    print('number of phenos to process:', len(conversions_to_do))

    p = multiprocessing.Pool(40)
    p.map_async(convert, conversions_to_do).get(1e8) # Makes KeyboardInterrupt work


if __name__ == '__main__':
    run([])
