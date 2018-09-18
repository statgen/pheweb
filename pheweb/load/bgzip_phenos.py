
from ..file_utils import convert_VariantFile_to_IndexedVariantFile, common_filepaths
from .load_utils import parallelize_per_pheno


def run(argv):
    if '-h' in argv or '--help' in argv:
        print('Bgzip each phenotype association file for use in region queries')
        exit(1)

    parallelize_per_pheno(
        get_input_filepaths = lambda pheno: common_filepaths['pheno'](pheno['phenocode']),
        get_output_filepaths = lambda pheno: common_filepaths['pheno_gz'](pheno['phenocode']),
        convert = convert,
        cmd = 'bgzip-phenos',
    )

def convert(pheno):
    convert_VariantFile_to_IndexedVariantFile(
        common_filepaths['pheno'](pheno['phenocode']),
        common_filepaths['pheno_gz'](pheno['phenocode'])
    )
