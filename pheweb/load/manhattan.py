
'''
This script creates json files which can be used to render Manhattan plots.
'''

# NOTE: `qval` means `-log10(pvalue)`

# TODO: optimize binning for fold@20 view.
#       - if we knew the max_qval before we started (eg, by running qq first), it would be very easy.
#       - at present, we set qval bin size well for the [0-40] range but not for variants above that.
# TODO: combine with QQ?

from ..utils import chrom_order
from ..conf_utils import conf
from ..file_utils import VariantFileReader, write_json, common_filepaths
from .load_utils import MaxPriorityQueue, parallelize_per_pheno

import math

BIN_LENGTH = int(3e6)

QVAL_STARTING_BIN_SIZE = 0.05
QVAL_BIN_ROUND_DIGITS = 2
QVAL_NUM_BINS = 200 # Number of bins for [0 - min(40,max_qval)]


def run(argv):
    if '-h' in argv or '--help' in argv:
        print('Make a Manhattan plot for each phenotype.')
        exit(1)

    parallelize_per_pheno(
        get_input_filepaths = lambda pheno: common_filepaths['pheno'](pheno['phenocode']),
        get_output_filepaths = lambda pheno: common_filepaths['manhattan'](pheno['phenocode']),
        convert = make_manhattan_json_file,
        cmd = 'manhattan',
    )


def make_manhattan_json_file(pheno):
    make_manhattan_json_file_explicit(common_filepaths['pheno'](pheno['phenocode']),
                                      common_filepaths['manhattan'](pheno['phenocode']))
def make_manhattan_json_file_explicit(in_filepath, out_filepath):
    binner = Binner()
    with VariantFileReader(in_filepath) as variants:
        for variant in variants:
            binner.process_variant(variant)
    data = binner.get_result()
    write_json(filepath=out_filepath, data=data)


