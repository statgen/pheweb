'''
This script creates generated-by-pheweb/best-of-pheno/<pheno> which contains the strongest 100k associations for the phenotype.
'''

from ..conf_utils import conf
from ..file_utils import VariantFileReader, VariantFileWriter, common_filepaths
from .load_utils import MaxPriorityQueue, parallelize_per_pheno, get_phenos_subset, get_phenolist

import math, argparse


NUM_VARIANTS = 100_000

def run(argv):
    parser = argparse.ArgumentParser(description="Make a file .")
    parser.add_argument('--phenos', help="Can be like '4,5,6,12' or '4-6,12' to run on only the phenos at those positions (0-indexed) in pheno-list.json (and only if they need to run)")
    args = parser.parse_args(argv)

    phenos = get_phenos_subset(args.phenos) if args.phenos else get_phenolist()

    parallelize_per_pheno(
        get_input_filepaths = lambda pheno: common_filepaths['pheno_gz'](pheno['phenocode']),
        get_output_filepaths = lambda pheno: common_filepaths['manhattan'](pheno['phenocode']),
        convert = make_bestof_file,
        cmd = 'best_of_pheno',
        phenos = phenos,
    )


def make_bestof_file(pheno):
    make_bestof_file_explicit(common_filepaths['pheno_gz'](pheno['phenocode']),
                                      common_filepaths['best_of_pheno'](pheno['phenocode']))

def make_bestof_file_explicit(in_filepath, out_filepath):
    q = MaxPriorityQueue()
    with VariantFileReader(in_filepath) as vfr:
        for v in vfr:
            q.add_and_keep_size(v, v['pval'], NUM_VARIANTS)
    assocs = q.pop_all()
    assocs.sort(key=lambda v: (int(v['chrom']), v['pos']))
    with VariantFileWriter(out_filepath) as vfw: vfw.write_all(assocs)
