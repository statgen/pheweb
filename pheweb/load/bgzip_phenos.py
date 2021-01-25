
from ..file_utils import convert_VariantFile_to_IndexedVariantFile, common_filepaths
from .load_utils import parallelize_per_pheno, get_phenolist, get_phenos_subset

import argparse


def run(argv):
    parser = argparse.ArgumentParser(description="Bgzip each phenotype association file for use in region queries")
    parser.add_argument('--phenos', help="Can be like '4,5,6,12' or '4-6,12' to run on only the phenos at those positions (0-indexed) in pheno-list.json (and only if they need to run)")
    args = parser.parse_args(argv)

    phenos = get_phenos_subset(args.phenos) if args.phenos else get_phenolist()

    parallelize_per_pheno(
        get_input_filepaths = lambda pheno: common_filepaths['pheno'](pheno['phenocode']),
        get_output_filepaths = lambda pheno: common_filepaths['pheno_gz'](pheno['phenocode']),
        convert = convert,
        cmd = 'bgzip-phenos',
        phenos = phenos,
    )

def convert(pheno):
    convert_VariantFile_to_IndexedVariantFile(
        common_filepaths['pheno'](pheno['phenocode']),
        common_filepaths['pheno_gz'](pheno['phenocode'])
    )
