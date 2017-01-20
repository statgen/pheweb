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

import os

tabix = utils.get_path('tabix')
bgzip = utils.get_path('bgzip')

tmp_dir = os.path.join(conf.data_dir, 'tmp')
augmented_pheno_dir = os.path.join(conf.data_dir, 'augmented_pheno')
augmented_pheno_gz_dir = os.path.join(conf.data_dir, 'augmented_pheno_gz')

def convert(infile):
    fname = os.path.basename(infile) + '.gz'
    tmpfile = os.path.join(tmp_dir, 'augmented_pheno_gz' + fname)
    outfile = os.path.join(augmented_pheno_gz_dir, fname)
    tbifile = os.path.join(augmented_pheno_gz_dir, fname + '.tbi')
    if not os.path.exists(outfile):

        utils.run_script('''
        # Tabix expects the header line to start with a '#'
        (echo -n '#'; cat '{infile}') | '{bgzip}' > '{tmpfile}'
        '''.format(**locals()))
        os.rename(tmpfile, outfile)
        utils.run_cmd([tabix, '-p', 'vcf', outfile])

    elif not os.path.exists(tbifile):
        utils.run_cmd([tabix, '-p', 'vcf', outfile])

    print("{} -> {}".format(infile, outfile))

utils.mkdir_p(augmented_pheno_gz_dir)

infiles = os.listdir(augmented_pheno_dir)
print('number of conversions to do:', len(infiles))
num_processes = multiprocessing.cpu_count() * 3//4 + 1
p = multiprocessing.Pool(num_processes)
p.map_async(convert, infiles).get(1e8) # Makes KeyboardInterrupt work
