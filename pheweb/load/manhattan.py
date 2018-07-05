
'''
This script creates json files which can be used to render Manhattan plots.
'''

# NOTE: `qval` means `-log10(pvalue)`

# TODO: optimize binning for fold@20 view.
#       - if we knew the max_qval before we started (eg, by running qq first), it would be very easy.
#       - at present, we set qval bin size well for the [0-40] range but not for variants above that.

from ..utils import chrom_order
from ..conf_utils import conf
from ..file_utils import VariantFileReader, write_json, common_filepaths
from .load_utils import MaxPriorityQueue, parallelize_per_pheno

import math

BIN_LENGTH = int(3e6)

QVAL_BIN_BASE_SIZE = 0.05 # Use 0.05, 0.1, 0.15, etc
QVAL_BIN_DIGITS = 2 # Then round to this many digits
QVAL_MIN_NUM_BINS = 200 # Try to keep at least this many bins for [0 - min(40,max_qval)]


def run(argv):
    parallelize_per_pheno(
        get_input_filepaths = lambda pheno: common_filepaths['pheno'](pheno['phenocode']),
        get_output_filepaths = lambda pheno: common_filepaths['manhattan'](pheno['phenocode']),
        convert = make_json_file,
        cmd = 'manhattan',
    )


def make_json_file(pheno):

    with VariantFileReader(common_filepaths['pheno'](pheno['phenocode'])) as variants:
        variant_bins, unbinned_variants = bin_variants(variants)
    label_peaks(unbinned_variants)
    rv = {
        'variant_bins': variant_bins,
        'unbinned_variants': unbinned_variants,
    }

    write_json(filepath=common_filepaths['manhattan'](pheno['phenocode']), data=rv)


def rounded_neglog10(pval, qval_bin_size):
    return round(-math.log10(pval) // qval_bin_size * qval_bin_size, QVAL_BIN_DIGITS)


def get_pvals_and_pval_extents(pvals, qval_bin_size):
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


# TODO: convert bins from {(chrom, pos): []} to {chrom:{pos:[]}} to eliminate `chrom_n_bins` ?
def bin_variants(variant_iterator):
    bins = {}
    unbinned_variant_pq = MaxPriorityQueue()
    chrom_n_bins = {}
    qval_bin_size = QVAL_BIN_BASE_SIZE
    min_pval = 0.999 # almost 1, but avoids divide-by-zero errors

    def bin_variant(variant):
        chrom_key = chrom_order[variant['chrom']]
        pos_bin = variant['pos'] // BIN_LENGTH
        chrom_n_bins[chrom_key] = max(chrom_n_bins.get(chrom_key,0), pos_bin)
        if (chrom_key, pos_bin) in bins:
            bin = bins[(chrom_key, pos_bin)]

        else:
            bin = bins[(chrom_key, pos_bin)] = {"chrom": variant['chrom'],
                                                "startpos": pos_bin * BIN_LENGTH,
                                                "qvals": set()}
        bin["qvals"].add(rounded_neglog10(variant['pval'], qval_bin_size))

    # put most-significant variants into the priorityqueue and bin the rest
    for variant in variant_iterator:
        if variant['pval'] < min_pval and variant['pval'] != 0:
            min_pval = variant['pval']
            # if this new min_pval gives us 2x+ as many qval_bins as we need,
            # then double the qval_bin_size and re-bin all qvals we currently have
            if min(40, -math.log10(min_pval)) / qval_bin_size >= QVAL_MIN_NUM_BINS * 2:
                qval_bin_size *= 2
                for bin in bins:
                    bin['qvals'] = {rounded_neglog10(qval, qval_bin_size) for qval in bin['qvals']}
        unbinned_variant_pq.add(variant, variant['pval'])
        if len(unbinned_variant_pq) > conf.manhattan_num_unbinned:
            old = unbinned_variant_pq.pop()
            bin_variant(old)

    unbinned_variants = list(unbinned_variant_pq.pop_all())

    # unroll bins into simple array (preserving chromosomal order)
    binned_variants = []
    for chrom_key in sorted(chrom_n_bins.keys()):
        for pos_key in range(int(1+chrom_n_bins[chrom_key])):
            b = bins.get((chrom_key, pos_key), None)
            if b and len(b['qvals']) != 0:
                b['qvals'], b['qval_extents'] = get_pvals_and_pval_extents(b['qvals'], qval_bin_size)
                b['pos'] = int(b['startpos'] + BIN_LENGTH/2)
                del b['startpos']
                binned_variants.append(b)

    return binned_variants, unbinned_variants


# TODO: rename `peak` to `loci`?
def label_peaks(variants):
    chroms = {}
    for v in variants:
        chroms.setdefault(v['chrom'], []).append(v)
    for vs in chroms.values():
        while vs:
            best_assoc = min(vs, key=lambda assoc: assoc['pval'])
            best_assoc['peak'] = True
            vs = [v for v in vs if abs(v['pos'] - best_assoc['pos']) > conf.within_pheno_mask_around_peak]
