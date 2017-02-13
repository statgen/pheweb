
from .. import utils
conf = utils.conf

import os
import re
import gzip
import csv
import collections

def run(argv):
    # I need these genenames to be unique. So, if a SYMBOL is not unique, I use the ENSG instead.

    gene_dir = os.path.join(conf.data_dir, 'sites', 'genes')
    gencode_file = os.path.join(gene_dir, 'gencode.gtf.gz')
    bed_file = utils.get_cacheable_file_location(gene_dir, 'genes.bed')

    if not os.path.exists(bed_file):
        print('genes.bed will be stored at {bed_file!r}'.format(bed_file=bed_file))
        utils.mkdir_p(gene_dir)
        if not os.path.exists(gencode_file):
            wget = utils.get_path('wget')
            # Link from <http://www.gencodegenes.org/releases/19.html>
            utils.run_cmd([wget, '-O', gencode_file, "ftp://ftp.sanger.ac.uk/pub/gencode/Gencode_human/release_19/gencode.v19.annotation.gtf.gz"])

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

        genes = []
        with gzip.open(gencode_file, 'rt') as f:

            for l in f:
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
                symbol = re.search(r'gene_name "(.+?)"', r[8]).group(1)
                ensg = re.search(r'gene_id "(ENSG[R0-9]+?)(?:\.[0-9]+)?"', r[8]).group(1)

                genes.append({
                    'chrom': chrom,
                    'start': pos1,
                    'end': pos2,
                    'symbol': symbol,
                    'ensg': ensg,
                })

        symbol_counts = collections.Counter(g['symbol'] for g in genes)
        for g in genes:
            if symbol_counts[g['symbol']] > 1:
                g['symbol'] = g['ensg']
        assert len(set(g['symbol'] for g in genes)) == len(genes)

        with open(bed_file, 'w') as f:
            writer = csv.DictWriter(f, delimiter='\t', fieldnames='chrom start end symbol ensg'.split(), lineterminator='\n')
            writer.writerows(genes)

    else:
        print("gencode is at {bed_file!r}".format(bed_file=bed_file))
