
from ..utils import chrom_order, chrom_aliases
from ..file_utils import get_generated_path, make_basedir, genes_version, common_filepaths, read_gzip

import os
import re
import csv
import wget
import boltons.iterutils


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
nonpseudo_genetypes = set('''
3prime_overlapping_ncRNA
antisense
bidirectional_promoter_lncRNA
lincRNA
macro_lncRNA
miRNA
misc_RNA
Mt_rRNA
Mt_tRNA
non_coding
processed_transcript
rRNA
scRNA
sense_intronic
sense_overlapping
snRNA
snoRNA
TEC
vaultRNA
'''.split()).union(good_genetypes)

def get_all_genes(gencode_filepath):
    with read_gzip(gencode_filepath) as f:
        for l in f:
            if l.startswith('#'): continue
            r = l.split('\t')
            if r[2] != 'gene': continue

            try:
                # Remove pseudogenes and other unwanted types of genes.
                genetype = re.search(r'gene_type "(.+?)"', r[8]).group(1)
                assert 'pseudogene' in genetype or genetype in nonpseudo_genetypes
                if genetype not in good_genetypes: continue

                assert r[0].startswith('chr')
                chrom = r[0][3:]
                if chrom in chrom_aliases: chrom = chrom_aliases[chrom]
                elif chrom not in chrom_order: continue
                pos1, pos2 = int(r[3]), int(r[4])
                assert pos1 < pos2
                symbol = re.search(r'gene_name "(.+?)"', r[8]).group(1)
                full_ensg = re.search(r'gene_id "(ENSGR?[0-9\._A-Z]+?)"', r[8]).group(1)
                ensg = full_ensg.split('.')[0]
            except:
                print('ERROR on line:', r)
                raise

            yield {
                'chrom': chrom,
                'start': pos1,
                'end': pos2,
                'symbol': symbol,
                'ensg': ensg,
                'full_ensg': full_ensg,
            }

def dedup_ensg(genes):
    # If two genes share the same "ENSGXXXX" (before period), then use their "ENSGXXXX.XXX" instead.
    for ensg_group in boltons.iterutils.bucketize(genes, key=lambda g:g['ensg']).values():
        if len(ensg_group) == 1:
            del ensg_group[0]['full_ensg']
            yield ensg_group[0]
        else:
            # These are all psuedo-autosomals across X/Y
            assert sorted(g['chrom'] for g in ensg_group) == ['X', 'Y']
            for g in ensg_group:
                g['ensg'] = g['symbol'] = g.pop('full_ensg')
                yield g

def dedup_symbol(genes):
    # If genes share the same SYMBOL, check that they are adjacent and then merge them
    for symbol_group in boltons.iterutils.bucketize(genes, key=lambda g:g['symbol']).values():
        if len(symbol_group) == 1:
            yield symbol_group[0]
        elif (boltons.iterutils.same(g['chrom'] for g in symbol_group) and
              all(g1['end'] + 400e3 > g2['start'] for g1,g2 in boltons.iterutils.pairwise(sorted(symbol_group, key=lambda g:g['start'])))):
            # 400kb is long enough to resolve all problems.
            yield {
                'chrom': symbol_group[0]['chrom'],
                'start': min(g['start'] for g in symbol_group),
                'end': min(g['end'] for g in symbol_group),
                'symbol': symbol_group[0]['symbol'],
                'ensg': ','.join(g['ensg'] for g in symbol_group),
            }
        else:
            print('broken symbol_group:')
            for g in symbol_group:
                print('- {:12,}\t{:12,}\t{}'.format(g['start'], g['end'], g))
            raise


def run(argv):
    gencode_filepath = get_generated_path('sites/genes/gencode-{}.gtf.gz'.format(genes_version))
    genes_filepath = common_filepaths['genes']

    if not os.path.exists(genes_filepath):
        print('genes-{}.bed will be stored at {!r}'.format(genes_version, genes_filepath))
        if not os.path.exists(gencode_filepath):
            make_basedir(gencode_filepath)
            wget.download(
                url="ftp://ftp.sanger.ac.uk/pub/gencode/Gencode_human/release_25/GRCh37_mapping/gencode.v25lift37.annotation.gtf.gz",
                out=gencode_filepath
            )
            print('')
        genes = get_all_genes(gencode_filepath)
        genes = dedup_ensg(genes)
        genes = dedup_symbol(genes)

        make_basedir(genes_filepath)
        with open(genes_filepath, 'w') as f:
            writer = csv.DictWriter(f, delimiter='\t', fieldnames='chrom start end symbol ensg'.split(), lineterminator='\n')
            writer.writerows(genes)

    else:
        print("gencode is at {!r}".format(genes_filepath))
