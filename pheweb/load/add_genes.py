
'''
This script takes a file with the columns [chrom, pos, ...] (but no headers) and adds the field `gene`.
'''

from ..utils import get_gene_tuples
from ..file_utils import VariantFileReader, VariantFileWriter, get_filepath
from .load_utils import mtime

from intervaltree import IntervalTree, Interval
import bisect
import os
import os.path
import boltons.iterutils
from typing import List,Tuple,Optional,Dict,Iterator
Chrom = str
GeneName = str


class BisectFinder(object):
    '''Given a list like [(123, 'foo'), (125, 'bar')...], BisectFinder helps you find the things before and after 124.'''
    def __init__(self, tuples:List[Tuple[int,str]]):
        '''tuples is like [(123, 'foo'),...]'''
        tuples = sorted(tuples, key=lambda t:t[0])
        self._nums, self._values = list(zip(*tuples))
    def get_item_before(self, pos:int) -> Optional[Tuple[int,str]]:
        '''If we get an exact match, let's return it'''
        idx = bisect.bisect_right(self._nums, pos) - 1 # note: bisect_{left,right} just deals with ties.
        if idx < 0: return None # It's fallen off the beginning!
        return (self._nums[idx], self._values[idx])
    def get_item_after(self, pos:int) -> Optional[Tuple[int,str]]:
        if pos > self._nums[-1]: return None # it's fallen off the end!
        idx = bisect.bisect_left(self._nums, pos)
        return (self._nums[idx], self._values[idx])

class GeneAnnotator(object):
    def __init__(self, interval_tuples:Iterator[Tuple[Chrom,int,int,GeneName]]):
        '''interval_tuples is like [('22', 12321, 12345, 'APOL1'), ...]'''
        self._its: Dict[Chrom,IntervalTree] = {}
        gene_start_tuples_by_chrom: Dict[Chrom,List[Tuple[int,GeneName]]] = {}
        gene_end_tuples_by_chrom: Dict[Chrom,List[Tuple[int,GeneName]]] = {}
        for (chrom, pos_start, pos_end, gene_name) in interval_tuples:
            if chrom not in self._its:
                self._its[chrom] = IntervalTree()
                gene_start_tuples_by_chrom[chrom] = []
                gene_end_tuples_by_chrom[chrom] = []
            self._its[chrom].add(Interval(pos_start, pos_end, gene_name))
            gene_start_tuples_by_chrom[chrom].append((pos_start, gene_name))
            gene_end_tuples_by_chrom[chrom].append((pos_end, gene_name))
        self._gene_starts = {chrom:BisectFinder(tuples) for chrom,tuples in gene_start_tuples_by_chrom.items()}
        self._gene_ends = {chrom:BisectFinder(tuples) for chrom,tuples in gene_end_tuples_by_chrom.items()}

    def annotate_position(self, chrom:str, pos:int) -> str:
        if chrom == 'MT': chrom = 'M'
        if chrom not in self._its:
            return ''
        overlapping_genes = self._its[chrom].at(pos) if hasattr(self._its[chrom], 'at') else self._its[chrom].search(pos) # support intervaltree 2.x and 3.x
        if overlapping_genes:
            return ','.join(sorted(boltons.iterutils.unique_iter(og.data for og in overlapping_genes)))
        nearest_gene_end = self._gene_ends[chrom].get_item_before(pos)
        nearest_gene_start = self._gene_starts[chrom].get_item_after(pos)
        if nearest_gene_end is None or nearest_gene_start is None:
            if nearest_gene_end is not None: return nearest_gene_end[1]
            if nearest_gene_start is not None: return nearest_gene_start[1]
            print('This is very surprising - {!r} {!r}'.format(chrom, pos))
            return ''
        dist_to_nearest_gene_end = abs(nearest_gene_end[0] - pos)
        dist_to_nearest_gene_start = abs(nearest_gene_start[0] - pos)
        if dist_to_nearest_gene_end < dist_to_nearest_gene_start:
            return nearest_gene_end[1]
        return nearest_gene_start[1]


def annotate_genes(in_filepath:str, out_filepath:str) -> None:
    '''Both args are filepaths'''
    ga = GeneAnnotator(get_gene_tuples())
    with VariantFileWriter(out_filepath) as out_f, \
         VariantFileReader(in_filepath) as variants:
        for v in variants:
            v['nearest_genes'] = ga.annotate_position(v['chrom'], v['pos'])
            out_f.write(v)

def run(argv:List[str]) -> None:

    if '-h' in argv or '--help' in argv:
        print('Annotate the sites file with nearest genes.  Fetches the relevant version of Gencode if not already present.')
        exit(1)

    input_filepath = get_filepath('sites-rsids')
    genes_filepath = get_filepath('genes', must_exist=False)
    out_filepath = get_filepath('sites', must_exist=False)

    if not os.path.exists(genes_filepath):
        print('Fetching genes...')
        from . import download_genes
        download_genes.run([])

    if os.path.exists(out_filepath) and max(mtime(genes_filepath), mtime(input_filepath)) <= mtime(out_filepath):
        print('gene annotation is up-to-date!')
    else:
        annotate_genes(input_filepath, out_filepath)
