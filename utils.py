
from __future__ import print_function, division, absolute_import

import re
import itertools


def parse_variant(query, default_chrom_pos = True):
    if isinstance(query, unicode):
        query = query.encode('utf-8')
    chrom_pattern = r'(?:chr)?([0-9]+)'
    chrom_pos_pattern = chrom_pattern + r'[-_:/ ]([0-9]+)'
    chrom_pos_ref_alt_pattern = chrom_pos_pattern + r'[-_:/ ]([-ATCG]+)[-_:/ ]([-ATCG]+)'

    match = re.match(chrom_pos_ref_alt_pattern, query) or re.match(chrom_pos_pattern, query) or re.match(chrom_pattern, query)
    g = match.groups() if match else ()

    if default_chrom_pos:
        if len(g) == 0: g += ('1',)
        if len(g) == 1: g += (0,)
    if len(g) >= 2: g = (g[0], int(g[1])) + g[2:]
    return g + tuple(itertools.repeat(None, 4-len(g)))


def parse_marker_id(marker_id):
    chr1, pos1, ref, alt, chr2, pos2 = re.match(r'([^:]+):([0-9]+)_([-ATCG]+)/([-ATCG]+)_([^:]+):([0-9]+)', marker_id).groups()
    assert chr1 == chr2
    assert pos1 == pos2
    return chr1, pos1, ref, alt


def make_marker_id(chrom, pos, ref, alt):
    return '{chrom}:{pos}_{ref}/{alt}_{chrom}:{pos}'.format(chrom=chrom, pos=pos, ref=ref, alt=alt)
