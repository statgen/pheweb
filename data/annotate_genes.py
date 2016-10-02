#!/usr/bin/env python3

import intervaltree
import bisect
import csv
import os

class BisectFinder(object):
    '''Given a list like [(123, 'foo'), (125, 'bar')...], BisectFinder helps you find the things before and after 124.'''
    def __init__(self, tuples):
        '''tuples is like [(123, 'foo'),...]'''
        tuples = sorted(tuples, key=lambda t:t[0])
        self._nums, self._values = zip(*tuples)
    def get_item_before(self, pos):
        '''If we get an exact match, let's return it'''
        idx = bisect.bisect_right(self._nums, pos) - 1 # note: bisect_{left,right} just deals with ties.
        if idx < 0: return None # It's fallen off the beginning!
        return (self._nums[idx], self._values[idx])
    def get_item_after(self, pos):
        if pos > self._nums[-1]: return None # it's fallen off the end!
        idx = bisect.bisect_left(self._nums, pos)
        return (self._nums[idx], self._values[idx])

# TODO: try to make a class `IntervalTreeWithClosest`, and abstract everything else apart from that.
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
        # TODO: should this handle [pos_start, pos_end] because indels?
        if chrom == 'MT': chrom = 'M'
        if chrom not in self._its:
            return ''
        overlapping_genes = self._its[chrom].search(pos)
        if overlapping_genes:
            return ','.join(og.data for og in overlapping_genes)
        dist_to_nearest_gene_end, nearest_gene_end = self._gene_ends[chrom].get_item_before(pos)
        dist_to_nearest_gene_start, nearest_gene_start = self._gene_starts[chrom].get_item_after(pos)
        if dist_to_nearest_gene_end < dist_to_nearest_gene_start:
            return nearest_gene_end
        return nearest_gene_start

_legal_chroms = [str(i) for i in range(1,22+1)] + ['X', 'Y', 'M']
def get_interval_tuples(genes_file):
    with open(genes_file) as f:
        for row in csv.reader(f, delimiter='\t'):
            assert row[0] in _legal_chroms, row[0]
            yield (row[0], int(row[1]), int(row[2]), row[3])


def annotate_genes(file_to_annotate, temp_file, output_file, genes_file):
    '''All four args are filepaths'''
    ga = GeneAnnotator(get_interval_tuples('/Users/peter/tmp/gene-annotator/genes.bed'))
    with open(file_to_annotate) as in_f, \
         open(temp_file, 'w') as out_f:
        for line in in_f:
            line = line.rstrip('\n\r')
            fields = line.split('\t')
            chrom, pos = fields[0], int(fields[1])
            nearest_gene = ga.annotate_position(chrom, pos)
            out_f.write(line + '\t' + nearest_gene + '\n')
            os.fsync(out_f.fileno())
        os.rename(temp_file, output_file)

if __name__ == '__main__':
    annotate_genes('/Users/peter/tmp/gene-annotator/cpra_rsids.tsv', '/Users/peter/tmp/gene-annotator/tmp.tsv', '/Users/peter/tmp/gene-annotator/sites.tsv', '/Users/peter/tmp/gene-annotator/genes.bed')