class Binner:
    def __init__(self):
        self._peak_best_variant = None
        self._peak_last_chrpos = None
        self._peak_pq = MaxPriorityQueue()
        self._unbinned_variant_pq = MaxPriorityQueue()
        self._bins = {} # like {<chrom>: {<pos // bin_length>: [{chrom, startpos, qvals}]}}

    def process_variant(self, variant):
        '''
        There are 3 types of variants:
          a) If the variant starts or extends a peak and has a stronger pval than the current `peak_best_variant`:
             1) push the old `peak_best_variant` into `unbinned_variant_pq`.
             2) make the current variant the new `peak_best_variant`.
          b) If the variant ends a peak, push `peak_best_variant` into `peak_pq` and push the current variant into `unbinned_variant_pq`.
          c) Otherwise, just push the variant into `unbinned_variant_pq`.
        Whenever `peak_pq` exceeds the size `conf.manhattan_peak_max_count`, push its member with the weakest pval into `unbinned_variant_pq`.
        Whenever `unbinned_variant_pq` exceeds the size `conf.manhattan_num_unbinned`, bin its member with the weakest pval.
        So, at the end, we'll have `peak_pq`, `unbinned_variant_pq`, and `bins`.
        '''

        if variant['pval'] < conf.manhattan_peak_pval_threshold: # part of a peak
            if self._peak_best_variant is None: # open a new peak
                self._peak_best_variant = variant
                self._peak_last_chrpos = (variant['chrom'], variant['pos'])
            elif self._peak_last_chrpos[0] == variant['chrom'] and self._peak_last_chrpos[1] + conf.manhattan_peak_sprawl_dist > variant['pos']: # extend current peak
                self._peak_last_chrpos = (variant['chrom'], variant['pos'])
                if variant['pval'] >= self._peak_best_variant['pval']:
                    self._maybe_bin_variant(variant)
                else:
                    self._maybe_bin_variant(self._peak_best_variant)
                    self._peak_best_variant = variant
            else: # close old peak and open new peak
                self._maybe_peak_variant(self._peak_best_variant)
                self._peak_best_variant = variant
                self._peak_last_chrpos = (variant['chrom'], variant['pos'])
        else:
            self._maybe_bin_variant(variant)

    def _maybe_peak_variant(self, variant):
        self._peak_pq.add_and_keep_size(variant, variant['pval'],
                                        size=conf.manhattan_peak_max_count,
                                        popped_callback=self._maybe_bin_variant)
    def _maybe_bin_variant(self, variant):
        self._unbinned_variant_pq.add_and_keep_size(variant, variant['pval'],
                                                    size=conf.manhattan_num_unbinned,
                                                    popped_callback=self._bin_variant)
    def _bin_variant(self, variant):
        chrom_idx = chrom_order[variant['chrom']]
        if chrom_idx not in self._bins: self._bins[chrom_idx] = {}
        pos_bin_id = variant['pos'] // BIN_LENGTH
        if pos_bin_id not in self._bins[chrom_idx]:
            self._bins[chrom_idx][pos_bin_id] = {'chrom': variant['chrom'], 'startpos': pos_bin_id * BIN_LENGTH, 'qvals': set()}
        qval = self.rounded_neglog10(variant['pval'])
        self._bins[chrom_idx][pos_bin_id]["qvals"].add(qval)

    def get_result(self):
        self.get_result = None # this can only be called once

        if self._peak_best_variant:
            self._maybe_peak_variant(self._peak_best_variant)

        peaks = list(self._peak_pq.pop_all())
        for peak in peaks: peak['peak'] = True
        unbinned_variants = list(self._unbinned_variant_pq.pop_all())
        unbinned_variants = sorted(unbinned_variants + peaks, key=(lambda variant: variant['pval']))

        # Compute a new qval_bin_size.
        min_nonzero_pval = next(v['pval'] for v in unbinned_variants if v['pval'] != 0)
        max_qval_or_40 = 40 if min_nonzero_pval <= 10**-40 else -math.log10(min_nonzero_pval)
        qval_bin_size = max_qval_or_40 / QVAL_NUM_BINS # keep at least QVAL_NUM_BINS in default scaled range [0-min(40,max_qval)]
        qval_bin_size = round(qval_bin_size // QVAL_STARTING_BIN_SIZE * QVAL_STARTING_BIN_SIZE, 2) # use a multiple of QVAL_STARTING_BIN_SIZE to avoid stripes
        qval_bin_size = max(qval_bin_size, QVAL_STARTING_BIN_SIZE) # never go below QVAL_STARTING_BIN_SIZE

        # unroll dict-of-dict-of-array `bins` into array `variant_bins`
        variant_bins = []
        for chrom_idx in sorted(self._bins.keys()):
            for pos_bin_id in sorted(self._bins[chrom_idx].keys()):
                b = self._bins[chrom_idx][pos_bin_id]
                assert len(b['qvals']) > 0
                b['qvals'] = [round(qval // qval_bin_size * qval_bin_size, QVAL_BIN_ROUND_DIGITS) for qval in b['qvals']]
                b['qvals'], b['qval_extents'] = self._get_pvals_and_pval_extents(b['qvals'], qval_bin_size)
                b['pos'] = int(b['startpos'] + BIN_LENGTH/2)
                del b['startpos']
                variant_bins.append(b)

        return {
            'variant_bins': variant_bins,
            'unbinned_variants': unbinned_variants,
        }

    @staticmethod
    def rounded_neglog10(pval):
        return round(-math.log10(pval) // QVAL_STARTING_BIN_SIZE * QVAL_STARTING_BIN_SIZE,
                     QVAL_BIN_ROUND_DIGITS)

    @staticmethod
    def _get_pvals_and_pval_extents(pvals, qval_bin_size):
        # expects that QVAL_BIN_SIZE is the distance between adjacent bins.
        pvals = sorted(pvals)
        extents = [[pvals[0], pvals[0]]]
        for p in pvals:
            if extents[-1][1] + qval_bin_size * 1.1 > p:
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
