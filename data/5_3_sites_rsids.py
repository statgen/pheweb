#!/usr/bin/env python2

'''
This script merges the sites vcf with the rsids vcf.
It relies on both being sorted the same way, so it makes some assertions about that.

Note: this only works for chr1-22.  For others, we'll need to fix up sorting.
'''

from __future__ import print_function, division, absolute_import

import os.path

# Activate virtualenv
my_dir = os.path.dirname(os.path.abspath(__file__))
activate_this = os.path.join(my_dir, '../../venv/bin/activate_this.py')
execfile(activate_this, dict(__file__=activate_this))

import gzip
import collections

import sys
sys.path.insert(0, os.path.join(my_dir, '..'))
from utils import parse_marker_id

execfile(os.path.join(my_dir, '../config.config'))

rsids_filename = data_dir + "/dbSNP/rsids.vcf.gz"
sites_filename = data_dir + "/phewas_maf_gte_1e-2_ncases_gte_20_sites.vcf.gz"
out_filename = data_dir + "/phewas_maf_gte_1e-2_ncases_gte_20_sites_rsids.vcf.gz"



Site_line = collections.namedtuple('Site_line', 'chrom pos ref alt'.split())
def parse_site_line(line):
    fields = line.rstrip('\n').split('\t')
    chrom, pos = int(fields[0]), int(fields[1])
    chrom2, pos2, ref, alt = parse_marker_id(fields[2])
    assert chrom == int(chrom2)
    assert pos == pos2
    return Site_line(chrom=chrom, pos=pos, ref=ref, alt=alt)

Rsid_line = collections.namedtuple('Rsid_line', 'chrom pos ref alt rsid'.split())
def parse_rsid_line(line):
    fields = line.rstrip('\n').split('\t')
    chrom, pos, rsid, ref, alt = int(fields[0]), int(fields[1]), fields[2], fields[3], fields[4]
    return Rsid_line(chrom=chrom, pos=pos, ref=ref, alt=alt, rsid=rsid)


with gzip.open(sites_filename) as sites_f, \
     gzip.open(rsids_filename) as rsids_f, \
     gzip.open(out_filename, 'w') as out_f:

    sites_header = sites_f.readline().rstrip('\n').split('\t')
    assert sites_header == ['#CHROM', 'BEG', 'MARKER_ID']
    site_lines = (parse_site_line(line) for line in sites_f)

    def get_rsid_vcf_lines():
        for line in rsids_f:
            if not line.startswith('##'):
                if line.startswith('#'):
                    assert line.rstrip('\n').split('\t') == '#CHROM POS ID REF ALT QUAL FILTER INFO'.split()
                else:
                    yield line
    rsid_lines = (parse_rsid_line(line) for line in get_rsid_vcf_lines())
    rsid = next(rsid_lines)
    def get_next_rsid(prev_rsid):
        rsid = next(rsid_lines, None)
        assert rsid is None or (rsid.chrom, rsid.pos) >= (prev_rsid.chrom, prev_rsid.pos), (rsid, prev_rsid)
        return rsid

    prev_site = None
    for site in site_lines:

        assert prev_site is None or (prev_site.chrom, prev_site.pos) <= (site.chrom, site.pos)
        prev_site = site

        # At the end, if we go past the last rsid, `rsid` will be None, so we'll skip all rsid-related loops.
        while rsid is not None and (rsid.chrom, rsid.pos) < (site.chrom, site.pos):
            rsid = get_next_rsid(rsid)

        rsids = []
        while rsid is not None and (rsid.chrom, rsid.pos) == (site.chrom, site.pos):
            if (rsid.ref, rsid.alt) == (site.ref, site.alt):
                # TODO: Check whether both files handle indels the same way.  For now, we don't have indels, so don't worry about it.
                #       As a reminder to fix this, here's an assertion that will break someday:
                assert len(site.ref) == 1 and len(site.alt) == 1
                rsids.append(rsid.rsid)
            rsid = get_next_rsid(rsid)

        print('{}\t{}\t{}\t{}\t{}'.format(site.chrom, site.pos, site.ref, site.alt, ','.join(rsids)), file=out_f)
