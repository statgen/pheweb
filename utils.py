
from __future__ import print_function, division, absolute_import

# Load config
import os.path
my_dir = os.path.dirname(os.path.abspath(__file__))
execfile(os.path.join(my_dir, 'config.config'))

import re
import itertools
import math
import json
import gzip
import os
import errno



def parse_variant(query, default_chrom_pos = True):
    if isinstance(query, unicode):
        query = query.encode('utf-8')
    chrom_pattern = r'(?:[cC][hH][rR])?([0-9]+)'
    chrom_pos_pattern = chrom_pattern + r'[-_:/ ]([0-9]+)'
    chrom_pos_ref_alt_pattern = chrom_pos_pattern + r'[-_:/ ]([-AaTtCcGg]+)[-_:/ ]([-AaTtCcGg]+)'

    match = re.match(chrom_pos_ref_alt_pattern, query) or re.match(chrom_pos_pattern, query) or re.match(chrom_pattern, query)
    g = match.groups() if match else ()

    if default_chrom_pos:
        if len(g) == 0: g += ('1',)
        if len(g) == 1: g += (0,)
    if len(g) >= 1: g = (g[0].lower(),) + g[1:]
    if len(g) >= 2: g = (g[0], int(g[1])) + tuple([bases.upper() for bases in g[2:]])
    return g + tuple(itertools.repeat(None, 4-len(g)))



def parse_marker_id(marker_id):
    chr1, pos1, ref, alt, chr2, pos2 = parse_marker_id.regex.match(marker_id).groups()
    assert chr1 == chr2
    assert pos1 == pos2
    return chr1, int(pos1), ref, alt
parse_marker_id.regex = re.compile(r'([^:]+):([0-9]+)_([-ATCG]+)/([-ATCG]+)_([^:]+):([0-9]+)')

def make_marker_id(chrom, pos, ref, alt):
    return '{chrom}:{pos}_{ref}/{alt}_{chrom}:{pos}'.format(chrom=chrom, pos=pos, ref=ref, alt=alt)


def round_sig(x, digits):
    return 0 if x==0 else round(x, digits-1-int(math.floor(math.log10(abs(x)))))
assert round_sig(0.00123, 2) == 0.0012
assert round_sig(1.59e-10, 2) == 1.6e-10


def get_phenos_with_colnums(app_root_path):
    with open(os.path.join(app_root_path, 'data/phenos.json')) as f:
        phenos = json.load(f)
    '''
    # We will need something like this for PheWAS, but it's not ready yet.
    with gzip.open(data_dir + '/phewas_maf_gte_1e-2_ncases_gte_20.vcf.gz') as f:
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
    '''
    return phenos


def get_variant(query, phenos, sites_rsids_trie):
    assert False # This isn't ready yet.

    import pysam
    # todo: differentiate between parse errors and variants-not-found
    chrom, pos, ref, alt = parse_variant(query)
    assert None not in [chrom, pos, ref, alt]
    marker_id = make_marker_id(chrom, pos, ref, alt)

    tabix_file = pysam.TabixFile(data_dir + '/phewas_maf_gte_1e-2_ncases_gte_20.vcf.gz')
    tabix_iter = tabix_file.fetch(chrom, pos, pos+1, parser = pysam.asTuple())
    for variant_row in tabix_iter:
        if variant_row[2] == marker_id:
            matching_variant_row = tuple(variant_row)
            break
    else: # didn't break
        return None

    maf = round_sig(float(matching_variant_row[3]), 3)
    assert 0 < maf <= 0.5

    rv = {
        'variant_name': '{} : {:,} {}>{}'.format(chrom, pos, ref, alt),
        'chrom': chrom,
        'pos': pos,
        'ref': ref,
        'alt': alt,
        'maf': maf,
        'phenos': [],
    }

    rsids = sites_rsids_trie.get('{}-{}-{}-{}'.format(chrom, pos, ref, alt))
    # This is a comma-separated string of rsids.  It's almost always just one.
    if rsids is not None:
        assert len(rsids) == 1 # I don't understand why this is a list.
        rv['rsids'] = rsids[0]


    for phewas_code, pheno in phenos.iteritems():
        rv['phenos'].append({
            'phewas_code': phewas_code,
            'phewas_string': pheno['phewas_string'],
            'category_name': pheno['category_string'],
            'num_cases': pheno['num_cases'],
            'num_controls': pheno['num_controls'],
            'pval': float(matching_variant_row[pheno['colnum_pval']]),
            # 'beta': float(matching_variant_row[pheno['colnum_beta']]),
        })

    return rv


def mkdir_p(path):
    # like `mkdir -p`
    try:
        os.makedirs(path)
    except OSError as exc:
        if exc.errno != errno.EEXIST or not os.path.isdir(path):
            raise
