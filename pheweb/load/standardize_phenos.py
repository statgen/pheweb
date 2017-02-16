
from .. import utils
conf = utils.conf

input_file_parser = utils.get_assoc_file_parser()

import os
import datetime
import multiprocessing
import csv
from boltons.fileutils import mkdir_p, AtomicSaver


sites_filename = conf.data_dir + '/sites/sites.tsv'

def get_site_variants(sites_filename):
    with open(sites_filename) as f:
        for line in f:
            fields = line.rstrip('\n\r').split('\t')
            chrom = fields[0]
            pos = int(fields[1])
            chrom_idx = utils.chrom_order[chrom]
            yield dict(chrom=chrom, chrom_idx=chrom_idx, pos=pos, ref=fields[2], alt=fields[3], rsids=fields[4], nearest_genes=fields[5])


def write_variant(writer, site_variant, pheno_variant):
    site_variant.update(pheno_variant)
    writer.writerow(site_variant)

def _which_variant_is_bigger(v1, v2):
    # 1 means v1 is bigger.  2 means v2 is bigger. 0 means tie.
    if v1['chrom_idx'] == v2['chrom_idx']:
        if v1['pos'] == v2['pos']:
            if v1['ref'] == v2['ref']:
                if v1['alt'] == v2['alt']:
                    return 0
                return 1 if v1['alt'] > v2['alt'] else 2
            return 1 if v1['ref'] > v2['ref'] else 2
        return 1 if v1['pos'] > v2['pos'] else 2
    return 1 if v1['chrom_idx'] > v2['chrom_idx'] else 2


@utils.exception_printer
@utils.star_kwargs
def convert(pheno, dest_filename, tmp_filename):

    with AtomicSaver(dest_filename, text_mode=True, part_file=tmp_filename, overwrite_part=True) as f_out:

        pheno_fieldnames, pheno_variants = input_file_parser.get_fieldnames_and_variants(pheno, keep_chrom_idx=True)
        site_variants = get_site_variants(sites_filename)

        sites_fieldnames = 'chrom pos ref alt rsids nearest_genes maf pval'.split()
        fieldnames = sites_fieldnames + list(set(pheno_fieldnames) - set(sites_fieldnames))
        writer = csv.DictWriter(f_out, fieldnames=fieldnames, delimiter='\t')
        writer.writeheader()

        try: pheno_variant = next(pheno_variants)
        except: raise Exception("It appears that the phenotype {!r} has no variants.".format(pheno['phenocode']))
        try: site_variant = next(site_variants)
        except: raise Exception("It appears that your sites file (at {!r}) has no variants.".format(sites_filename))
        while True:
            cmp = _which_variant_is_bigger(pheno_variant, site_variant)
            if cmp == 1:
                try: site_variant = next(site_variants)
                except StopIteration: break
            elif cmp == 2:
                try: pheno_variant = next(pheno_variants)
                except StopIteration: break
            else: # equal
                # TODO: do I need this?
                del site_variant['chrom_idx']
                del pheno_variant['chrom_idx']
                write_variant(writer, site_variant, pheno_variant)
                try:
                    site_variant = next(site_variants)
                    pheno_variant = next(pheno_variants)
                except StopIteration: break

    print('{}\t{} -> {}'.format(datetime.datetime.now(), pheno['phenocode'], dest_filename))

def get_conversions_to_do():
    phenos = utils.get_phenolist()
    print('number of phenos:', len(phenos))
    for pheno in phenos:
        dest_filename = '{}/augmented_pheno/{}'.format(conf.data_dir, pheno['phenocode'])
        tmp_filename = '{}/tmp/augmented_pheno-{}'.format(conf.data_dir, pheno['phenocode'])
        should_write_file = not os.path.exists(dest_filename)
        if not should_write_file:
            dest_file_mtime = os.stat(dest_filename).st_mtime
            src_file_mtimes = [os.stat(fname).st_mtime for fname in pheno['assoc_files']]
            src_file_mtimes.append(os.stat(sites_filename).st_mtime)
            if dest_file_mtime < max(src_file_mtimes):
                should_write_file = True
        if should_write_file:
            yield {
                'pheno': pheno,
                'dest_filename': dest_filename,
                'tmp_filename': tmp_filename,
            }

def run(argv):

    mkdir_p(conf.data_dir + '/augmented_pheno')
    mkdir_p(conf.data_dir + '/tmp')

    conversions_to_do = list(get_conversions_to_do())
    print('number of phenos to process:', len(conversions_to_do))
    with multiprocessing.Pool(utils.get_num_procs()) as p:
        p.map(convert, conversions_to_do)
