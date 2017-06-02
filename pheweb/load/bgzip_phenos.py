
from ..utils import get_phenolist
from ..file_utils import common_filepaths, convert_VariantFile_to_IndexedVariantFile
from .load_utils import star_kwargs, exception_printer, parallelize

import os


@exception_printer
@star_kwargs
def convert(src_filepath, out_filepath):
    convert_VariantFile_to_IndexedVariantFile(src_filepath, out_filepath)

def get_conversions_to_do():
    phenocodes = [pheno['phenocode'] for pheno in get_phenolist()]
    for phenocode in phenocodes:
        src_filepath = common_filepaths['pheno'](phenocode)
        out_filepath = common_filepaths['pheno_gz'](phenocode)
        tbi_filepath = out_filepath + '.tbi'
        if not os.path.exists(out_filepath) or not os.path.exists(tbi_filepath) or \
           os.stat(src_filepath).st_mtime > min(os.stat(out_filepath).st_mtime, os.stat(tbi_filepath).st_mtime):
            yield {
                'src_filepath': src_filepath,
                'out_filepath': out_filepath,
            }

def run(argv):
    conversions_to_do = list(get_conversions_to_do())
    print('number of phenos to process:', len(conversions_to_do))
    parallelize(conversions_to_do, do_task=convert, tqdm_desc='Bgzipping phenos')
