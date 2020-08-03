
from ..utils import get_phenolist, PheWebError
from ..file_utils import MatrixReader, get_tmp_path, common_filepaths, VariantFileReader
from .cffi._x import ffi, lib

import os
import glob
import pysam

sites_filepath = common_filepaths['sites']()
matrix_gz_filepath = common_filepaths['matrix']()
matrix_gz_tmp_filepath = get_tmp_path(matrix_gz_filepath)

def should_run():
    cur_phenocodes = set(pheno['phenocode'] for pheno in get_phenolist())

    # Remove files that shouldn't be there (and will confuse the glob in matrixify)
    for filepath in glob.glob(common_filepaths['pheno']('*')):
        if os.path.basename(filepath) not in cur_phenocodes:
            os.remove(filepath)

    if not os.path.exists(matrix_gz_filepath): return True

    # check that the current matrix is composed of the correct columns/phenotypes.  If it's changed, rebuild the matrix.
    try:
        matrix_phenocodes = set(MatrixReader().get_phenocodes())
    except Exception:
        return True # if something broke, let's just rebuild the matrix.
    if matrix_phenocodes != cur_phenocodes:
        print('re-running because cur matrix has wrong phenos.')
        print('- phenos in pheno-list.json but not matrix.tsv.gz:', ', '.join(repr(p) for p in cur_phenocodes - matrix_phenocodes))
        print('- phenos in matrix.tsv.gz but not pheno-list.json:', ', '.join(repr(p) for p in matrix_phenocodes - cur_phenocodes))
        return True

    infilepaths = [common_filepaths['pheno'](phenocode) for phenocode in cur_phenocodes] + [sites_filepath]
    infile_modtime = max(os.stat(filepath).st_mtime for filepath in infilepaths)
    if infile_modtime > os.stat(matrix_gz_filepath).st_mtime:
        print('rerunning because some input files are newer than matrix.tsv.gz')
        return True

def make_matrix_for_chromosome(chrom, output_filepath):
    sites_filepath = common_filepaths['sites']()
    sites_byte_offset = get_byte_offset(chrom, sites_filepath)
    print(sites_byte_offset, chrom, sites_filepath)
    for pheno in get_phenolist():
        filepath = common_filepaths['pheno'](pheno['phenocode'])
        byte_offset = get_byte_offset(chrom, filepath)
        print(byte_offset, chrom, filepath)
    # TODO: Run a method like `lib.cffi_make_matrix()` with byte-offsets

def get_byte_offset(chrom, filepath):
    # TODO: Get byte-offset of `\n{chrom}\t` in `filepath`.
    return 0


def run(argv):

    if '-h' in argv or '--help' in argv:
        print('Make a single large tabixed file of all phenotypes data')
        exit(1)

    if should_run():
        chromosomes_to_run = []
        sites_filepath = common_filepaths['sites']()
        with VariantFileReader(sites_filepath) as sites_reader:
            for variant in sites_reader:
                if variant['chrom'] not in chromosomes_to_run:
                    chromosomes_to_run.append(variant['chrom'])

        output_filepaths = {chrom: get_tmp_path(chrom) for chrom in chromosomes_to_run}

        # TODO: run using multiprocessing
        for chrom, output_filepath in output_filepaths.items():
            make_matrix_for_chromosome(chrom, output_filepath)

        # TODO: concatenate all partial files, append empty bgzip block, and `pysam.tabix_index()`


        # # we don't need `ffi.new('char[]', ...)` because args are `const`
        # ret = lib.cffi_make_matrix(sites_filepath.encode('utf8'),
        #                            common_filepaths['pheno']('*').encode('utf8'),
        #                            matrix_gz_tmp_filepath.encode('utf8'))
        # ret_bytes = ffi.string(ret, maxlen=1000)
        # if ret_bytes != b'ok':
        #     raise PheWebError('The portion of `pheweb matrix` written in c++/cffi failed with the message ' + repr(ret_bytes))
        # os.rename(matrix_gz_tmp_filepath, matrix_gz_filepath)
        # pysam.tabix_index(
        #     filename=matrix_gz_filepath, force=True,
        #     seq_col=0, start_col=1, end_col=1 # note: these are 0-based, but `/usr/bin/tabix` is 1-based
    else:
        print('matrix is up-to-date!')
