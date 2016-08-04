#!/usr/bin/env python2

'''
This script creates `sites.lexicographic.tsv` (which includes chrom,pos,ref,alt,rsid,nearest_genes) by combining lines that refer to the same variant.
That's because when there are ties, bedtools will print out multiple lines with the same chrom-pos-ref-alt-rsid, but each will have a different gene.
I think that bedtools only calls a tie (and prints out a line for each gene) when both distances are the same.  So, I'm asserting that.
'''

from __future__ import print_function, division, absolute_import

# Load config
import os.path
import imp
my_dir = os.path.dirname(os.path.abspath(__file__))
conf = imp.load_source('conf', os.path.join(my_dir, '../config.config'))

# Activate virtualenv
activate_this = os.path.join(conf.virtualenv_dir, 'bin/activate_this.py')
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

with open(conf.data_dir + '/sites/cpra_rsids_genes.lexicographic.tsv') as in_f, \
     open(conf.data_dir + '/sites/sites.lexicographic.tsv', 'w') as out_f:
    reader = get_line_reader(in_f)

    v = next(reader)
    last_cpra_rsid = v['crpa'] + [v['rsids']]
    genes = [v['gene']]
    distances = [v['dist']]

    # Read one line at a time.
    # If it is for the same variant as the previous line, just add its gene and dist to the growing lists.
    # If not, print the previous variant and start afresh.
    for v in reader:
        assert ',' not in v['gene'] # If there's a comma, then our comma-delimiting will break things.
        if v['crpa'] + [v['rsids']] == last_cpra_rsid:
            genes.append(v['gene'])
            distances.append(v['dist'])
        else:
            assert all(abs(distances[0]) == abs(dist) for dist in distances[1:])
            out_f.write('\t'.join(str(x) for x in last_cpra_rsid) + '\t' + ','.join(genes) + '\n')
            genes = [v['gene']]
            distances = [v['dist']]
            last_cpra_rsid = v['crpa'] + [v['rsids']]
    # Print out the last variant.
    out_f.write('\t'.join(str(x) for x in last_cpra_rsid) + '\t' + ','.join(genes) + '\n')
