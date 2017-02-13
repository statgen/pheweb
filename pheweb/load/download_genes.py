
from .. import utils
conf = utils.conf

import os
import re
import gzip
import requests
import csv

gene_dir = os.path.join(conf.data_dir, 'sites', 'genes')

def get_bed_file():
    gencode_file = os.path.join(gene_dir, 'gencode.gtf.gz')
    bed_file = utils.get_cacheable_file_location(gene_dir, 'genes.bed')
    good_genetypes = set('''
    protein_coding
    IG_C_gene
    IG_D_gene
    IG_J_gene
    IG_V_gene
    TR_C_gene
    TR_D_gene
    TR_J_gene
    TR_V_gene
    '''.split())

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

def get_aliases_file():
    aliases_file = utils.get_cacheable_file_location(gene_dir, 'gene_aliases.tsv')
    tmp_file = utils.get_cacheable_file_location(gene_dir, 'tmp-gene_aliases.tsv')
    if not os.path.exists(aliases_file):
        print('gene aliases will be stored at {aliases_file!r}'.format(aliases_file=aliases_file))

        canonical_gene_names = set(genename for _, _, _, genename in utils.get_gene_tuples())
        print('num canonical gene names:', len(canonical_gene_names))

        r = requests.get('http://www.genenames.org/cgi-bin/download?col=gd_app_sym&col=gd_prev_sym&col=gd_aliases&col=gd_pub_ensembl_id&status=Approved&status=Entry+Withdrawn&status_opt=2&where=&order_by=gd_app_sym_sort&format=text&limit=&hgnc_dbtag=on&submit=submit')
        r.raise_for_status()
        with open(tmp_file, 'w') as f:
            writer = csv.DictWriter(f, fieldnames=['symbol', 'aliases'], delimiter='\t')
            writer.writeheader()
            for row in csv.DictReader(r.content.decode().split('\n'), delimiter='\t'):
                if '~' in row['Approved Symbol']: continue
                symbols = {row['Approved Symbol']}
                symbols.update(filter(None, row['Previous Symbols'].split(', ')))
                symbols.update(filter(None, row['Synonyms'].split(', ')))
                symbols.update(filter(None, row['Ensembl Gene ID'].split(', ')))
                symbols = set(s for s in symbols if all(l.isalnum() or l in '-._' for l in s))
                for symbol in symbols:
                    if symbol in canonical_gene_names:
                        writer.writerow({
                            'symbol': symbol,
                            'aliases': ','.join(s for s in symbols if s != symbol)
                        })

            os.fsync(f.fileno())
        os.rename(tmp_file, aliases_file)
    else:
        print('gene aliases are at {aliases_file!r}'.format(aliases_file=aliases_file))

def run(argv):
    get_bed_file()
    get_aliases_file()
