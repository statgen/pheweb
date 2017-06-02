
from ..utils import get_phenolist
from ..file_utils import VariantFileReader, VariantFileWriter, common_filepaths, with_chrom_idx
from .load_utils import exception_printer, star_kwargs, parallelize

import os


sites_filepath = common_filepaths['sites']

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
def convert(phenocode, src_filepath, dest_filepath):

    with VariantFileReader(sites_filepath) as sites_reader, \
         VariantFileReader(src_filepath) as pheno_reader, \
         VariantFileWriter(dest_filepath) as writer:
        sites_variants = with_chrom_idx(iter(sites_reader))
        pheno_variants = with_chrom_idx(iter(pheno_reader))

        def write_variant(sites_variant, pheno_variant):
            sites_variant.update(pheno_variant)
            writer.write(sites_variant)

        try: pheno_variant = next(pheno_variants)
        except: raise Exception("It appears that the phenotype {!r} has no variants.".format(phenocode))
        try: sites_variant = next(sites_variants)
        except: raise Exception("It appears that your sites file (at {!r}) has no variants.".format(sites_filepath))
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


def get_conversions_to_do():
    phenos = get_phenolist()
    print('number of phenos:', len(phenos))
    for pheno in phenos:
        src_filepath = common_filepaths['parsed'](pheno['phenocode'])
        dest_filepath = common_filepaths['pheno'](pheno['phenocode'])
        should_write_file = not os.path.exists(dest_filepath)
        if not should_write_file:
            dest_file_mtime = os.stat(dest_filepath).st_mtime
            src_file_mtimes = [os.stat(src_filepath).st_mtime,
                               os.stat(sites_filepath).st_mtime]
            if dest_file_mtime < max(src_file_mtimes):
                should_write_file = True
        if should_write_file:
            yield {
                'phenocode': pheno['phenocode'],
                'src_filepath': src_filepath,
                'dest_filepath': dest_filepath,
            }

def run(argv):

    conversions_to_do = list(get_conversions_to_do())
    print('number of phenos to process:', len(conversions_to_do))

    parallelize(conversions_to_do, do_task=convert, tqdm_desc='Annotating phenos')
