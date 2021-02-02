
from ..utils import PheWebError
from ..file_utils import VariantFileReader, VariantFileWriter, common_filepaths, with_chrom_idx, get_tmp_path, convert_VariantFile_to_IndexedVariantFile
from .load_utils import parallelize_per_pheno, get_phenos_subset, get_phenolist

import argparse, os

sites_filepath = common_filepaths['sites']()

def run(argv):
    parser = argparse.ArgumentParser(description="annotate each phenotype by pulling in information from the combined sites file")
    parser.add_argument('--phenos', help="Can be like '4,5,6,12' or '4-6,12' to run on only the phenos at those positions (0-indexed) in pheno-list.json (and only if they need to run)")
    args = parser.parse_args(argv)

    phenos = get_phenos_subset(args.phenos) if args.phenos else get_phenolist()

    parallelize_per_pheno(
        get_input_filepaths = lambda pheno: common_filepaths['parsed'](pheno['phenocode']),
        get_output_filepaths = lambda pheno: common_filepaths['pheno_gz'](pheno['phenocode']),
        convert = convert,
        cmd = 'augment-pheno',
        phenos = phenos,
    )

def convert(pheno):

    pheno_filepath = common_filepaths['pheno_gz'](pheno['phenocode'])
    pheno_unzipped_filepath = get_tmp_path(pheno_filepath)

    with VariantFileReader(sites_filepath) as sites_reader, \
         VariantFileReader(common_filepaths['parsed'](pheno['phenocode'])) as pheno_reader, \
         VariantFileWriter(pheno_unzipped_filepath, use_gzip=False) as writer:
        sites_variants = with_chrom_idx(iter(sites_reader))
        pheno_variants = with_chrom_idx(iter(pheno_reader))

        def write_variant(sites_variant, pheno_variant):
            sites_variant.update(pheno_variant)
            del sites_variant['chrom_idx']
            writer.write(sites_variant)

        try: pheno_variant = next(pheno_variants)
        except StopIteration: raise PheWebError("It appears that the phenotype {!r} has no variants.".format(pheno['phenocode']))
        try: sites_variant = next(sites_variants)
        except StopIteration: raise PheWebError("It appears that your sites file (at {!r}) has no variants.".format(sites_filepath))
        while True:
            cmp = _which_variant_is_bigger(pheno_variant, sites_variant)
            if cmp == 1:
                try: sites_variant = next(sites_variants)
                except StopIteration: break
            elif cmp == 2:
                raise PheWebError(("The file {} contained variant {} which was missing from {}."
                                   "To avoid needless reloading, PheWeb doesn't check the modification timestamp on sites.tsv, so you might need to rebuild it manually using `pheweb sites && pheweb add-rsids && pheweb add-genes").format(
                                       common_filepaths['parsed'](pheno['phenocode']),
                                       pheno_variant,
                                       sites_filepath))
            else: # equal
                write_variant(sites_variant, pheno_variant)
                try:
                    sites_variant = next(sites_variants)
                    pheno_variant = next(pheno_variants)
                except StopIteration: break  # TODO: should this be an exception?

    convert_VariantFile_to_IndexedVariantFile(pheno_unzipped_filepath, pheno_filepath)
    os.unlink(pheno_unzipped_filepath)


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
