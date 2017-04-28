

from ...utils import conf, get_phenolist
from ...file_utils import MatrixReader
from ..load_utils import get_path, run_cmd

import os
import glob

from pheweb.load.matrix._matrixify import ffi, lib
tabix = get_path('tabix')

my_dir = os.path.dirname(os.path.abspath(__file__))
sites_fname = os.path.join(conf.data_dir, 'sites', 'sites.tsv')
augmented_pheno_dir = os.path.join(conf.data_dir, 'augmented_pheno')
matrix_gz_tmp_fname = os.path.join(conf.data_dir, 'tmp', 'matrix.tsv.gz')
matrix_gz_fname = os.path.join(conf.data_dir, 'matrix.tsv.gz')

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
        lib.cffi_run(*args)
        os.rename(matrix_gz_tmp_fname, matrix_gz_fname)
        run_cmd([tabix, '-f', '-s1', '-b2', '-e2', matrix_gz_fname]) # TODO: pysam.tabix_index()
    else:
        print('matrix is up-to-date!')
