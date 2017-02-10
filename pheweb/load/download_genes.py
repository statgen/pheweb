



from .. import utils
conf = utils.conf

import os
import re
import gzip

gene_dir = os.path.join(conf.data_dir, 'sites', 'genes')
bed_file = os.path.join(gene_dir, 'genes.bed')
gencode_file = os.path.join(gene_dir, 'gencode.gtf.gz')

if hasattr(conf, 'cache'):
    utils.mkdir_p(conf.cache)
    bed_file = os.path.join(conf.cache, 'genes.bed')
else:
    bed_file = os.path.join(gene_dir, 'genes.ged')


good_genetypes = set('''
protein_coding
IG_V_gene
TR_V_gene
TR_J_gene
IG_C_gene
IG_D_gene
IG_J_gene
TR_C_gene
TR_D_gene
'''.split())


def run(argv):

    if not os.path.exists(bed_file):
        print('genes.bed will be stored at {bed_file!r}'.format(bed_file=bed_file))
        utils.mkdir_p(gene_dir)
        if not os.path.exists(gencode_file):
            wget = utils.get_path('wget')
            # Link from <http://www.gencodegenes.org/releases/19.html>
            utils.run_cmd([wget, '-O', gencode_file, "ftp://ftp.sanger.ac.uk/pub/gencode/Gencode_human/release_19/gencode.v19.annotation.gtf.gz"])

        with gzip.open(gencode_file, 'rt') as fin, \
             open(bed_file, 'wt') as fout:

            for l in fin:
                if l.startswith('#'): continue
                r = l.split('\t')
                if r[2] != 'gene': continue

                # Remove pseudogenes and other unwanted types of genes.
                genetype = re.search(r'gene_type "(.+?)"', r[8]).group(1)
                if genetype not in good_genetypes: continue

                assert r[0].startswith('chr')
                chrom = r[0][3:]
                pos1, pos2 = int(r[3]), int(r[4])
                assert pos1 < pos2
                genename = re.search(r'gene_name "(.+?)"', r[8]).group(1)

                fout.write('{}\t{}\t{}\t{}\n'.format(chrom, pos1, pos2, genename))

    else:
        print("gencode is at {bed_file!r}".format(bed_file=bed_file))


if __name__ == '__main__':
    run([])
