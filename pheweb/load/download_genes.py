#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

from .. import utils
conf = utils.conf

import os

gene_dir = os.path.join(conf.data_dir, 'sites', 'genes')
bed_file = os.path.join(gene_dir, 'genes.bed')
gencode_file = os.path.join(gene_dir, 'gencode.gtf.gz')

if hasattr(conf, 'cache_dir'):
    utils.mkdir_p(conf.cache_dir)
    bed_file = os.path.join(conf.cache_dir, 'genes.bed')
else:
    bed_file = os.path.join(gene_dir, 'genes.ged')

def run(argv):

    if not os.path.exists(bed_file):
        print('genes.bed will be stored at {bed_file!r}'.format(bed_file=bed_file))
        utils.mkdir_p(gene_dir)
        if not os.path.exists(gencode_file):
            wget = utils.get_path('wget')
            # Link from <http://www.gencodegenes.org/releases/19.html>
            utils.run_cmd([wget, '-O', gencode_file, "ftp://ftp.sanger.ac.uk/pub/gencode/Gencode_human/release_19/gencode.v19.annotation.gtf.gz"])

        # TODO: rewrite this in pure python?
        utils.run_script(r'''
        gzip -cd '{gencode_file}' |
        # Remove pseudogenes and other unwanted types of genes.
        grep -E '; gene_type "(protein_coding|IG_V_gene|TR_V_gene|TR_J_gene|IG_C_gene|IG_D_gene|IG_J_gene|TR_C_gene|TR_D_gene)";' |
        # Remove `chr` from the beginning of the lines and print out `chr startpos endpos genename`.
        perl -F'\t' -nale '$F[0] =~ s/chr//; print "$F[0]\t$F[3]\t$F[4]\t", m/gene_name "(.*?)";/ if $F[2] eq "gene"' > '{bed_file}'
        '''.format(gencode_file=gencode_file, bed_file=bed_file))

    else:
        print("gencode is at {bed_file!r}".format(bed_file=bed_file))


if __name__ == '__main__':
    run([])
