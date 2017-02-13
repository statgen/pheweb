
from .. import utils
conf = utils.conf

import pysam
import os
import json

def run(argv):

    out_fname = os.path.join(conf.data_dir, 'best-phenos-by-gene.json')
    matrix_fname = os.path.join(conf.data_dir, 'matrix.tsv.gz')

    if not os.path.exists(out_fname) or os.stat(matrix_fname).st_mtime > os.stat(out_fname).st_mtime:

        rv = {}

        tabix_file = pysam.TabixFile(matrix_fname)
        phenos = utils.get_phenos_with_colnums()

        for chrom, start, end, gene_symbol in utils.get_gene_tuples():
            # TODO: make a standardized way of computing a padded [start, end]
            # This dictionary will only contain p-values < MIN_PVALUE_TO_SHOW .
            best_pvalue_for_pheno = {}

            if chrom in tabix_file.contigs:
                tabix_iter = tabix_file.fetch(chrom, start-1, end+1, parser = pysam.asTuple())
                for variant_row in tabix_iter:
                    for phenocode, pheno in phenos.items():
                        pval_col = pheno['colnum']['pval']
                        v = variant_row[pval_col]
                        if v == '.': continue
                        pval = float(v)
                        if pval < best_pvalue_for_pheno.get(phenocode, 2):
                            best_pvalue_for_pheno[phenocode] = pval

            if best_pvalue_for_pheno:
                # decide how many phenotypes to include.
                phenos_in_gene = [{'phenocode': phenocode, 'pval':pval} for phenocode, pval in best_pvalue_for_pheno.items()]
                phenos_in_gene = sorted(phenos_in_gene, key=lambda p:p['pval'])
                num_to_include = 3
                for idx in range(3,10):
                    # Nothing magic, just works decently.
                    if len(phenos_in_gene) > idx and phenos_in_gene[idx]['pval'] < 10 ** (-4 - idx//2):
                        num_to_include = idx + 1
                phenos_in_gene = phenos_in_gene[:num_to_include]

                rv[gene_symbol] = phenos_in_gene

        with open(out_fname, 'w') as f:
            json.dump(rv, f)
        print('Wrote best-phenos-by-gene to {!r}'.format(out_fname))
    else:
        print('{!r} is up-to-date!'.format(out_fname))
