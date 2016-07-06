#!/usr/bin/env python2

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
from utils import round_sig, parse_marker_id, mkdir_p


import gzip
import datetime
import multiprocessing
import csv
import collections


Variant = collections.namedtuple('Variant', ['chrom', 'pos', 'ref', 'alt', 'pval', 'maf'])
def parse_variant_rows(f):
    variant_rows = csv.DictReader(f, delimiter='\t')
    for variant_row in variant_rows:
        chrom = variant_row['#CHROM']
        pos = int(variant_row['BEGIN'])
        maf = float(variant_row['MAF'])
        if maf < conf.minimum_maf:
            continue
        try:
            pval = float(variant_row['PVALUE'])
        except ValueError:
            continue
        chrom2, pos2, ref, alt = parse_marker_id(variant_row['MARKER_ID'])
        assert chrom == chrom2
        assert pos == pos2
        yield Variant(chrom=chrom, pos=pos, ref=ref, alt=alt, pval=pval, maf=maf)


def convert(conversion_to_do):
    src_filename = conversion_to_do['src']
    dest_filename = conversion_to_do['dest']
    tmp_filename = conversion_to_do['tmp']
    assert not os.path.exists(dest_filename), dest_filename

    # Avoid getting killed while writing dest_filename, to stay idempotent despite me frequently killing the program
    with gzip.open(src_filename) as f_in, \
         open(tmp_filename, 'w') as f_out:

        variants = parse_variant_rows(f_in)

        writer = csv.DictWriter(f_out, fieldnames='chr pos ref alt maf'.split(), delimiter='\t')
        writer.writeheader()
        for v in variants:
            writer.writerow({
                'chr': v.chrom,
                'pos': v.pos,
                'ref': v.ref,
                'alt': v.alt,
                'maf': v.maf,
            })

        os.fsync(f_out.fileno()) # Recommended by <http://stackoverflow.com/a/2333979/1166306>
    print('{}\t{} -> {}'.format(datetime.datetime.now(), src_filename, dest_filename))
    os.rename(tmp_filename, dest_filename)

def get_conversions_to_do():
    with open(conf.data_dir + '/phenos.csv') as f:
        phenos = list(csv.DictReader(f))
    print('number of source files:', len(phenos))
    for pheno in phenos:
        dest_filename = '{}/pheno/{}'.format(conf.data_dir, pheno['pheno_code'])
        tmp_filename = '{}/tmp/pheno-{}'.format(conf.data_dir, pheno['pheno_code'])
        if not os.path.exists(dest_filename):
            yield {
                'src': pheno['src_filename'],
                'dest': dest_filename,
                'tmp': tmp_filename,
            }

mkdir_p(conf.data_dir + '/pheno')
mkdir_p(conf.data_dir + '/tmp')

conversions_to_do = list(get_conversions_to_do())
print('number of conversions to do:', len(conversions_to_do))
p = multiprocessing.Pool(40)
#p.map(convert, conversions_to_do)
p.map_async(convert, conversions_to_do).get(1e8) # Makes KeyboardInterrupt work
#convert(conversions_to_do[0]) # debugging
