
from ..utils import get_gene_tuples, pad_gene
from ..file_utils import MatrixReader, write_json, common_filepaths
from .load_utils import get_num_procs

import os
import tqdm
import multiprocessing as mp


def run(argv):
    if argv and '-h' in argv:
        print('get info for genes')
        exit(0)

    out_filepath = common_filepaths['best-phenos-by-gene']
    matrix_filepath = common_filepaths['matrix']
    if os.path.exists(out_filepath) and os.stat(matrix_filepath).st_mtime < os.stat(out_filepath).st_mtime:
        print('{} is up-to-date!'.format(out_filepath))
        return

    data = get_all_gene_info()
    write_json(filepath=out_filepath, data=data)

def get_all_gene_info():
    genes = list(get_gene_tuples())
    n_procs = get_num_procs()

    sentinel = 9001 # TODO: this is not a good sentinel
    taskq = mp.Queue()
    doneq = mp.Queue()
    for gene in genes: taskq.put(gene)
    for _ in range(n_procs): taskq.put(sentinel)

    for _ in range(n_procs): mp.Process(target=work, args=(taskq, doneq, sentinel)).start()

    ret = {}
    for _ in tqdm.tqdm(range(len(genes)), desc='Genes processed:'):
        ret.update(doneq.get())
    return ret

def work(inputq, outputq, sentinel):
    with MatrixReader().context() as matrix_reader:
        for gene in iter(inputq.get, sentinel):
            outputq.put(get_gene_info(gene, matrix_reader))

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
