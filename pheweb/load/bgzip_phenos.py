
from ..utils import conf
from .load_utils import get_num_procs, star_kwargs, exception_printer
from .cffi._x import ffi, lib

import os
import multiprocessing
import pysam
from boltons.fileutils import mkdir_p


tmp_dir = os.path.join(conf.data_dir, 'tmp')
augmented_pheno_dir = os.path.join(conf.data_dir, 'augmented_pheno')
augmented_pheno_gz_dir = os.path.join(conf.data_dir, 'augmented_pheno_gz')

@exception_printer
@star_kwargs
def convert(src_fname, tmp_fname, out_fname):
    print("{} -> {}".format(src_fname, out_fname))

    args = [
        ffi.new('char[]', src_fname.encode('utf8')),
        ffi.new('char[]', tmp_fname.encode('utf8')),
        ffi.new('char[]', b'#'),
    ]
    lib.cffi_bgzip_file(*args)
    os.rename(tmp_fname, out_fname)

    pysam.tabix_index(
        filename=out_fname, force=True,
        seq_col=0, start_col=1, end_col=1 # note: these are 0-based, but `/usr/bin/tabix` is 1-based
    )


def get_conversions_to_do():
    for fname in os.listdir(augmented_pheno_dir):
        src_fname = os.path.join(augmented_pheno_dir, fname)
        tmp_fname = os.path.join(tmp_dir, 'augmented_pheno_gz-{}.gz'.format(fname))
        out_fname = os.path.join(augmented_pheno_gz_dir, '{}.gz'.format(fname))
        tbi_fname = os.path.join(augmented_pheno_gz_dir, '{}.gz.tbi'.format(fname))
        if not os.path.exists(out_fname) or not os.path.exists(tbi_fname) or \
           os.stat(src_fname).st_mtime > min(os.stat(out_fname).st_mtime, os.stat(tbi_fname).st_mtime):
            yield {
                'src_fname': src_fname,
                'tmp_fname': tmp_fname,
                'out_fname': out_fname,
            }

def run(argv):

    mkdir_p(augmented_pheno_gz_dir)

    conversions_to_do = list(get_conversions_to_do())
    print('number of phenos to process:', len(conversions_to_do))
    with multiprocessing.Pool(get_num_procs()) as p:
        p.map(convert, conversions_to_do)
