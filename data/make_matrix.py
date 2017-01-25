#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

# TODO:
# when we make a package, maybe `g++ matrixify.cpp` won't work.
# so pipe source into `g++ -x c++ - -o $data_dir/matrixify` instead. (how to pipe: http://stackoverflow.com/a/165662/1166306)
# we can probably store the sourcecode in pkg_resources.  otherwise, a string will do.
# later, cffi or ctypes will be good.

# Load config, utils, venv
import os.path
import imp
my_dir = os.path.dirname(os.path.abspath(__file__))
utils = imp.load_source('utils', os.path.join(my_dir, '../utils.py'))
conf = utils.conf
utils.activate_virtualenv()

import subprocess
import os
import time
import glob

gxx = utils.get_path('g++', 'gxx_path')
tabix = utils.get_path('tabix')
bgzip = utils.get_path('bgzip')
matrixify_cpp_fname = os.path.join(my_dir, 'matrixify.cpp')
matrixify_exe_fname = os.path.join(conf.data_dir, 'tmp', 'matrixify')
sites_fname = os.path.join(conf.data_dir, 'sites', 'sites.tsv')
augmented_pheno_dir = os.path.join(conf.data_dir, 'augmented_pheno')
matrix_gz_fname = os.path.join(conf.data_dir, 'matrix.tsv.gz')

def should_run():
    if not os.path.exists(matrix_gz_fname): return True
    infiles = list(glob.glob(os.path.join(augmented_pheno_dir, '*')))
    infiles.append(sites_fname)
    infile_modtime = max(os.stat(fn).st_mtime for fn in infiles)
    return infile_modtime > os.stat(matrix_gz_fname).st_mtime

def run(argv):

    if should_run():
        utils.run_cmd([gxx, '--std=c++11', matrixify_cpp_fname, '-O3', '-o', matrixify_exe_fname])
        utils.run_script('''
        '{matrixify_exe_fname}' '{sites_fname}' '{augmented_pheno_dir}' |
        '{bgzip}' > '{matrix_gz_fname}'
        '''.format(matrixify_exe_fname=matrixify_exe_fname, sites_fname=sites_fname, augmented_pheno_dir=augmented_pheno_dir, bgzip=bgzip, matrix_gz_fname=matrix_gz_fname))
        utils.run_cmd([tabix, '-p' ,'vcf', matrix_gz_fname])
    else:
        print('matrix is up-to-date!')


if __name__ == '__main__':
    run([])
