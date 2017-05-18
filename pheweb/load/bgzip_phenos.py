
from ..utils import get_phenolist
from ..file_utils import get_generated_path, convert_VariantFile_to_IndexedVariantFile
from .load_utils import get_num_procs, star_kwargs, exception_printer

import os
import multiprocessing


@exception_printer
@star_kwargs
def convert(src_fname, out_fname):
    print("{} -> {}".format(src_fname, out_fname))
    convert_VariantFile_to_IndexedVariantFile(src_fname, out_fname)

def get_conversions_to_do():
    phenocodes = [pheno['phenocode'] for pheno in get_phenolist()]
    for phenocode in phenocodes:
        src_fname = get_generated_path('augmented_pheno', phenocode)
        out_fname = get_generated_path('augmented_pheno_gz', '{}.gz'.format(phenocode))
        tbi_fname = out_fname + '.tbi'
        if not os.path.exists(out_fname) or not os.path.exists(tbi_fname) or \
           os.stat(src_fname).st_mtime > min(os.stat(out_fname).st_mtime, os.stat(tbi_fname).st_mtime):
            yield {
                'src_fname': src_fname,
                'out_fname': out_fname,
            }

def run(argv):
    conversions_to_do = list(get_conversions_to_do())
    print('number of phenos to process:', len(conversions_to_do))
    with multiprocessing.Pool(get_num_procs()) as p:
        p.map(convert, conversions_to_do)
