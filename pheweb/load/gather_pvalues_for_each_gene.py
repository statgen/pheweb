
from .. import utils
conf = utils.conf

import pysam
import os
import json

MIN_PVALUE_FOR_FIRST_PHENO = 1e-4
MIN_PVALUE_FOR_OTHER_PHENOS = 1e-6

def run(argv):

    out_fname = os.path.join(conf.data_dir, 'best-phenos-by-gene.json')
    matrix_fname = os.path.join(conf.data_dir, 'matrix.tsv.gz')

    if not os.path.exists(out_fname) or os.stat(matrix_fname).st_mtime > os.stat(out_fname).st_mtime:

        rv = {}

        tabix_file = pysam.TabixFile(matrix_fname)
        phenos = utils.get_phenos_with_colnums()

        for chrom, start, end, gene_symbol in utils.get_gene_tuples():
            # TODO: make a standardized way of computing a padded [start, end]
            best_pvalue_for_pheno = {}

            if chrom in tabix_file.contigs:
                tabix_iter = tabix_file.fetch(chrom, start-1, end+1, parser = pysam.asTuple())
                for variant_row in tabix_iter:
                    for pheno in phenos.values():
                        pval_col = pheno['colnum']['pval']
                        v = variant_row[pval_col]
                        if v != '.':
                            pval = float(v)
                            if pval < MIN_PVALUE_FOR_OTHER_PHENOS or len(best_pvalue_for_pheno)==0 and pval < MIN_PVALUE_FOR_FIRST_PHENO:
                                prev_pval = best_pvalue_for_pheno.get(pheno['phenocode'], 1)
                                if pval < prev_pval:
                                    best_pvalue_for_pheno[pheno['phenocode']] = pval

            if best_pvalue_for_pheno:
                phenocodes = sorted(best_pvalue_for_pheno, key=best_pvalue_for_pheno.get)
                rv[gene_symbol] = phenocodes

        with open(out_fname, 'w') as f:
            json.dump(rv, f, indent=0)
        print('Wrote best-phenos-by-gene to {!r}'.format(out_fname))
    else:
        print('{!r} is up-to-date!'.format(out_fname))
