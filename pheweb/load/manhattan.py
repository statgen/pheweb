
'''
This script creates json files which can be used to render Manhattan plots.
'''

# TODO: combine with QQ.

from ..utils import chrom_order
from ..conf_utils import conf
from ..file_utils import VariantFileReader, write_json, common_filepaths
from .load_utils import MaxPriorityQueue, parallelize_per_pheno


import numpy as np
import math,time

def timeit(f):

    def timed(*args, **kw):

        ts = time.time()
        result = f(*args, **kw)
        te = time.time()

        print(f"func:{f.__name__}  took: {round(te-ts,4)} sec")
        return result

    return timed

@timeit
def run(argv):
    parallelize_per_pheno(
        get_input_filepaths = lambda pheno: common_filepaths['pheno'](pheno['phenocode']),
        get_output_filepaths = lambda pheno: common_filepaths['manhattan'](pheno['phenocode']),
        convert = create_manhattan,
        cmd = 'manhattan',
    )


@timeit
def create_manhattan(pheno):
    make_json_file(common_filepaths['pheno'](pheno['phenocode']), common_filepaths['manhattan'](pheno['phenocode']))

@timeit
def make_json_file(result_file, output_file, write_as_given=False):
    BIN_LENGTH = int(3e6)
    NEGLOG10_PVAL_BIN_SIZE = 0.05 # Use 0.05, 0.1, 0.15, etc
    NEGLOG10_PVAL_BIN_DIGITS = 2 # Then round to this many digits
    with VariantFileReader(result_file) as variants:
        variant_bins, unbinned_variants = bin_variants(
            variants,
            BIN_LENGTH,
            NEGLOG10_PVAL_BIN_SIZE,
            NEGLOG10_PVAL_BIN_DIGITS
        )
    np_label(unbinned_variants)

    rv = {
        'variant_bins': variant_bins,
        'unbinned_variants': unbinned_variants,
    }
    write_json(filepath=output_file, data=rv, write_as_given=write_as_given)

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
@timeit
def bin_variants(variant_iterator, bin_length, neglog10_pval_bin_size, neglog10_pval_bin_digits):
    bins = {}
    unbinned_variant_pq = MaxPriorityQueue()
    chrom_n_bins = {}

    def bin_variant(variant):
        chrom_key = chrom_order[variant['chrom']]
        pos_bin = variant['pos'] // bin_length
        chrom_n_bins[chrom_key] = max(chrom_n_bins.get(chrom_key,0), pos_bin)
        if (chrom_key, pos_bin) in bins:
            bin = bins[(chrom_key, pos_bin)]

        else:
            bin = {"chrom": variant['chrom'],
                   "startpos": pos_bin * bin_length,
                   "neglog10_pvals": set()}
            bins[(chrom_key, pos_bin)] = bin
        #TODO review with juha
        if 'mlogp' in variant:
            bin["neglog10_pvals"].add(round(variant['mlogp'] // neglog10_pval_bin_size * neglog10_pval_bin_size, neglog10_pval_bin_digits))
        else:
            bin["neglog10_pvals"].add(rounded_neglog10(variant['pval'], neglog10_pval_bin_size, neglog10_pval_bin_digits))

    # put most-significant variants into the priorityqueue and bin the rest
    hla_variant_pq =MaxPriorityQueue()
    gw_sig_pq = MaxPriorityQueue()
    for variant in variant_iterator:
        if variant['chrom']=="6" and variant['pos'] > conf.hla_begin and variant['pos'] < conf.hla_end:
            hla_variant_pq.add(variant, variant['pval'])
            if( len(hla_variant_pq) > conf.manhattan_hla_num_unbinned ):
                old = hla_variant_pq.pop()
                bin_variant(old)
            continue
        else:
            unbinned_variant_pq.add(variant, variant['pval'])
            if len(unbinned_variant_pq) > conf.manhattan_num_unbinned:
                old = unbinned_variant_pq.pop()
                if old['pval'] < conf.manhattan_unbin_anyway_pval:
                    unbinned_variant_pq.add(old, old['pval'])
                else:
                    bin_variant(old)

    max_p = unbinned_variant_pq.peek()
    add_hla = list(hla_variant_pq.pop_all())
    for v in filter(lambda x: x['pval']<=max_p['pval'], add_hla ):
        unbinned_variant_pq.add(v, v['pval'])
    unbinned_variants = list(unbinned_variant_pq.pop_all())

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


@timeit
def np_label(variants,check = False):

    chroms = {}
    print(len(variants))
    for v in variants:
    #kind of like a defaultdict. if it's the first variant of the chromosome it initalizes an empty list.
    #Now that the value must be a list, we can just append the variant to the chrom specific variant list
        chroms.setdefault(v['chrom'], []).append(v)

    peak_variants = []
    for vs in chroms.values():
        print(f"chrom:{vs[0]['chrom']}")

        #iniitalize pval,pos array
        var_array = np.zeros((len(vs),2))
        pos_dict = {}
        for i,v in enumerate(vs):
            var_array[i] = v['pos'],v['pval']
            pos_dict[v['pos']] = v
        while len(var_array):
            # work with arrays to check results are identical
            #returns best hit?
            min_pval_idx = np.argmin(var_array[:,1])
            pos = var_array[min_pval_idx][0]
            # filter variants based on pos of best hit
            filter_mask = np.abs(var_array[:,0] - pos) > conf.within_pheno_mask_around_peak
            var_array = var_array[filter_mask]
            # return variant from that position
            best_assoc = pos_dict[pos]
            best_assoc['peak'] = True
            peak_variants.append(best_assoc)

    if check or len(variants) < 1000:
        assert label_peaks(variants) == peak_variants
        print('new method works')

def label_peaks(variants):

    chroms = {}
    print(len(variants))
    peak_variants = []
    for v in variants:
        #kind of like a defaultdict. if it's the first variant of the chromosome it initalizes an empty list.
        #Now that the value must be a list, we can just append the variant to the chrom specific variant list
        chroms.setdefault(v['chrom'], []).append(v)


    for vs in chroms.values():
        print(f"chrom:{vs[0]['chrom']}")
        while vs:
            best_assoc = min(vs, key=lambda assoc: assoc['pval'])
            #best_assoc['peak'] = True
            vs = [v for v in vs if abs(v['pos'] - best_assoc['pos']) > conf.within_pheno_mask_around_peak]
            peak_variants.append(best_assoc)

    return peak_variants
