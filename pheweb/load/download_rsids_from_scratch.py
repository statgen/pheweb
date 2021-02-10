
from ..file_utils import make_basedir, get_tmp_path, dbsnp_version, get_filepath
from .load_utils import run_script
from .. import conf

import os
import wget
from typing import List

def download_rsids_for_build(hg_build_number:int) -> None:
    raw_dbsnp_filepath = get_tmp_path('dbsnp-b{}-hg{}.gz'.format(dbsnp_version, hg_build_number))
    rsids_filepath = get_filepath('rsids-hg{}'.format(hg_build_number), must_exist=False)

    if not os.path.exists(rsids_filepath):
        print('dbsnp will be stored at {!r}'.format(rsids_filepath))

        if not os.path.exists(raw_dbsnp_filepath):
            # dbSNP downloads are described at <https://www.ncbi.nlm.nih.gov/variation/docs/human_variation_vcf/>
            # This file includes chr-pos-ref-alt-rsid and 4X a bunch of useless columns:
            if hg_build_number == 19:
                url = 'https://ftp.ncbi.nih.gov/snp/redesign/archive/b{}/VCF/GCF_000001405.25.gz'.format(dbsnp_version)
            elif hg_build_number == 38:
                url = 'https://ftp.ncbi.nih.gov/snp/redesign/archive/b{}/VCF/GCF_000001405.38.gz'.format(dbsnp_version)
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
        # Note: `perl -F'\t'` declares that input is tab-delimited
        # Note: chromosomes in v154 are named like `NC_000001.10` for chr1.  I don't know about MT.  I don't know what `NC_012920.1` is, but drop it.
        run_script(r'''
        gzip -cd '{raw_dbsnp_filepath}' |
        grep -v '^#' |
        perl -F'\t' -nale 'print "$F[0]\t$F[1]\t$F[2]\t$F[3]\t$F[4]"' |
        grep '^NC_0000' |
        perl -pale 's/^NC_0*23\.\d+/X/' |
        perl -pale 's/^NC_0*24\.\d+/Y/' |
        perl -pale 's/^NC_0*([1-9][0-9]*)\.\d+/\1/' |
        gzip > '{rsids_tmp_filepath}'
        '''.format(raw_dbsnp_filepath=raw_dbsnp_filepath, rsids_tmp_filepath=rsids_tmp_filepath))
        os.rename(rsids_tmp_filepath, rsids_filepath)

    print("rsids are at '{rsids_filepath}'".format(rsids_filepath=rsids_filepath))

def run(argv:List[str]) -> None:
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--hg', type=int, default=conf.get_hg_build_number(), choices=[19,38])
    args = parser.parse_args(argv)
    download_rsids_for_build(args.hg)
