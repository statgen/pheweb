
from ..utils import get_phenolist
from ..file_utils import VariantFileReader, VariantFileWriter, get_generated_path
from .read_input_file import PhenoReader
from .load_utils import exception_printer, star_kwargs, get_num_procs

import os
import datetime
import multiprocessing


sites_filename = get_generated_path('sites/sites.tsv')

def _which_variant_is_bigger(v1, v2):
    '''1 means v1 is bigger.  2 means v2 is bigger. 0 means tie.'''
    if v1['chrom_idx'] == v2['chrom_idx']:
        if v1['pos'] == v2['pos']:
            if v1['ref'] == v2['ref']:
                if v1['alt'] == v2['alt']:
                    return 0
                return 1 if v1['alt'] > v2['alt'] else 2
            return 1 if v1['ref'] > v2['ref'] else 2
        return 1 if v1['pos'] > v2['pos'] else 2
    return 1 if v1['chrom_idx'] > v2['chrom_idx'] else 2


@exception_printer
@star_kwargs
def convert(pheno, dest_filename):

    pheno_reader = PhenoReader(pheno, keep_chrom_idx=True)
    pheno_variants = pheno_reader.get_variants()

    with VariantFileReader(sites_filename, chrom_idx=True) as sites_reader, \
         VariantFileWriter(dest_filename) as writer:
        sites_variants = iter(sites_reader)

        def write_variant(sites_variant, pheno_variant):
            sites_variant.update(pheno_variant)
            writer.write(sites_variant)

        try: pheno_variant = next(pheno_variants)
        except: raise Exception("It appears that the phenotype {!r} has no variants.".format(pheno['phenocode']))
        try: sites_variant = next(sites_variants)
        except: raise Exception("It appears that your sites file (at {!r}) has no variants.".format(sites_filename))
        while True:
            cmp = _which_variant_is_bigger(pheno_variant, sites_variant)
            if cmp == 1:
                try: sites_variant = next(sites_variants)
                except StopIteration: break
            elif cmp == 2:
                try: pheno_variant = next(pheno_variants)
                except StopIteration: break
            else: # equal
                # TODO: do I need this?
                del sites_variant['chrom_idx']
                del pheno_variant['chrom_idx']
                write_variant(sites_variant, pheno_variant)
                try:
                    sites_variant = next(sites_variants)
                    pheno_variant = next(pheno_variants)
                except StopIteration: break

    print('{}\t{} -> {}'.format(datetime.datetime.now(), pheno['phenocode'], dest_filename))

def get_conversions_to_do():
    phenos = get_phenolist()
    print('number of phenos:', len(phenos))
    for pheno in phenos:
        dest_filename = get_generated_path('augmented_pheno', pheno['phenocode'])
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
            }

def run(argv):

    conversions_to_do = list(get_conversions_to_do())
    print('number of phenos to process:', len(conversions_to_do))
    with multiprocessing.Pool(get_num_procs()) as p:
        p.map(convert, conversions_to_do)
