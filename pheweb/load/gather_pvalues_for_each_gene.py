
from ..utils import conf, get_gene_tuples, pad_gene
from ..file_utils import MatrixReader, write_json

import os

def run(argv):

    out_fname = os.path.join(conf.data_dir, 'best-phenos-by-gene.json')
    matrix_fname = os.path.join(conf.data_dir, 'matrix.tsv.gz')

    if not os.path.exists(out_fname) or os.stat(matrix_fname).st_mtime > os.stat(out_fname).st_mtime:

        rv = {}

        with MatrixReader().context() as matrix_reader:

            for chrom, start, end, gene_symbol in get_gene_tuples():
                start, end = pad_gene(start, end)
                # This dictionary will only contain p-values < MIN_PVALUE_TO_SHOW .
                best_assoc_for_pheno = {}

                # best_assoc_for_pheno is like:
                # {
                #   '<phenocode>': {
                #     'ac': 35, ... # and all per_pheno and per_assoc fields
                #   }, ...
                # }

                for variant in matrix_reader.get_region(chrom, start, end+1):
                    for phenocode, pheno in variant['phenos'].items():
                        assert pheno['pval'] != ''
                        if (phenocode not in best_assoc_for_pheno or
                            pheno['pval'] < best_assoc_for_pheno[phenocode]['pval']):
                            best_assoc_for_pheno[phenocode] = pheno

                if best_assoc_for_pheno:
                    for phenocode, assoc in best_assoc_for_pheno.items():
                        assoc['phenocode'] = phenocode
                    phenos_in_gene = sorted(best_assoc_for_pheno.values(), key=lambda a:a['pval'])
                    # decide how many phenotypes to include:
                    #  - include all significant phenotypes.
                    #  - always include at least three phenotypes.
                    #  - include some of the first ten phenotypes based on pval heuristics.
                    biggest_idx_to_include = 2
                    for idx in range(biggest_idx_to_include, len(phenos_in_gene)):
                        if phenos_in_gene[idx]['pval'] < 5e-8:
                            biggest_idx_to_include = idx
                        elif idx < 10 and phenos_in_gene[idx]['pval'] < 10 ** (-4 - idx//2): # formula is arbitrary
                            biggest_idx_to_include = idx
                        else:
                            break
                    rv[gene_symbol] = phenos_in_gene[:biggest_idx_to_include + 1]


        write_json(filename=out_fname, data=rv)
        print('Wrote best-phenos-by-gene to {!r}'.format(out_fname))
    else:
        print('{} is up-to-date!'.format(out_fname))
