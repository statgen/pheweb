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

utils = imp.load_source('utils', os.path.join(my_dir, '../utils.py'))
input_file_parser = imp.load_source('input_file_parser', os.path.join(my_dir, 'input_file_parsers/{}.py'.format(conf.source_file_parser)))

import gzip
import datetime
import multiprocessing
import csv
import json
import collections

sites_filename = conf.data_dir + '/sites/sites.tsv'

Site_Variant = collections.namedtuple('Site_Variant', ['chrom', 'pos', 'ref', 'alt', 'rsids', 'nearest_genes'])
def get_site_variants(f):
    for line in f:
        fields = line.rstrip('\n\r').split('\t')
        chrom = fields[0]
        pos = int(fields[1])
        yield Site_Variant(chrom=chrom, pos=pos, ref=fields[2], alt=fields[3], rsids=fields[4], nearest_genes=fields[5])


def write_variant(writer, site_variant, pheno_variant):
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

def convert(conversion_to_do):
    # Use tmp_filename to avoid getting killed while writing dest_filename, to stay idempotent despite me frequently killing the program
    src_filename = conversion_to_do['src']
    dest_filename = conversion_to_do['dest']
    tmp_filename = conversion_to_do['tmp']
    assert not os.path.exists(dest_filename), dest_filename
    _convert(src_filename, tmp_filename)
    print('{}\t{} -> {}'.format(datetime.datetime.now(), src_filename, dest_filename))
    os.rename(tmp_filename, dest_filename)

def _convert(src_filename, out_filename):
    with gzip.open(src_filename) as f_in, \
         open(sites_filename) as f_sites, \
         open(out_filename, 'w') as f_out:

        pheno_variants = input_file_parser.get_variants(f_in)
        site_variants = get_site_variants(f_sites)

        writer = csv.DictWriter(f_out, fieldnames='chr pos ref alt rsids nearest_genes maf pval'.split(), delimiter='\t')
        writer.writeheader()

        # Print out each site_variant along with some info from a pheno_variant that matches it.
        # We're assuming that every site_variant has a matching pheno_variant.
        chroms_seen_before = set()
        site_variant = next(site_variants)
        pheno_variant = next(pheno_variants)
        while True:
            # Get pheno_variant onto the same chromosome as site_variant
            if site_variant[0] not in chroms_seen_before:
                while pheno_variant[0] != site_variant[0]:
                    assert pheno_variant[0] in chroms_seen_before
                    pheno_variant = next(pheno_variants)
                chroms_seen_before.add(site_variant[0])
            assert site_variant[0] == pheno_variant[0]

            # Catch pheno_variant up to the position of site_variant
            while pheno_variant[1] < site_variant[1]:
                pheno_variant = next(pheno_variants)
            assert site_variant[:2] == pheno_variant[:2], 'pheno_variant[:2] ({}) != site_variant[:2] ({}) in {}'.format(pheno_variant, site_variant, conversion_to_do)

            # If it's a perfect match, just print and advance both.
            if pheno_variant[:4] == site_variant[:4]:
                write_variant(writer, site_variant, pheno_variant)
                try:
                    site_variant = next(site_variants)
                except StopIteration:
                    return
                pheno_variant = next(pheno_variants)

            # If the alternate allele doesn't match, then it's a multi-allelic variant in the wrong order
            else:
                current_chr_pos = site_variant[:2]

                # Gather up all the pheno_variants at this position
                pheno_variants_at_current_pos = [pheno_variant]
                while True:
                    try:
                        pheno_variant = next(pheno_variants)
                    except StopIteration:
                        break
                    if pheno_variant[:2] == current_chr_pos:
                        pheno_variants_at_current_pos.append(pheno_variant)
                    else:
                        break

                # For each site_variant at this position, write out with the matching pheno_variant.
                while True:
                    matches = [v for v in pheno_variants_at_current_pos if v[:4] == site_variant[:4]]
                    assert len(matches) == 1
                    write_variant(writer, site_variant, matches[0])
                    try:
                        site_variant = next(site_variants)
                    except StopIteration:
                        return
                    if site_variant[:2] != current_chr_pos:
                        break

        os.fsync(f_out.fileno()) # Recommended by <http://stackoverflow.com/a/2333979/1166306>

def get_conversions_to_do():
    with open(my_dir + '/phenos.json') as f:
        phenos = json.load(f)
    print('number of source files:', len(phenos))
    for pheno in phenos.values():
        dest_filename = '{}/augmented_pheno/{}'.format(conf.data_dir, pheno['pheno_code'])
        tmp_filename = '{}/tmp/augmented_pheno-{}'.format(conf.data_dir, pheno['pheno_code'])
        if not os.path.exists(dest_filename):
            yield {
                'src': pheno['src_filename'],
                'dest': dest_filename,
                'tmp': tmp_filename,
            }

utils.mkdir_p(conf.data_dir + '/augmented_pheno')
utils.mkdir_p(conf.data_dir + '/tmp')

# # debug
# convert(list(get_conversions_to_do())[0])
# exit(0)

conversions_to_do = list(get_conversions_to_do())
print('number of conversions to do:', len(conversions_to_do))
num_processes = multiprocessing.cpu_count() * 3//4 + 1
p = multiprocessing.Pool(num_processes)
# p.map(convert, conversions_to_do) # I think KeyboardInterrupt fails to stop this.
p.map_async(convert, conversions_to_do).get(1e8) # Makes KeyboardInterrupt work
# print(conversions_to_do[0]); convert(conversions_to_do[0])
