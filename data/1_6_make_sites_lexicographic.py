#!/usr/bin/env python2

'''
This script creates `cpra_rsids.tsv` by merging `sites/cpra.tsv` with `sites/dbSNP/dbsnp-b147-GRCh37.gz`.
It relies on both being sorted the same way, so it makes some assertions about that.

Note: this only works for chr1-22.  For others, we'll need to fix up sorting.
'''

from __future__ import print_function, division, absolute_import

# Load config
import os.path
my_dir = os.path.dirname(os.path.abspath(__file__))
execfile(os.path.join(my_dir, '../config.config'))

# Activate virtualenv
activate_this = os.path.join(virtualenv_dir, 'bin/activate_this.py')
execfile(activate_this, dict(__file__=activate_this))



def get_line_reader(f):
    for line in f:
        line = line.rstrip('\n')
        fields = line.split('\t')
        yield {
            'crpa': [fields[0], int(fields[1]), fields[2], fields[3]],
            'rsids': fields[4],
            'gene': fields[5],
            'dist': int(fields[6]),
        }

with open(data_dir + 'sites/cpra_rsids_genes.lexicographic.tsv') as in_f, \
     open(data_dir + 'sites/sites.lexicographic.tsv', 'w') as out_f:
    reader = get_line_reader(in_f)

    v = next(reader)
    last_cpra_rsid = v['crpa'] + [v['rsids']]
    genes = [v['gene']]
    distances = [v['dist']]

    for v in reader:
        assert ',' not in v['gene'] # If there's a comma, then our comma-delimiting will break things.
        if v['crpa'] + [v['rsids']] == last_cpra_rsid:
            genes.append(v['gene'])
            distances.append(v['dist'])
        else:
            assert all(distances[0] == dist for dist in distances[1:])
            out_f.write('\t'.join(str(x) for x in last_cpra_rsid) + '\t' + ','.join(genes) + '\n')
            genes = [v['gene']]
            distances = [v['dist']]
            last_cpra_rsid = v['crpa'] + [v['rsids']]
    # Print out the last variant.
    out_f.write('\t'.join(str(x) for x in last_cpra_rsid) + '\t' + ','.join(genes) + '\n')
