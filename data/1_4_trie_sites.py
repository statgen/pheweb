#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

import os.path

activate_this = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../venv/bin/activate_this.py')
execfile(activate_this, dict(__file__=activate_this))

import marisa_trie
import gzip
import re

data_dir = '/var/pheweb_data/'

def parse_line(line):
    m = re.match(r'[^\t]+\t[^\t]+\t([^:]+):([0-9]+)_([-ATCG]+)/([-ATCG]+)_', line)
    groups = m.groups()
    return '{}-{}-{}-{}'.format(*groups)

with gzip.open(data_dir + '/phewas_maf_gte_1e-2_ncases_gte_20_sites.vcf.gz') as f:
    next(f) # skip header
    trie = marisa_trie.Trie(parse_line(line) for line in f)

trie.save(data_dir + '/sites_trie.marisa')
