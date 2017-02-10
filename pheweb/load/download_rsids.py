



from .. import utils
conf = utils.conf

import os

dbsnp_version = 147
dbsnp_dir = os.path.join(conf.data_dir, 'sites', 'dbSNP')
tmp_file = os.path.join(dbsnp_dir, 'tmp-dbsnp-b{}-GRCh37.gz'.format(dbsnp_version))
raw_file = os.path.join(dbsnp_dir, 'dbsnp-b{}-GRCh37.gz'.format(dbsnp_version))

clean_file = 'rsids-{}.vcf.gz'.format(dbsnp_version)
if hasattr(conf, 'cache'):
    utils.mkdir_p(conf.cache)
    clean_file = os.path.join(conf.cache, clean_file)
else:
    clean_file = os.path.join(dbsnp_dir, clean_file)

def run(argv):
    if not os.path.exists(clean_file):
        print('dbsnp will be stored at {clean_file!r}'.format(clean_file=clean_file))
        utils.mkdir_p(dbsnp_dir)
        if not os.path.exists(raw_file):
            print('Downloading dbsnp!')
            wget = utils.get_path('wget')
            #utils.run_cmd([wget, '-O', tmp_file, 'ftp://ftp.ncbi.nlm.nih.gov/snp/organisms/human_9606_b147_GRCh37p13/database/organism_data/b147_SNPChrPosOnRef_105.bcp.gz'])
            utils.run_cmd([wget, '-O', tmp_file, 'ftp://ftp.ncbi.nlm.nih.gov/snp/organisms/human_9606_b147_GRCh37p13/VCF/All_20160601.vcf.gz'])
            os.rename(tmp_file, raw_file)

        utils.run_script(r'''
        gzip -cd '{raw_file}' |
        grep -v '^#' |
        perl -F'\t' -nale 'print "$F[0]\t$F[1]\t$F[2]\t$F[3]\t$F[4]"' | # Gotta declare that it's tab-delimited, else it's '\s'-delimited I think.
        gzip > '{clean_file}'
        '''.format(raw_file=raw_file, clean_file=clean_file))

    else:
        print("dbsnp is at '{clean_file}'".format(clean_file=clean_file))


if __name__ == '__main__':
    run([])
