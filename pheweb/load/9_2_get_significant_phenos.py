#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

from .. import utils
conf = utils.conf

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

