#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

# Load config
import os.path
my_dir = os.path.dirname(os.path.abspath(__file__))
execfile(os.path.join(my_dir, '../config.config'))

# Activate virtualenv
activate_this = os.path.join(virtualenv_dir, 'bin/activate_this.py')
execfile(activate_this, dict(__file__=activate_this))

import sys
sys.path.insert(0, os.path.join(my_dir, '..'))
from utils import round_sig, parse_marker_id

import pybedtools
pybedtools.helpers.set_bedtools_path(path='/net/mario/cluster/bin/')


# There's probably an off-by-one error here somewhere.  Who knows. I don't care.
genes_bed = pybedtools.BedTool(data_dir + '/sites/genes/genes.lexicographic.bed')

def get_closest_genes(chrom, pos):
    variant_bed = pybedtools.BedTool('chr{} {} {}'.format(chrom, pos, pos+1), from_string=True)

    # The `-D ref` option reports distance from the variant to the gene.
    # It's positive if the gene is after the variant.
    # It's negative if the gene is before the variant.
    closest = variant_bed.closest(genes_bed, D='ref')
    assert len(closest) >= 1 # eg, chr9:114173990 overlaps two genes
    assert all(match.fields[0] == match.fields[3] for match in closest)
    if len(closest) > 1:
        # If there's more than one, they'd better all be tied (usually all 0)
        assert all(int(closest[0].fields[7]) == int(match.fields[7]) for match in closest[1:])
    return [match.fields[6] for match in closest]


if __name__ == '__main__':
    chrom = sys.argv[1]
    pos = int(sys.argv[2])
    print(','.join(match.fields[6] for match in get_closest_genes(chrom, pos)))
