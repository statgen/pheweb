
from .. import utils
conf = utils.conf

import os
from boltons.fileutils import mkdir_p

dbsnp_version = 147
dbsnp_dir = os.path.join(conf.data_dir, 'sites', 'dbSNP')
raw_tmpfile = os.path.join(dbsnp_dir, 'tmp-dbsnp-b{}-GRCh37.gz'.format(dbsnp_version))
raw_file = os.path.join(dbsnp_dir, 'dbsnp-b{}-GRCh37.gz'.format(dbsnp_version))
clean_file = utils.get_cacheable_file_location(dbsnp_dir, 'rsids-{}.vcf.gz'.format(dbsnp_version))
clean_tmpfile = utils.get_cacheable_file_location(dbsnp_dir, 'tmp-rsids-{}.vcf.gz'.format(dbsnp_version))

def run(argv):
    if not os.path.exists(clean_file):
        print('dbsnp will be stored at {clean_file!r}'.format(clean_file=clean_file))
        mkdir_p(dbsnp_dir)
        if not os.path.exists(raw_file):
            print('Downloading dbsnp!')
            wget = utils.get_path('wget')
            dbsnp_url = 'ftp://ftp.ncbi.nlm.nih.gov/snp/organisms/human_9606_b147_GRCh37p13/VCF/All_20160601.vcf.gz'
            #dbsnp_url= 'ftp://ftp.ncbi.nlm.nih.gov/snp/organisms/human_9606_b147_GRCh37p13/database/organism_data/b147_SNPChrPosOnRef_105.bcp.gz'
            utils.run_cmd([wget, '-O', raw_tmpfile, dbsnp_url])
            os.rename(raw_tmpfile, raw_file)

        utils.run_script(r'''
        gzip -cd '{raw_file}' |
        grep -v '^#' |
        perl -F'\t' -nale 'print "$F[0]\t$F[1]\t$F[2]\t$F[3]\t$F[4]"' | # Gotta declare that it's tab-delimited, else it's '\s'-delimited I think.
        gzip > '{clean_tmpfile}'
        '''.format(raw_file=raw_file, clean_tmpfile=clean_tmpfile))
        os.rename(clean_tmpfile, clean_file)

    else:
        print("dbsnp is at '{clean_file}'".format(clean_file=clean_file))
