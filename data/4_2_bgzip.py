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

import subprocess
import os

def get_path(cmd):
    path = None
    if hasattr(conf, cmd+'_path'):
        path = getattr(conf, cmd+'_path')
    else:
        try:
            path = subprocess.check_output(['which', cmd]).strip()
        except subprocess.CalledProcessError:
            pass
    if path is None:
        raise Exception("The command '{cmd}' was not found in $PATH and was not specified (as {cmd}_path) in config.config.".format(cmd=cmd))
    return path

tabix = get_path('tabix')
bgzip = get_path('bgzip')

matrix_fname = os.path.join(conf.data_dir, 'matrix.tsv')
matrix_gz_fname = os.path.join(conf.data_dir, 'matrix.tsv.gz')

script = '''
set -euo pipefail

# Tabix expects the header line to start with a '#'
(echo -n '#'; cat "{matrix_fname}") |
"{bgzip}" > "{matrix_gz_fname}"

"{tabix}" -p vcf "{matrix_gz_fname}"
'''.format(bgzip=bgzip, tabix=tabix, matrix_fname=matrix_fname, matrix_gz_fname=matrix_gz_fname)


try:
    with open(os.devnull) as devnull:
        # is this the right way to block stdin?
        data = subprocess.check_output(['bash', '-c', script], stderr=subprocess.STDOUT, stdin=devnull)
    status = 0
except subprocess.CalledProcessError as ex:
    data = ex.output
    status = ex.returncode
except Exception as ex:
    print('Oh no something went wrong!')
    print("Here's the error message:")
    print(ex)
data = data.decode('utf8')
if status != 0:
    print('FAILED with status {}'.format(status))
