
'''
This script creates json files which can be used to render Manhattan plots.
'''

# TODO: combine with QQ?

from .. import utils
conf = utils.conf

import os
import json
import math
import datetime
import multiprocessing
import csv
import collections
import bisect
from boltons.fileutils import mkdir_p, AtomicSaver
import blist

class Heap():
    def __init__(self):
        self._q = blist.blist()
        self._items = {}
        self._idx = 0

    def add(self, item, priority):
        idx = self._idx
        self._idx += 1
        if not self._q or -priority < self._q[0][0]:
            self._q.insert(0, (-priority, idx))
        else:
            bisect.insort(self._q, (-priority, idx))
        self._items[idx] = item

    def pop(self):
        priority, idx = self._q.pop(0)
        return self._items.pop(idx)

    def __len__(self):
        return len(self._q)

    def __iter__(self):
        while self._q:
            yield self.pop()


def rounded_neglog10(pval, neglog10_pval_bin_size, neglog10_pval_bin_digits):
    return round(-math.log10(pval) // neglog10_pval_bin_size * neglog10_pval_bin_size, neglog10_pval_bin_digits)


def get_pvals_and_pval_extents(pvals, neglog10_pval_bin_size):
    # expects that NEGLOG10_PVAL_BIN_SIZE is the distance between adjacent bins.
    pvals = sorted(pvals)
    extents = [[pvals[0], pvals[0]]]
    for p in pvals:
        if extents[-1][1] + neglog10_pval_bin_size * 1.1 > p:
            extents[-1][1] = p
        else:
            extents.append([p,p])
    rv_pvals, rv_pval_extents = [], []
    for (start, end) in extents:
        if start == end:
            rv_pvals.append(start)
        else:
            rv_pval_extents.append([start,end])
    return (rv_pvals, rv_pval_extents)


# TODO: convert bins from {(chrom, pos): []} to {chrom:{pos:[]}}?
def bin_variants(variant_iterator, bin_length, n_unbinned, neglog10_pval_bin_size, neglog10_pval_bin_digits):
    bins = {}
    unbinned_variant_heap = Heap()
    chrom_n_bins = {}

    def bin_variant(variant):
        chrom = variant.chrom
        chrom_key = utils.chrom_order[chrom]
        pos_bin = variant.pos // bin_length
        chrom_n_bins[chrom_key] = max(chrom_n_bins.get(chrom_key,0), pos_bin)
        if (chrom_key, pos_bin) in bins:
            bin = bins[(chrom_key, pos_bin)]

        else:
            bin = {"chrom": chrom,
                   "startpos": pos_bin * bin_length,
                   "neglog10_pvals": set()}
            bins[(chrom_key, pos_bin)] = bin
        bin["neglog10_pvals"].add(rounded_neglog10(variant.pval, neglog10_pval_bin_size, neglog10_pval_bin_digits))

    # put most-significant variants into the heap and bin the rest
    for variant in variant_iterator:
        unbinned_variant_heap.add(variant, variant.pval)
        if len(unbinned_variant_heap) > n_unbinned:
            old = unbinned_variant_heap.pop()
            bin_variant(old)

    unbinned_variants = []
    for variant in unbinned_variant_heap:
        rec = variant.other
        rec['chrom'] = variant.chrom
        rec['pos'] = variant.pos
        rec['pval'] = utils.round_sig(variant.pval, 2)
        unbinned_variants.append(rec)

    # unroll bins into simple array (preserving chromosomal order)
    binned_variants = []
    for chrom_key in sorted(chrom_n_bins.keys()):
        for pos_key in range(int(1+chrom_n_bins[chrom_key])):
            b = bins.get((chrom_key, pos_key), None)
            if b and len(b['neglog10_pvals']) != 0:
                b['neglog10_pvals'], b['neglog10_pval_extents'] = get_pvals_and_pval_extents(b['neglog10_pvals'], neglog10_pval_bin_size)
                b['pos'] = int(b['startpos'] + bin_length/2)
                del b['startpos']
                binned_variants.append(b)

    return binned_variants, unbinned_variants


AssocResult = collections.namedtuple('AssocResult', 'chrom pos pval other'.split())
def get_variants(f):
    reader = csv.DictReader(f, delimiter='\t')
    for v in reader:
        chrom = v.pop('chrom')
        pos = int(v.pop('pos'))
        try:
            pval = float(v.pop('pval'))
        except ValueError:
            continue
        for key in ['maf', 'beta', 'sebeta']:
            try:
                v[key] = float(v[key])
            except (ValueError, KeyError):
                continue
        yield AssocResult(chrom, pos, pval, v)


@utils.star_kwargs
def make_json_file(src_filename, dest_filename):

    BIN_LENGTH = int(3e6)
    NEGLOG10_PVAL_BIN_SIZE = 0.05 # Use 0.05, 0.1, 0.15, etc
    NEGLOG10_PVAL_BIN_DIGITS = 2 # Then round to this many digits
    N_UNBINNED = 2000

    with open(src_filename) as f:
        variants = get_variants(f)
        variant_bins, unbinned_variants = bin_variants(
            variants, BIN_LENGTH, N_UNBINNED, NEGLOG10_PVAL_BIN_SIZE, NEGLOG10_PVAL_BIN_DIGITS)

    rv = {
        'variant_bins': variant_bins,
        'unbinned_variants': unbinned_variants,
    }

    tmp_fname = os.path.join(conf.data_dir, 'tmp', 'manhattan-' + os.path.basename(dest_filename))
    with AtomicSaver(dest_filename, text_mode=True, part_file=tmp_fname, overwrite_part=True) as f:
        json.dump(rv, f)

    print('{}\t{} -> {}'.format(datetime.datetime.now(), src_filename, dest_filename))


def get_conversions_to_do():
    phenocodes = [pheno['phenocode'] for pheno in utils.get_phenolist()]
    for phenocode in phenocodes:
        src_filename = os.path.join(conf.data_dir, 'augmented_pheno', phenocode)
        dest_filename = os.path.join(conf.data_dir, 'manhattan', '{}.json'.format(phenocode))
        if not os.path.exists(dest_filename) or os.stat(dest_filename).st_mtime < os.stat(src_filename).st_mtime:
            yield {
                'src_filename': src_filename,
                'dest_filename': dest_filename,
            }


def run(argv):

    mkdir_p(conf.data_dir + '/manhattan')
    mkdir_p(conf.data_dir + '/tmp')

    conversions_to_do = list(get_conversions_to_do())
    print('number of phenos to process:', len(conversions_to_do))
    with multiprocessing.Pool(utils.get_num_procs()) as p:
        p.map(make_json_file, conversions_to_do)
