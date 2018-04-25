
from ..file_utils import get_generated_path, make_basedir, get_tmp_path, dbsnp_version, common_filepaths
from .load_utils import run_script

import os
import wget

raw_filepath = get_generated_path('sites/dbSNP/dbsnp-b{}-GRCh37.gz'.format(dbsnp_version))
clean_filepath = common_filepaths['rsids']

def run(argv):
    if not os.path.exists(clean_filepath):
        print('dbsnp will be stored at {!r}'.format(clean_filepath))
        if not os.path.exists(raw_filepath):

            # dbSNP downloads are described at <https://www.ncbi.nlm.nih.gov/variation/docs/human_variation_vcf/>
            # This file includes chr-pos-ref-alt-rsid and 4X a bunch of useless columns:
            dbsnp_url = 'ftp://ftp.ncbi.nlm.nih.gov/snp/organisms/human_9606_b{}_GRCh37p13/VCF/00-All.vcf.gz'.format(dbsnp_version)

            print('Downloading dbsnp!')
            make_basedir(raw_filepath)
            raw_tmp_filepath = get_tmp_path(raw_filepath)
            wget.download(url=dbsnp_url, out=raw_tmp_filepath)
            print('')
            os.rename(raw_tmp_filepath, raw_filepath)
            print('Done downloading.')

        print('Converting {} -> {}'.format(raw_filepath, clean_filepath))
        make_basedir(clean_filepath)
        clean_tmp_filepath = get_tmp_path(clean_filepath)
        run_script(r'''
        gzip -cd '{raw_filepath}' |
        grep -v '^#' |
        perl -F'\t' -nale 'print "$F[0]\t$F[1]\t$F[2]\t$F[3]\t$F[4]"' | # Gotta declare that it's tab-delimited, else it's '\s+'-delimited I think.
        gzip > '{clean_tmp_filepath}'
        '''.format(raw_filepath=raw_filepath, clean_tmp_filepath=clean_tmp_filepath))
        os.rename(clean_tmp_filepath, clean_filepath)

    print("dbsnp is at '{clean_filepath}'".format(clean_filepath=clean_filepath))
