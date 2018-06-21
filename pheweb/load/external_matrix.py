from .cffi._x import ffi, lib

import os
import glob
import pysam
import argparse



def run(argv):
'''
    This module generates matrix from external single association results for fast access to browsingself.
    First parameter should be a path to configuration file with 5 colums:
        1: phenotype name which matches FINNGEN phenotypes
        2: free form phenotype text
        3:  N_cases
        4:  n_controls
        5: path to result file with columns: chr,pos,ref,alt,beta,p-value
    Second parameter should be a path to (empty/not existing) directory where the data should be stored
'''
        parser = argparse.ArgumentParser(description="Create tabixed big matrix for external results")
        parser.add_argument('config_gile', action='store', type=str, help='Configuration file ')
        parser.add_argument('path_to_res', action='store', type=str, help='path to empty/non-existent directory where the results will be saved')

        args = parser.parse_args()


        
        args = [
            ffi.new('char[]', sites_filepath.encode('utf8')),
            ffi.new('char[]', common_filepaths['pheno']('*').encode('utf8')),
            ffi.new('char[]', matrix_gz_tmp_filepath.encode('utf8'))
        ]
        #lib.cffi_make_matrix(*args)
        #os.rename(matrix_gz_tmp_filepath, matrix_gz_filepath)
        #pysam.tabix_index(
        #    filename=matrix_gz_filepath, force=True,
        #    seq_col=0, start_col=1, end_col=1 # note: these are 0-based, but `/usr/bin/tabix` is 1-based
        #)
