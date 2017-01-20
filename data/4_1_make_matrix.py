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

import subprocess
import os

gxx = utils.get_path('g++', 'gxx_path')
matrixify_cpp_fname = os.path.join(my_dir, 'matrixify.cpp')
matrixify_exe_fname = os.path.join(conf.data_dir, 'tmp', 'matrixify')
augmented_pheno_dir = os.path.join(conf.data_dir, 'augmented_pheno')
matrix_tsv_fname = os.path.join(conf.data_dir, 'matrix.tsv')

utils.run_cmd([gxx, matrixify_cpp_fname, '-O3', '-o', matrixify_exe_fname])

utils.run_script('''
cd '{augmented_pheno_dir}'
'{matrixify_exe_fname}' > '{matrix_tsv_fname}'
'''.format(**locals()))
