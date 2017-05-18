
from ..utils import get_cacheable_file_location
from ..file_utils import get_generated_path, make_basedir, get_tmp_path
from .load_utils import run_script

import os
import wget

dbsnp_version = 150
raw_file = get_generated_path('sites/dbSNP/dbsnp-b{}-GRCh37.gz'.format(dbsnp_version))
clean_file = get_cacheable_file_location('sites/dbSNP', 'rsids-{}.vcf.gz'.format(dbsnp_version))

def run(argv):
    if not os.path.exists(clean_file):
        print('dbsnp will be stored at {clean_file!r}'.format(clean_file=clean_file))
        if not os.path.exists(raw_file):

            # dbSNP downloads are described at <https://www.ncbi.nlm.nih.gov/variation/docs/human_variation_vcf/>
            # This file includes chr-pos-ref-alt-rsid and 4X a bunch of useless columns:
            dbsnp_url = 'ftp://ftp.ncbi.nlm.nih.gov/snp/organisms/human_9606_b150_GRCh37p13/VCF/All_20170403.vcf.gz'

            print('Downloading dbsnp!')
            make_basedir(raw_file)
            raw_tmpfile = get_tmp_path(raw_file)
            wget.download(url=dbsnp_url, out=raw_tmpfile)
            os.rename(raw_tmpfile, raw_file)
            print('Done downloading.')

        print('Converting {raw_file} -> {clean_file}'.format(raw_file=raw_file, clean_file=clean_file))
        make_basedir(clean_file)
        clean_tmpfile = get_tmp_path(clean_file)
        run_script(r'''
        gzip -cd '{raw_file}' |
        grep -v '^#' |
        perl -F'\t' -nale 'print "$F[0]\t$F[1]\t$F[2]\t$F[3]\t$F[4]"' | # Gotta declare that it's tab-delimited, else it's '\s+'-delimited I think.
        gzip > '{clean_tmpfile}'
        '''.format(raw_file=raw_file, clean_tmpfile=clean_tmpfile))
        os.rename(clean_tmpfile, clean_file)

    print("dbsnp is at '{clean_file}'".format(clean_file=clean_file))
