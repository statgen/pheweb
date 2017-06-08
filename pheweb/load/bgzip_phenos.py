
from ..file_utils import convert_VariantFile_to_IndexedVariantFile
from .load_utils import parallelize_per_pheno


def convert(pheno, src_filepath, dest_filepath):
    convert_VariantFile_to_IndexedVariantFile(src_filepath, dest_filepath)

def run(argv):
    parallelize_per_pheno(
        src='pheno',
        dest='pheno_gz',
        convert=convert,
    )
