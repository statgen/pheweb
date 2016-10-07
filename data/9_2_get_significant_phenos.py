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

PVAL_CUTOFF = 5e-8

import glob
import json

sig_phenos = {}

# TODO: read phenos.json for phenostrings.
manhattans = glob.glob(conf.data_dir + '/manhattan/*')
for manhattan in manhattans:
    with open(manhattan) as f:
        j = json.load(f)
    min_variant = min(j['unbinned_variants'], key=lambda v:v['pval'])
    if min_variant['pval'] <= PVAL_CUTOFF:
        phenocode = manhattan.split('/')[-1].replace('.json', '')
        sig_phenos[phenocode] = min_variant


with open('significant_phenos.json', 'w') as f:
    json.dump(sig_phenos, f, sort_keys=True, indent=1)

