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
from utils import round_sig, parse_marker_id, mkdir_p


import gzip
import glob
import re
import datetime
import multiprocessing
import csv
import collections
import errno


Variant = collections.namedtuple('Variant', ['chrom', 'pos', 'ref', 'alt', 'pval', 'maf'])
def parse_variant_rows(f):
    variant_rows = csv.DictReader(f, delimiter='\t')
    for variant_row in variant_rows:
        chrom = variant_row['#CHROM']
        pos = int(variant_row['BEGIN'])
        maf = float(variant_row['MAF'])
        if maf < .01:
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

def extract_pheno_code(path):
    basename = os.path.basename(path)
    return re.match(r'pheno\.([0-9\.]+)\.epacts\.gz', basename).groups()[0]
assert extract_pheno_code('/RESULTS/pheno.705.1/pheno.705.1.epacts.gz') == '705.1'

def get_conversions_to_do():
    src_filenames = glob.glob(epacts_source_filenames_pattern)
    print('number of source files:', len(src_filenames))
    for src_filename in src_filenames:
        pheno_code = extract_pheno_code(src_filename)
        dest_filename = '{}/pheno/{}'.format(data_dir, pheno_code)
        tmp_filename = '{}/tmp/pheno-{}'.format(data_dir, pheno_code)
        if not os.path.exists(dest_filename):
            yield {
                'src': src_filename,
                'dest': dest_filename,
                'tmp': tmp_filename,
            }

mkdir_p(data_dir + '/pheno')
mkdir_p(data_dir + '/tmp')

conversions_to_do = list(get_conversions_to_do())
print('number of conversions to do:', len(conversions_to_do))
p = multiprocessing.Pool(40)
#p.map(convert, conversions_to_do)
p.map_async(convert, conversions_to_do).get(1e8) # Makes KeyboardInterrupt work
#convert(conversions_to_do[0]) # debugging
