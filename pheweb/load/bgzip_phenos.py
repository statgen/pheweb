
from .. import utils
conf = utils.conf

import os
import multiprocessing
from boltons.fileutils import mkdir_p

echo = utils.get_path('echo')
tabix = utils.get_path('tabix')
bgzip = utils.get_path('bgzip')

tmp_dir = os.path.join(conf.data_dir, 'tmp')
augmented_pheno_dir = os.path.join(conf.data_dir, 'augmented_pheno')
augmented_pheno_gz_dir = os.path.join(conf.data_dir, 'augmented_pheno_gz')

def convert(kwargs):
    src_fname = kwargs['src_fname']
    tmp_fname = kwargs['tmp_fname']
    out_fname = kwargs['out_fname']
    print("{} -> {}".format(src_fname, out_fname))

    utils.run_script('''
    # Tabix expects the header line to start with a '#'
    ('{echo}' -n '#'; cat '{src_fname}') | '{bgzip}' > '{tmp_fname}'
    '''.format(echo=echo, src_fname=src_fname, bgzip=bgzip, tmp_fname=tmp_fname))
    os.rename(tmp_fname, out_fname)

    utils.run_cmd([tabix, '-p', 'vcf', '-f', out_fname])


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
    with multiprocessing.Pool(utils.get_num_procs()) as p:
        p.map(convert, conversions_to_do)
