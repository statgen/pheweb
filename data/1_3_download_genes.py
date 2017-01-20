#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

# Load config, utils, venv
import os.path
import imp
my_dir = os.path.dirname(os.path.abspath(__file__))
utils = imp.load_source('utils', os.path.join(my_dir, '../utils.py'))
conf = utils.conf
utils.activate_virtualenv()

input_file_parser = imp.load_source('input_file_parser', os.path.join(my_dir, 'input_file_parsers/{}.py'.format(conf.source_file_parser)))

gene_dir = os.path.join(conf.data_dir, 'sites', 'genes')
bed_file = os.path.join(gene_dir, 'genes.bed')
gencode_file = os.path.join(gene_dir, 'gencode.gtf.gz')
wget = utils.get_path('wget')

utils.mkdir_p(gene_dir)

if not os.path.exists(bed_file):
    if not os.path.exists(gencode_file):
        # Link from <http://www.gencodegenes.org/releases/19.html>
        utils.run_cmd([wget, '-O', gencode_file, "ftp://ftp.sanger.ac.uk/pub/gencode/Gencode_human/release_19/gencode.v19.annotation.gtf.gz"])

    # TODO: rewrite this in pure python?
    utils.run_script(r'''
    gzip -cd '{gencode_file}' |
    # Remove pseudogenes and other unwanted types of genes.
    grep -E '; gene_type "(protein_coding|IG_V_gene|TR_V_gene|TR_J_gene|IG_C_gene|IG_D_gene|IG_J_gene|TR_C_gene|TR_D_gene)";' |
    # Remove `chr` from the beginning of the lines and print out `chr startpos endpos genename`.
    perl -F'\t' -nale '$F[0] =~ s/chr//; print "$F[0]\t$F[3]\t$F[4]\t", m/gene_name "(.*?)";/ if $F[2] eq "gene"' > '{bed_file}'
    '''.format(**locals()))

else
    print("{bed_file} already exists".format(**locals()))
