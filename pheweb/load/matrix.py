
from ..utils import get_phenolist
from ..file_utils import MatrixReader, get_generated_path, get_tmp_path
from .cffi._x import ffi, lib

import os
import glob
import pysam

sites_fname = get_generated_path('sites/sites.tsv')
augmented_pheno_dir = get_generated_path('augmented_pheno')
matrix_gz_fname = get_generated_path('matrix.tsv.gz')
matrix_gz_tmp_fname = get_tmp_path(matrix_gz_fname)

def should_run():
    cur_phenocodes = set(pheno['phenocode'] for pheno in get_phenolist())

    # Remove files that shouldn't be there (and will confuse the glob in matrixify)
    for fname in glob.glob(os.path.join(augmented_pheno_dir, '*')):
        if os.path.basename(fname) not in cur_phenocodes:
            os.remove(fname)

    if not os.path.exists(matrix_gz_fname): return True

    # check that the current matrix is composed of the correct columns/phenotypes.  If it's changed, rebuild the matrix.
    try:
        matrix_phenocodes = set(MatrixReader().get_phenocodes())
    except:
        return True # if something broke, let's just rebuild the matrix.
    if matrix_phenocodes != cur_phenocodes:
        print('re-running because cur matrix has wrong phenos.')
        print('- phenos in pheno-list.json but not matrix.tsv.gz:', ', '.join(repr(p) for p in cur_phenocodes - matrix_phenocodes))
        print('- phenos in matrix.tsv.gz but not pheno-list.json:', ', '.join(repr(p) for p in matrix_phenocodes - cur_phenocodes))
        return True

    infiles = [os.path.join(augmented_pheno_dir, phenocode) for phenocode in cur_phenocodes] + [sites_fname]
    infile_modtime = max(os.stat(fn).st_mtime for fn in infiles)
    if infile_modtime > os.stat(matrix_gz_fname).st_mtime:
        print('rerunning because some input files are newer than matrix.tsv.gz')
        return True

def run(argv):

    if should_run():
        args = [
            ffi.new('char[]', sites_fname.encode('utf8')),
            ffi.new('char[]', '{}/*'.format(augmented_pheno_dir).encode('utf8')),
            ffi.new('char[]', matrix_gz_tmp_fname.encode('utf8'))
        ]
        lib.cffi_make_matrix(*args)
        os.rename(matrix_gz_tmp_fname, matrix_gz_fname)
        pysam.tabix_index(
            filename=matrix_gz_fname, force=True,
            seq_col=0, start_col=1, end_col=1 # note: these are 0-based, but `/usr/bin/tabix` is 1-based
        )
    else:
        print('matrix is up-to-date!')
