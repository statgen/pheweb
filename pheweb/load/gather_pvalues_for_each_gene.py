
'''
This avoids reading any variant more than once.
 The sum of unpadded lengths of all 20k genes is 1400Mbases.
 The sum of the padded lengths is 5400Mbases.
 The total number of bases in the padded genes (without double-counting overlaps) is 2100Mbases (40%) (in 16k intervals)
'''

from ..utils import get_padded_gene_tuples
from ..file_utils import MatrixReader, get_filepath, get_tmp_path
from .load_utils import Parallelizer

import sqlite3, json, traceback, functools
from pathlib import Path
from intervaltree import IntervalTree, Interval
from typing import List,Any,Dict,Tuple

def run(argv:List[str]) -> None:
    if argv and '-h' in argv:
        print('get info for genes')
        exit(0)

    # Check whether we're already up-to-date.
    out_filepath = Path(get_filepath('best-phenos-by-gene-sqlite3', must_exist=False))
    matrix_filepath = Path(get_filepath('matrix'))
    if out_filepath.exists() and matrix_filepath.stat().st_mtime < out_filepath.stat().st_mtime:
        print('{} is up-to-date!'.format(str(out_filepath)))
        return

    # Import data from a previous version of pheweb if it's around.
    old_filepath = Path(get_filepath('best-phenos-by-gene-old-json', must_exist=False))
    if old_filepath.exists() and matrix_filepath.stat().st_mtime < old_filepath.stat().st_mtime:
        print('Migrating old {} to new {}'.format(str(old_filepath), str(out_filepath)))
        with open(old_filepath) as f:
            data = json.load(f)

    else:
        regions_on_chrom = get_regions_on_chrom()
        regions: List[Tuple[str,int,int]] = [(chrom,start,end) for chrom,regions in regions_on_chrom.items() for (start,end) in regions]
        task_results = Parallelizer().run_multiple_tasks(
            tasks = regions,
            do_multiple_tasks = process_regions,
            cmd = 'gather-pvalues-for-each-gene'
        )
        best_phenos_for_gene: Dict[str,List[Dict[str,Any]]] = {}
        for task_result in task_results:
            assert task_result['type'] == 'result'
            partial_best_phenos_for_gene = task_result['value']
            for genename, best_phenos in partial_best_phenos_for_gene.items():
                assert genename not in best_phenos_for_gene
                best_phenos_for_gene[genename] = best_phenos
        data = best_phenos_for_gene

    out_tmp_filepath = Path(get_tmp_path(out_filepath))
    db = sqlite3.connect(str(out_tmp_filepath))
    with db:
        db.execute('CREATE TABLE best_phenos_for_each_gene (gene TEXT PRIMARY KEY, json TEXT)')
        db.executemany('INSERT INTO best_phenos_for_each_gene (gene, json) VALUES (?,?)', ((k,json.dumps(v)) for k,v in data.items()))
    out_tmp_filepath.replace(out_filepath)
    print('Done making best-pheno-for-each-gene at {}'.format(str(out_filepath)))

def get_regions_on_chrom() -> Dict[str,List[Tuple[int,int]]]:
    gene_ranges_on_chrom: Dict[str,List[Tuple[int,int]]] = {}
    for chrom,start,end,_ in get_padded_gene_tuples():
        gene_ranges_on_chrom.setdefault(chrom,[]).append((start,end))
    return {chrom:merged_intervals(gene_ranges) for chrom,gene_ranges in gene_ranges_on_chrom.items()}
def merged_intervals(intervals:List[Tuple[int,int]]) -> List[Tuple[int,int]]:
    intervals = sorted(intervals)
    ret = intervals[:1]
    for start,end in intervals[1:]:
        if ret[-1][1] < start:
            ret.append((start,end))
        else:
            ret[-1] = (ret[-1][0], max(ret[-1][1], end))
    return ret
assert merged_intervals([(1,2),(2,4),(5,7)]) == [(1,4),(5,7)]


def process_regions(taskq, retq, parent_overrides) -> None:
    try:
        from .. import conf
        assert not conf.overrides or conf.overrides == parent_overrides, (conf.overrides, parent_overrides)
        conf.overrides.update(parent_overrides)
    except Exception as exc:
        retq.put({'type':'exception', 'task':None, 'exception_str':str(exc), 'exception_tb':traceback.format_exc()})
        raise
    tree_for_chrom = get_gene_intervaltree_for_chrom()
    with MatrixReader().context() as matrix_reader:
        f = functools.partial(get_region_info, matrix_reader, tree_for_chrom)
        Parallelizer._make_multiple_tasks_doer(f)(taskq, retq, parent_overrides)

def get_region_info(matrix_reader, tree_for_chrom:Dict[str,IntervalTree], region:Tuple[str,int,int]) -> Dict[str,List[Dict[str,Any]]]:
    chrom, start, end = region
    best_assoc_for_pheno_gene_pair: Dict[Tuple[str,str],Dict[str,Any]] = {}
    # best_assoc_for_pheno_gene_pair is like:
    # { ('<phenocode>', '<genename>'): {'ac': 35, ... all per_pheno and per_assoc fields} }

    for variant in matrix_reader.get_region(chrom, start, end+1):
        genenames: List[str] = [iv.data for iv in tree_for_chrom[variant['chrom']].at(variant['pos'])]

        for phenocode, pheno in variant['phenos'].items():
            assert isinstance(pheno['pval'], float)
            for genename in genenames:
                pheno_gene_pair = (phenocode, genename)
                if pheno_gene_pair not in best_assoc_for_pheno_gene_pair or pheno['pval'] < best_assoc_for_pheno_gene_pair[pheno_gene_pair]['pval']:
                    best_assoc_for_pheno_gene_pair[pheno_gene_pair] = pheno

    phenos_in_gene: Dict[str,List[Dict[str,Any]]] = {}
    for (phenocode, genename), assoc in best_assoc_for_pheno_gene_pair.items():
        assoc['phenocode'] = phenocode
        phenos_in_gene.setdefault(genename, []).append(assoc)
    for genename in phenos_in_gene:
        phenos_in_gene[genename] = order_and_truncate_phenos(phenos_in_gene[genename])
    return phenos_in_gene

@functools.lru_cache(None)
def get_gene_intervaltree_for_chrom() -> Dict[str,IntervalTree]:
    tree_for_chrom = {}
    for chrom,start,end,genename in get_padded_gene_tuples():
        if chrom not in tree_for_chrom:
            tree_for_chrom[chrom] = IntervalTree()
        tree_for_chrom[chrom].add(Interval(start,end,genename))
    return tree_for_chrom

def order_and_truncate_phenos(phenos: List[Dict[str,Any]]) -> List[Dict[str,Any]]:
    # Decide how many phenotypes to show.
    #  - Always show all significant phenotypes (with pvalue < 5e-8).
    #  - Always show the three strongest phenotypes (even if none are significant).
    #  - Look at the p-values of the 4th to 10th strongest phenotypes to decide how many of them to show.
    phenos.sort(key=lambda a:a['pval'])
    biggest_idx_to_include = 2
    for idx in range(biggest_idx_to_include, len(phenos)):
        if phenos[idx]['pval'] < 5e-8:
            biggest_idx_to_include = idx
        elif idx < 10 and phenos[idx]['pval'] < 10 ** (-4 - idx//2): # formula is arbitrary
            biggest_idx_to_include = idx
        else:
            break
    return phenos[:biggest_idx_to_include + 1]
