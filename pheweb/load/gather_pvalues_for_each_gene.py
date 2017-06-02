
from ..utils import get_gene_tuples, pad_gene
from ..file_utils import MatrixReader, write_json, common_filepaths
from .load_utils import parallelize

import os


def run(argv):
    if argv and '-h' in argv:
        print('get info for genes')
        exit(0)

    out_filepath = common_filepaths['best-phenos-by-gene']
    matrix_filepath = common_filepaths['matrix']
    if os.path.exists(out_filepath) and os.stat(matrix_filepath).st_mtime < os.stat(out_filepath).st_mtime:
        print('{} is up-to-date!'.format(out_filepath))
        return

    genes = list(get_gene_tuples())
    gene_results = parallelize(genes, do_tasks=process_genes, tqdm_desc='Processing genes')
    data = {k:v for result in gene_results for k,v in result.items()}
    write_json(filepath=out_filepath, data=data)

def process_genes(taskq, doneq, stop_sentinel):
    with MatrixReader().context() as matrix_reader:
        for gene in iter(taskq.get, stop_sentinel):
            doneq.put(get_gene_info(gene, matrix_reader))

def get_gene_info(gene, matrix_reader):
    chrom, start, end, gene_symbol = gene
    start, end = pad_gene(start, end)
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

    if not best_assoc_for_pheno:
        return {}

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
    return {gene_symbol: phenos_in_gene[:biggest_idx_to_include + 1]}
