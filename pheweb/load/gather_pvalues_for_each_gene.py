
'''
TODO: Don't read any variant more than once.
 Right now this reads each 100kb-padded-gene independently, resulting in reading some variants multiple times.
 The sum of lengths of all 20k genes is 1400Mbases.
 The sum of the padded lengths is 5400Mbases.
 The total number of bases in the padded genes (without double-counting overlaps) is 2100Mbases (40%):
   from pheweb.utils import chrom_order
   trips = [(chrom_order[chrom], int(start), int(end)) for chrom,start,end,_,_ in (line.split() for line in open('genes-v36-hg38.bed'))]
   intervals = sorted((chrom_idx*1e12+start-100e3, chrom_idx*1e12+stop+100e3) for chrom_idx,start,stop  in trips)
   ret = []
   for iv in intervals:
     if not ret or iv[0] > ret[-1][1]: ret.append(iv)
     else: ret[-1] = (ret[-1][0], max(ret[-1][1], iv[1]))
   sum(end-start for start,end in ret)/1e6
So could this run in 25% of the time if deduped?
Method:
 Make a list of all 15k non-overlapping intervals.
 Each is a task.
 For each variant, check what genes it's in.  Add each pheno to each of those genes.
 Then at the end of the task, trim down the list for each gene according to the normal rules and return it.
 Then in the main thread, merge all the results and trim them down again.
 See <https://github.com/FINNGEN/pheweb/blob/master/pheweb/load/gather_pvalues_for_each_gene.py>
'''

from ..utils import get_gene_tuples, pad_gene
from ..file_utils import MatrixReader, common_filepaths, get_tmp_path
from .load_utils import Parallelizer

import sqlite3, json
from pathlib import Path

def run(argv):
    if argv and '-h' in argv:
        print('get info for genes')
        exit(0)

    out_filepath = Path(common_filepaths['best-phenos-by-gene-sqlite3']())
    matrix_filepath = Path(common_filepaths['matrix']())
    if out_filepath.exists() and matrix_filepath.stat().st_mtime < out_filepath.stat().st_mtime:
        print('{} is up-to-date!'.format(str(out_filepath)))
        return

    old_filepath = Path(common_filepaths['best-phenos-by-gene-old-json']())
    if old_filepath.exists() and matrix_filepath.stat().st_mtime < old_filepath.stat().st_mtime:
        print('Migrating old {} to new {}'.format(str(old_filepath), str(out_filepath)))
        with open(old_filepath) as f:
            data = json.load(f)

    else:
        genes = list(get_gene_tuples())
        gene_results = Parallelizer().run_multiple_tasks(
            tasks = genes,
            do_multiple_tasks = process_genes,
            cmd = 'gather-pvalues-for-each-gene'
        )
        data = {k:v for ret in gene_results for k,v in ret['value'].items()}

    out_tmp_filepath = Path(get_tmp_path(out_filepath))
    db = sqlite3.connect(str(out_tmp_filepath))
    with db:
        db.execute('CREATE TABLE best_phenos_for_each_gene (gene TEXT PRIMARY KEY, json TEXT)')
        db.executemany('INSERT INTO best_phenos_for_each_gene (gene, json) VALUES (?,?)', ((k,json.dumps(v)) for k,v in data.items()))
    out_tmp_filepath.replace(out_filepath)
    print('Done making best-pheno-for-each-gene at {}'.format(str(out_filepath)))

def process_genes(taskq, retq):
    with MatrixReader().context() as matrix_reader:
        def f(gene): return get_gene_info(gene, matrix_reader)
        Parallelizer._make_multiple_tasks_doer(f)(taskq, retq)

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
    # Decide how many phenotypes to show.
    #  - Always show all significant phenotypes (with pvalue < 5e-8).
    #  - Always show the three strongest phenotypes (even if none are significant).
    #  - Look at the p-values of the 4th to 10th strongest phenotypes to decide how many of them to show.
    biggest_idx_to_include = 2
    for idx in range(biggest_idx_to_include, len(phenos_in_gene)):
        if phenos_in_gene[idx]['pval'] < 5e-8:
            biggest_idx_to_include = idx
        elif idx < 10 and phenos_in_gene[idx]['pval'] < 10 ** (-4 - idx//2): # formula is arbitrary
            biggest_idx_to_include = idx
        else:
            break
    return {gene_symbol: phenos_in_gene[:biggest_idx_to_include + 1]}
