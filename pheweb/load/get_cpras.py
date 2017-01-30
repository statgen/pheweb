#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

from .. import utils
conf = utils.conf

input_file_parser = utils.get_assoc_file_parser()

import datetime
import multiprocessing
import csv
import os
import json


@utils.exception_tester
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

        f_out.flush()
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

    p = multiprocessing.Pool(utils.get_num_procs())
    results = p.map_async(convert, conversions_to_do).get(1e8) # Makes KeyboardInterrupt work

    good_results = [r['args'][0]['pheno'] for r in results if r['succeeded']]
    bad_results = [r['args'][0]['pheno'] for r in results if not r['succeeded']]
    print('num phenotypes that succeeded:', len(good_results))
    print('num phenotypes that failed:', len(bad_results))

    if good_results and bad_results:
        fname = os.path.join(conf.data_dir, 'pheno-list-successful-only.json')
        with open(fname, 'w') as f:
            json.dump(f, good_results)
        print('wrote good_results into {!r}, which you should probably use to replace pheno-list.json'.format(fname))
        fname = os.path.join(conf.data_dir, 'pheno-list-bad-only.json')
        with open(fname, 'w') as f:
            json.dump(f, bad_results)
        print('wrote bad_results into {!r}'.format(fname))

if __name__ == '__main__':
    run([])
