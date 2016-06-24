#!/usr/bin/env python2

'''
Timing:
- 275: convert
  - 205: get_pheno_variants
    - 61: parse_marker_id
      - 39: re.match (14: re.compile)
  - 13: get_site_variants
  - 27: csv.DictWriter.writerow
    - 14: _dict_to_list
- 49: gzip.readline
'''

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
from utils import round_sig, parse_marker_id, mkdir_p


import gzip
import glob
import re
import datetime
import multiprocessing
import csv
import collections
import errno

sites_filename = data_dir + '/sites/sites.tsv'

Pheno_Variant = collections.namedtuple('Pheno_Variant', ['chrom', 'pos', 'ref', 'alt', 'pval', 'maf'])
def get_pheno_variants(f):
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
        pval = fields[PVAL_COL]
        try:
            pval = float(pval)
        except ValueError:
            pval = '.'
        chrom2, pos2, ref, alt = parse_marker_id(fields[MARKER_ID_COL])
        assert chrom == chrom2, fields
        assert pos == pos2, (fields, pos, pos2)
        yield Pheno_Variant(chrom=chrom, pos=pos, ref=ref, alt=alt, pval=pval, maf=maf)

Site_Variant = collections.namedtuple('Site_Variant', ['chrom', 'pos', 'ref', 'alt', 'rsids', 'nearest_genes'])
def get_site_variants(f):
    for line in f:
        fields = line.rstrip('\n\r').split('\t')
        chrom = fields[0]
        pos = int(fields[1])
        yield Site_Variant(chrom=chrom, pos=pos, ref=fields[2], alt=fields[3], rsids=fields[4], nearest_genes=fields[5])


def convert(conversion_to_do):
    src_filename = conversion_to_do['src']
    dest_filename = conversion_to_do['dest']
    tmp_filename = conversion_to_do['tmp']
    assert not os.path.exists(dest_filename), dest_filename

    # Avoid getting killed while writing dest_filename, to stay idempotent despite me frequently killing the program
    with gzip.open(src_filename) as f_in, \
         open(sites_filename) as f_sites, \
         open(tmp_filename, 'w') as f_out:

        pheno_variants = get_pheno_variants(f_in)
        site_variants = get_site_variants(f_sites)

        writer = csv.DictWriter(f_out, fieldnames='chr pos ref alt rsids nearest_genes maf pval'.split(), delimiter='\t')
        writer.writeheader()
        for site_variant in site_variants:
            try:
                pheno_variant = next(pheno_variants)
                while pheno_variant[:4] != site_variant[:4]:
                    # Note that it might have the same chr:pos but different alt
                    assert pheno_variant[0] != site_variant[0] or pheno_variant[1] <= site_variant[1], (pheno_variant, site_variant)
                    pheno_variant = next(pheno_variants)
            except StopIteration:
                print("reached end of pheno_variants for file {} with site_variant {} and last pheno_variant {}".format(src_filename, site_variant, pheno_variant))
                raise
            else:
                writer.writerow({
                    'chr': site_variant.chrom,
                    'pos': site_variant.pos,
                    'ref': site_variant.ref,
                    'alt': site_variant.alt,
                    'rsids': site_variant.rsids,
                    'nearest_genes': site_variant.nearest_genes,
                    'maf': pheno_variant.maf,
                    'pval': pheno_variant.pval,
                })

        os.fsync(f_out.fileno()) # Recommended by <http://stackoverflow.com/a/2333979/1166306>
    print('{}\t{} -> {}'.format(datetime.datetime.now(), src_filename, dest_filename))
    os.rename(tmp_filename, dest_filename)

def extract_pheno_code(path):
    basename = os.path.basename(path)
    return re.match(r'pheno\.([0-9\.]+)\.epacts\.gz', basename).groups()[0]
assert extract_pheno_code('/RESULTS/pheno.705.1/pheno.705.1.epacts.gz') == '705.1'


bad_src_filenames = ['/net/fantasia/home/schellen/PheWAS/epacts/RESULTS/pheno.{0}/pheno.{0}.epacts.gz'.format(pheno_code) for pheno_code in ['350.6', '350.3', '769']]
def get_conversions_to_do():
    src_filenames = glob.glob(epacts_source_filenames_pattern)
    print('number of source files:', len(src_filenames))
    for src_filename in src_filenames:
        pheno_code = extract_pheno_code(src_filename)
        dest_filename = '{}/augmented_pheno/{}'.format(data_dir, pheno_code)
        tmp_filename = '{}/tmp/augmented_pheno-{}'.format(data_dir, pheno_code)
        if not os.path.exists(dest_filename) and src_filename not in bad_src_filenames:
            yield {
                'src': src_filename,
                'dest': dest_filename,
                'tmp': tmp_filename,
            }

mkdir_p(data_dir + '/augmented_pheno')
mkdir_p(data_dir + '/tmp')

conversions_to_do = list(get_conversions_to_do())
print('number of conversions to do:', len(conversions_to_do))
num_processes = multiprocessing.cpu_count() * 3//4 + 1
p = multiprocessing.Pool(num_processes)
# p.map(convert, conversions_to_do) # I think KeyboardInterrupt fails to stop this.
p.map_async(convert, conversions_to_do).get(1e8) # Makes KeyboardInterrupt work
# print(conversions_to_do[0]); convert(conversions_to_do[0])
