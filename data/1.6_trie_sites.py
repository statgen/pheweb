#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

import marisa_trie
import gzip
import re

def parse_line(line):
    m = re.match(r'[^\t]+\t[^\t]+\t([^:]+):([0-9]+)_([-ATCG]+)/([-ATCG]+)_', line)
    groups = m.groups()
    return '{}-{}-{}-{}'.format(*groups)

with gzip.open('/var/pheweb_data/phewas_maf_gte_1e-2_ncases_gte_20_sites.vcf.gz') as f:
    next(f) # skip header
    trie = marisa_trie.Trie(parse_line(line) for line in f)

trie.save('/var/pheweb_data/sites_trie.marisa')
