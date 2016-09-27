#!/usr/bin/env python2

'''
This script creates `cpra_rsids.tsv` by merging `sites/cpra.tsv` with `sites/dbSNP/dbsnp-b147-GRCh37.gz`.
It relies on both being sorted the same way, so it makes some assertions about that.

Note: this only works for chr1-22.  For others, we'll need to fix up sorting.
'''

# TODO:
# 1. this needs to fetch one pos at a time from `/sites/cpra.tsv`.  Then it needs to test each of those against each rsid.
#    - see 3_2 for some of that code.
# 2. Deal with chromosome order.

from __future__ import print_function, division, absolute_import

# Load config
import os.path
import imp
my_dir = os.path.dirname(os.path.abspath(__file__))
conf = imp.load_source('conf', os.path.join(my_dir, '../config.config'))

# Activate virtualenv
activate_this = os.path.join(conf.virtualenv_dir, 'bin/activate_this.py')
execfile(activate_this, dict(__file__=activate_this))

import sys
sys.path.insert(0, os.path.join(my_dir, '..'))
from utils import parse_marker_id


import gzip
import collections
import csv
import itertools

rsids_filename = conf.data_dir + "/sites/dbSNP/rsids.vcf.gz"
cpra_filename = conf.data_dir + "/sites/cpra.tsv"
out_filename = conf.data_dir + "/sites/cpra_rsids.tsv"


def get_rsid_reader(rsids_f):
    # TODO: add assertions about ordering?
    for line in rsids_f:
        if not line.startswith('##'):
            if line.startswith('#'):
                assert line.rstrip('\n').split('\t') == '#CHROM POS ID REF ALT QUAL FILTER INFO'.split()
            else:
                 fields = line.rstrip('\n').split('\t')
                 chrom, pos, rsid, ref, alt_group = int(fields[0]), int(fields[1]), fields[2], fields[3], fields[4]
                 assert rsid.startswith('rs')
                 assert all(base in 'ATCG' for base in ref)
                 for alt in alt_group.split(','):
                     # Alt can be a comma-separated list
                     assert all(base in 'ATCG' for base in alt), alt
                     yield {'chrom':chrom, 'pos':int(pos), 'ref':ref, 'alt':alt, 'rsid':rsid}

class PushableIterator(object):
    '''A wrapper around an iterator that allows you to push items back on top, LIFO.'''
    def __init__(self, iterator):
        self.iterator = iterator
        self._top = []
    def __iter__(self):
        return self
    def __next__(self):
        try:
            return self._top.pop()
        except IndexError:
            return next(self.iterator)
    def push_on_top(self, item):
        self._top.push(item)

def get_cpra_reader(cpra_f):
    '''Returns a reader which returns a list of all cpras at the next chrom-pos.'''
    # TODO: add assertions about ordering?
    cpra_reader = csv.DictReader(cpra_f, delimiter='\t')
    for cpra in cpra_reader:
        yield {
            'chrom': int(cpra['chrom']),
            'pos': int(cpra['pos']),
            'ref': cpra['ref'],
            'alt': cpra['alt'],
        }

def get_one_chr_pos_at_a_time(iterator):
    for k, g in itertools.groupby(iterator, key=lambda cpra: (cpra['chrom'], cpra['pos'])):
        return list(g)

def are_match(seq1, seq2):
    if seq1 == seq2: return True
    if len(seq1) != len(seq2): return False
    if 'N' not in seq1 and 'N' not in seq2: return False
    return all(b1 == b2 or b1 == 'N' or b2 == 'N' for b1, b2 in zip(seq1, seq2))

with open(cpra_filename) as cpra_f, \
     gzip.open(rsids_filename) as rsids_f, \
     open(out_filename, 'w') as out_f:

    rsid_reader = PushableIterator(get_rsid_reader(rsids_f))
    cp_group_reader = get_one_chr_pos_at_a_time(get_cpra_reader(cpra_f))

    for cp_group in cp_group_reader:

        while True:
            rsid = next(rsid_reader)
            if rsid['chrom']

        rsids = []
        while rsid is not None and (int(rsid['chrom']), int(rsid['pos'])) == (int(cpra['chrom']), int(cpra['pos'])):
            if (rsid['ref'], rsid['alt']) == (cpra['ref'], cpra['alt']):
                # TODO: Check whether both files handle indels the same way.  For now, just hope that all files in a dataset are consistent.
                assert len(cpra['ref']) == 1 and len(cpra['alt']) == 1, cpra
                rsids.append(rsid['rsid'])
            rsid = get_next_rsid(rsid)

        print('{chrom}\t{pos}\t{ref}\t{alt}\t{0}'.format(','.join(rsids), **cpra), file=out_f)
