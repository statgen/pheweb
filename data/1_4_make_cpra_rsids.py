#!/usr/bin/env python2

'''
This script creates `cpra_rsids.tsv` by merging `sites/cpra.tsv` with `sites/dbSNP/dbsnp-b147-GRCh37.gz`.
It relies on both being sorted the same way, so it makes some assertions about that.

Note: this only works for chr1-22.  For others, we'll need to fix up sorting.
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

import sys
sys.path.insert(0, os.path.join(my_dir, '..'))
from utils import parse_marker_id


import gzip
import collections
import csv

rsids_filename = conf.data_dir + "/sites/dbSNP/rsids.vcf.gz"
cpra_filename = conf.data_dir + "/sites/cpra.tsv"
out_filename = conf.data_dir + "/sites/cpra_rsids.tsv"


def get_rsid_reader(rsids_f):
    for line in rsids_f:
        if not line.startswith('##'):
            if line.startswith('#'):
                assert line.rstrip('\n').split('\t') == '#CHROM POS ID REF ALT QUAL FILTER INFO'.split()
            else:
                 fields = line.rstrip('\n').split('\t')
                 chrom, pos, rsid, ref, alt = int(fields[0]), int(fields[1]), fields[2], fields[3], fields[4]
                 yield {'chr':chrom, 'pos':int(pos), 'ref':ref, 'alt':alt, 'rsid':rsid}

def get_cpra_reader(cpra_f):
    cpra_reader = csv.DictReader(cpra_f, delimiter='\t')
    for cpra in cpra_reader:
        yield {
            'chr': int(cpra['chr']),
            'pos': int(cpra['pos']),
            'ref': cpra['ref'],
            'alt': cpra['alt'],
        }


with open(cpra_filename) as cpra_f, \
     gzip.open(rsids_filename) as rsids_f, \
     open(out_filename, 'w') as out_f:

    rsid_reader = get_rsid_reader(rsids_f)
    rsid = next(rsid_reader)
    def get_next_rsid(prev_rsid):
        rsid = next(rsid_reader, None)
        assert rsid is None or (rsid['chr'], rsid['pos']) >= (prev_rsid['chr'], prev_rsid['pos']), (rsid, prev_rsid)
        return rsid
    cpra_reader = get_cpra_reader(cpra_f)


    prev_cpra = None
    for cpra in cpra_reader:

        assert prev_cpra is None or (int(prev_cpra['chr']), int(prev_cpra['pos'])) <= (int(cpra['chr']), int(cpra['pos']))
        prev_cpra = cpra

        # At the end, if we go past the last rsid, `rsid` will be None, so we'll skip all rsid-related loops.
        while rsid is not None and (int(rsid['chr']), int(rsid['pos'])) < (int(cpra['chr']), int(cpra['pos'])):
            rsid = get_next_rsid(rsid)

        rsids = []
        while rsid is not None and (int(rsid['chr']), int(rsid['pos'])) == (int(cpra['chr']), int(cpra['pos'])):
            if (rsid['ref'], rsid['alt']) == (cpra['ref'], cpra['alt']):
                # TODO: Check whether both files handle indels the same way.  For now, we don't have indels, so don't worry about it.
                #       As a reminder to fix this, here's an assertion that will break someday:
                assert len(cpra['ref']) == 1 and len(cpra['alt']) == 1
                rsids.append(rsid['rsid'])
            rsid = get_next_rsid(rsid)

        print('{chr}\t{pos}\t{ref}\t{alt}\t{0}'.format(','.join(rsids), **cpra), file=out_f)
