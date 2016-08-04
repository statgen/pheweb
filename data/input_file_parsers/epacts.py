#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

# Load config
import os.path
import imp
my_dir = os.path.dirname(os.path.abspath(__file__))
conf = imp.load_source('conf', os.path.join(my_dir, '../../config.config'))

utils = imp.load_source('utils', os.path.join(my_dir, '../../utils.py'))

import csv
import collections


Variant = collections.namedtuple('Variant', ['chrom', 'pos', 'ref', 'alt', 'pval', 'maf'])
def get_variants(f, minimum_maf=None):
    # Avoiding csv.* for performance reasons.  Maybe just use pandas?
    header = next(f)
    header_fields = header.rstrip('\n\r').split('\t')
    CHROM_COL = header_fields.index('#CHROM')
    POS_COL = header_fields.index('BEGIN')
    MAF_COL = header_fields.index('MAF')
    PVAL_COL = header_fields.index('PVALUE')
    MARKER_ID_COL = header_fields.index('MARKER_ID')
    for line in f:
        fields = line.rstrip('\n\r').split('\t')
        chrom = fields[CHROM_COL]
        pos = int(fields[POS_COL])
        maf = fields[MAF_COL]
        if minimum_maf is not None and maf < minimum_maf:
            continue
        pval = fields[PVAL_COL]
        try:
            pval = float(pval)
        except ValueError:
            pval = '.'
        chrom2, pos2, ref, alt = utils.parse_marker_id(fields[MARKER_ID_COL])
        assert chrom == chrom2, fields
        assert pos == pos2, (fields, pos, pos2)
        yield Variant(chrom=chrom, pos=pos, ref=ref, alt=alt, pval=pval, maf=maf)

def get_num_cases_and_controls(f):
    reader = csv.DictReader(f, delimiter='\t')
    first_line = next(reader)
    num_cases, num_controls = int(first_line['NS.CASE']), int(first_line['NS.CTRL'])
    return (num_cases, num_controls)
