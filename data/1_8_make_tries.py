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


import marisa_trie


def parse_line(line):
    chrom, pos, ref, alt, rsid, genes = line.rstrip('\n').split('\t')
    # Keys in marisa_trie must be unicode. Values in BytesTrie must be bytes.
    return (u'{}-{}-{}-{}'.format(chrom, pos, ref, alt), rsid)

with open(conf.data_dir + '/sites/sites.tsv') as f:
    lines = [parse_line(line) for line in f]
print('done loading.')

cpra_to_rsids_trie = marisa_trie.BytesTrie(lines, order=marisa_trie.LABEL_ORDER)
out_filename = conf.data_dir + '/sites/cpra_to_rsids_trie.marisa'
cpra_to_rsids_trie.save(out_filename)
print('done with cpra -> rsid trie at ' + out_filename)

# TODO: What if several different chrom-pos-ref-alts have the same rsid?  Do we only get the first? Or the last?
reversed_lines = ((rsid.decode('ascii'), cpra.encode('ascii')) for (cpra, rsids) in lines for rsid in rsids.split(','))
rsid_to_cpra_trie = marisa_trie.BytesTrie(reversed_lines, order=marisa_trie.LABEL_ORDER)
out_filename = conf.data_dir + '/sites/rsid_to_cpra_trie.marisa'
rsid_to_cpra_trie.save(out_filename)
print('done with rsid -> cpra trie at ' + out_filename)
