
from ..file_utils import make_basedir, get_tmp_path, dbsnp_version, common_filepaths
from .load_utils import run_script
from ..conf_utils import conf

import os
import wget

def download_rsids_for_build(hg_build_number: int):
    raw_dbsnp_filepath = get_tmp_path('dbsnp-b{}-hg{}.gz'.format(dbsnp_version, hg_build_number))
    rsids_filepath = common_filepaths['rsids-hg{}'.format(hg_build_number)]()

    if not os.path.exists(rsids_filepath):
        print('dbsnp will be stored at {!r}'.format(rsids_filepath))

        if not os.path.exists(raw_dbsnp_filepath):
            # dbSNP downloads are described at <https://www.ncbi.nlm.nih.gov/variation/docs/human_variation_vcf/>
            # This file includes chr-pos-ref-alt-rsid and 4X a bunch of useless columns:
            if hg_build_number == 19:
                url = 'https://ftp.ncbi.nlm.nih.gov/snp/organisms/human_9606_b{}_GRCh37p13/VCF/00-All.vcf.gz'.format(dbsnp_version)
            elif hg_build_number == 38:
                url = 'https://ftp.ncbi.nlm.nih.gov/snp/organisms/human_9606_b{}_GRCh38p7/VCF/00-All.vcf.gz'.format(dbsnp_version)
            else: raise Exception()
            print('Downloading dbsnp from {} to {}'.format(url, raw_dbsnp_filepath))
            make_basedir(raw_dbsnp_filepath)
            raw_dbsnp_tmp_filepath = get_tmp_path(raw_dbsnp_filepath)
            wget.download(url=url, out=raw_dbsnp_tmp_filepath)
            print('')
            os.rename(raw_dbsnp_tmp_filepath, raw_dbsnp_filepath)
            print('Finished downloading to {}'.format(raw_dbsnp_filepath))

        print('Converting {} -> {}'.format(raw_dbsnp_filepath, rsids_filepath))
        make_basedir(rsids_filepath)
        rsids_tmp_filepath = get_tmp_path(rsids_filepath)
        run_script(r'''
        gzip -cd '{raw_dbsnp_filepath}' |
        grep -v '^#' |
        perl -F'\t' -nale 'print "$F[0]\t$F[1]\t$F[2]\t$F[3]\t$F[4]"' | # Gotta declare that it's tab-delimited, else it's '\s+'-delimited I think.
        gzip > '{rsids_tmp_filepath}'
        '''.format(raw_dbsnp_filepath=raw_dbsnp_filepath, rsids_tmp_filepath=rsids_tmp_filepath))
        os.rename(rsids_tmp_filepath, rsids_filepath)

    print("rsids are at '{rsids_filepath}'".format(rsids_filepath=rsids_filepath))

def run(argv):
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--hg', type=int, default=conf.hg_build_number, choices=[19,38])
    args = parser.parse_args(argv)
    download_rsids_for_build(args.hg)
