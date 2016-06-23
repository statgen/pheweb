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
    variant_rows = csv.DictReader(f, delimiter='\t')
    for variant_row in variant_rows:
        chrom = variant_row['#CHROM']
        pos = int(variant_row['BEGIN'])
        maf = float(variant_row['MAF'])
        try:
            pval = float(variant_row['PVALUE'])
        except ValueError:
            continue
        chrom2, pos2, ref, alt = parse_marker_id(variant_row['MARKER_ID'])
        assert chrom == chrom2
        assert pos == pos2
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
            pheno_variant = next(pheno_variants)
            while pheno_variant[:4] != site_variant[:4]:
                assert pheno_variant[:4] < site_variant[:4], (pheno_variant, site_variant, pheno_variant[:4] == site_variant[:4])
                pheno_variant = next(pheno_variants)
            writer.writerow({
                'chr': site_variant.chrom,
                'pos': site_variant.chrom,
                'ref': site_variant.chrom,
                'alt': site_variant.chrom,
                'rsids': pheno_variant.chrom,
                'nearest_genes': pheno_variant.pos,
                'maf': site_variant.pos,
                'pval': site_variant.pos,
            })

        os.fsync(f_out.fileno()) # Recommended by <http://stackoverflow.com/a/2333979/1166306>
    print('{}\t{} -> {}'.format(datetime.datetime.now(), src_filename, dest_filename))
    os.rename(tmp_filename, dest_filename)

def extract_pheno_code(path):
    basename = os.path.basename(path)
    return re.match(r'pheno\.([0-9\.]+)\.epacts\.gz', basename).groups()[0]
assert extract_pheno_code('/RESULTS/pheno.705.1/pheno.705.1.epacts.gz') == '705.1'

def get_conversions_to_do():
    src_filenames = glob.glob(epacts_source_filenames_pattern)
    print('number of source files:', len(src_filenames))
    for src_filename in src_filenames:
        pheno_code = extract_pheno_code(src_filename)
        dest_filename = '{}/augmented_pheno/{}'.format(data_dir, pheno_code)
        tmp_filename = '{}/tmp/augmented_pheno-{}'.format(data_dir, pheno_code)
        if not os.path.exists(dest_filename):
            yield {
                'src': src_filename,
                'dest': dest_filename,
                'tmp': tmp_filename,
            }

def mkdir_p(path):
    # like `mkdir -p`
    try:
        os.makedirs(path)
    except OSError as exc:
        if exc.errno != errno.EEXIST or not os.path.isdir(path):
            raise
mkdir_p(data_dir + '/augmented_pheno')
mkdir_p(data_dir + '/tmp')

conversions_to_do = list(get_conversions_to_do())
print('number of conversions to do:', len(conversions_to_do))
p = multiprocessing.Pool(40)
#p.map(convert, conversions_to_do)
# p.map_async(convert, conversions_to_do).get(1e8) # Makes KeyboardInterrupt work
#convert(conversions_to_do[0]) # debugging
print(conversions_to_do[0]); convert(conversions_to_do[0])