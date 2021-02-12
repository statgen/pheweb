
# TODO: Parallelize by chromosome.
#  Spawn a pheweb process to do each chromosome.  Each one must do:
#  + For every `pheno_gz/*.gz` and `sites/sites.tsv`, find the byte offset to the block that begins our chromosome.
#  + Now cffi down into a function just like our normal one, but which starts at that offset, discards variants until it hits the target chromosome, merges, and then exits.
#  + Don't append an empty block in `BgzipWriter:close()`.
#  When all the child processes are done, the main thread needs to concatenate all the single-chrom matrix files and then append an empty bgzip block to signal EOF.


from ..utils import get_phenolist, PheWebError
from ..file_utils import MatrixReader, get_tmp_path, get_filepath, get_pheno_filepath
from .load_utils import mtime
from .cffi._x import ffi, lib

import os
import glob
import pysam
from typing import List


def clear_out_junk() -> None:
    # Remove files that shouldn't be there (and will confuse the glob in matrixify)
    cur_phenocodes = set(pheno['phenocode'] for pheno in get_phenolist())
    for filepath in glob.glob(get_filepath('pheno_gz')+'/*.gz'):
        name = os.path.basename(filepath)
        if name[:-3] not in cur_phenocodes:
            print("Removing {} to help matrix glob".format(filepath))
            os.remove(filepath)

def should_run() -> bool:
    sites_filepath = get_filepath('sites')
    matrix_gz_filepath = get_filepath('matrix', must_exist=False)

    if not os.path.exists(matrix_gz_filepath): return True

    # If the matrix's columns don't match the phenos in pheno-list, rebuild.
    cur_phenocodes = set(pheno['phenocode'] for pheno in get_phenolist())
    try:
        matrix_phenocodes = set(MatrixReader().get_phenocodes())
    except Exception:
        return True # if something broke, let's just rebuild the matrix.
    if matrix_phenocodes != cur_phenocodes:
        print('re-running because cur matrix has wrong phenos.')
        print('- phenos in pheno-list.json but not matrix.tsv.gz:', ', '.join(repr(p) for p in cur_phenocodes - matrix_phenocodes))
        print('- phenos in matrix.tsv.gz but not pheno-list.json:', ', '.join(repr(p) for p in matrix_phenocodes - cur_phenocodes))
        return True

    # If pheno_gz or sites.tsv are newer than matrix, rebuild.
    infilepaths = [get_pheno_filepath('pheno_gz', phenocode) for phenocode in cur_phenocodes] + [sites_filepath]
    infile_modtime = max(mtime(filepath) for filepath in infilepaths)
    if infile_modtime > mtime(matrix_gz_filepath):
        print('rerunning because some input files are newer than matrix.tsv.gz')
        return True

    return False

def run(argv:List[str]) -> None:

    if '-h' in argv or '--help' in argv:
        print('Make a single large tabixed file of all phenotypes data')
        exit(1)

    matrix_gz_filepath = get_filepath('matrix', must_exist=False)
    if should_run():
        clear_out_junk()

        sites_filepath = get_filepath('sites')
        pheno_gz_glob = get_filepath('pheno_gz')+'/*.gz'
        matrix_gz_tmp_filepath = get_tmp_path(matrix_gz_filepath)

        # we don't need `ffi.new('char[]', ...)` because args are `const`
        ret = lib.cffi_make_matrix(sites_filepath.encode('utf8'),
                                   pheno_gz_glob.encode('utf8'),
                                   matrix_gz_tmp_filepath.encode('utf8'))
        ret_bytes = ffi.string(ret, maxlen=1000)
        if ret_bytes != b'ok':
            raise PheWebError('The portion of `pheweb matrix` written in c++/cffi failed with the message ' + repr(ret_bytes))
        os.rename(matrix_gz_tmp_filepath, matrix_gz_filepath)
    else:
        print('matrix is up-to-date!')

    matrix_tbi_filepath = matrix_gz_filepath + '.tbi'
    if not os.path.exists(matrix_tbi_filepath) or mtime(matrix_tbi_filepath) < mtime(matrix_gz_filepath):
        print('tabixing matrix')
        pysam.tabix_index(
            filename=matrix_gz_filepath, force=True,
            seq_col=0, start_col=1, end_col=1 # note: column indexes start at 0, whereas `/usr/bin/tabix` starts at 1
        )
    else:
        print('matrix.tbi is up-to-date!')
