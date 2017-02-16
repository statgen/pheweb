


'''
This script takes a file with the columns [chrom, pos, ...] (but no headers) and adds a column for nearest_gene.
'''

'''
TODO:
- should we only look at the distance to the start of the gene?
    - I've heard that it's common to only look at variants within 50kb of TSS, because that's where TFBS are concentrated.
- are these gene ranges the whole transcript, including UTRs?
'''

from .. import utils
conf = utils.conf

import intervaltree
import bisect
import os
import os.path
from boltons.fileutils import AtomicSaver
import boltons.iterutils


class BisectFinder(object):
    '''Given a list like [(123, 'foo'), (125, 'bar')...], BisectFinder helps you find the things before and after 124.'''
    def __init__(self, tuples):
        '''tuples is like [(123, 'foo'),...]'''
        tuples = sorted(tuples, key=lambda t:t[0])
        self._nums, self._values = list(zip(*tuples))
    def get_item_before(self, pos):
        '''If we get an exact match, let's return it'''
        idx = bisect.bisect_right(self._nums, pos) - 1 # note: bisect_{left,right} just deals with ties.
        if idx < 0: return None # It's fallen off the beginning!
        return (self._nums[idx], self._values[idx])
    def get_item_after(self, pos):
        if pos > self._nums[-1]: return None # it's fallen off the end!
        idx = bisect.bisect_left(self._nums, pos)
        return (self._nums[idx], self._values[idx])

class GeneAnnotator(object):
    def __init__(self, interval_tuples):
        '''intervals is like [('22', 12321, 12345, 'APOL1'), ...]'''
        self._its = {}
        self._gene_starts = {}
        self._gene_ends = {}
        for interval_tuple in interval_tuples:
            chrom, pos_start, pos_end, gene_name = interval_tuple
            assert isinstance(pos_start, int)
            assert isinstance(pos_end, int)
            if chrom not in self._its:
                self._its[chrom] = intervaltree.IntervalTree()
                self._gene_starts[chrom] = []
                self._gene_ends[chrom] = []
            self._its[chrom].add(intervaltree.Interval(pos_start, pos_end, gene_name))
            self._gene_starts[chrom].append((pos_start, gene_name))
            self._gene_ends[chrom].append((pos_end, gene_name))
        for chrom in self._its:
            self._gene_starts[chrom] = BisectFinder(self._gene_starts[chrom])
            self._gene_ends[chrom] = BisectFinder(self._gene_ends[chrom])

    def annotate_position(self, chrom, pos):
        if chrom == 'MT': chrom = 'M'
        if chrom not in self._its:
            return ''
        overlapping_genes = self._its[chrom].search(pos)
        if overlapping_genes:
            return ','.join(boltons.iterutils.unique_iter(og.data for og in overlapping_genes))
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


def annotate_genes(file_to_annotate, temp_file, output_file):
    '''All four args are filepaths'''
    ga = GeneAnnotator(utils.get_gene_tuples())
    with open(file_to_annotate) as in_f, \
         AtomicSaver(output_file, text_mode=True, part_file=temp_file, overwrite_part=True) as out_f:
        for line in in_f:
            line = line.rstrip('\n\r')
            fields = line.split('\t')
            chrom, pos = fields[0], int(fields[1])
            nearest_gene = ga.annotate_position(chrom, pos)
            out_f.write(line + '\t' + nearest_gene + '\n')


def run(argv):
    input_file = os.path.join(conf.data_dir, 'sites/cpra_rsids.tsv')
    output_file = os.path.join(conf.data_dir, 'sites/sites.tsv')
    temp_file = os.path.join(conf.data_dir, 'tmp/sites.tsv')
    genes_file = utils.get_cacheable_file_location(os.path.join(conf.data_dir, 'sites', 'genes'), 'genes.bed')

    def mod_time(fname):
        return os.stat(fname).st_mtime

    if os.path.exists(output_file) and max(mod_time(genes_file), mod_time(input_file)) <= mod_time(output_file):
        print('gene annotation is up-to-date!')
    else:
        annotate_genes(input_file, temp_file, output_file)
