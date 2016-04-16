
from __future__ import print_function, division, absolute_import

import re
import itertools
import math
import json
import gzip
import os


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
    return chr1, int(pos1), ref, alt


def make_marker_id(chrom, pos, ref, alt):
    return '{chrom}:{pos}_{ref}/{alt}_{chrom}:{pos}'.format(chrom=chrom, pos=pos, ref=ref, alt=alt)


def round_sig(x, digits):
    return 0 if x==0 else round(x, digits-1-int(math.floor(math.log10(abs(x)))))
assert round_sig(0.00123, 2) == 0.0012
assert round_sig(1.59e-10, 2) == 1.6e-10


def get_phenos_with_colnums(app_root_path):
    with open(os.path.join(app_root_path, 'data/phenos.json')) as f:
        phenos = json.load(f)
    with gzip.open('/var/pheweb_data/phewas_maf_gte_1e-2_ncases_gte_20.vcf.gz') as f:
        header = f.readline().rstrip('\n').split('\t')
    assert header[:4] == ['#CHROM', 'BEG', 'MARKER_ID', 'MAF']
    for colnum, colname in enumerate(header[4:], start=4):
        if colnum % 2 == 0:
            phewas_code = colname.rstrip('.P')
            phenos[phewas_code]['colnum_pval'] = colnum
        else:
            phewas_code = colname.rstrip('.B')
            phenos[phewas_code]['colnum_beta'] = colnum
    for phewas_code in phenos:
        assert 'colnum_pval' in phenos[phewas_code] and 'colnum_beta' in phenos[phewas_code]
    return phenos
