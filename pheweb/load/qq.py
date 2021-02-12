
'''
This script creates json files which can be used to render QQ plots.
'''

# TODO: share the `VariantFileReader` with `manhattan.py`.
# TODO: make gc_lambda for maf strata, and show them if they're >1.1?
# TODO: copy some changes from <https://github.com/statgen/encore/blob/master/plot-epacts-output/make_qq_json.py>

# TODO: Reduce memory usage by binning the (twosigfigs(maf), rounded(neglogpval,2)) for all variants with neglogpval<2.
#       If manhattan and qq were computed together, we could re-use some information from the first pass.


# NOTE: `qval` means `-log10(pvalue)`

from ..utils import round_sig, approx_equal, get_phenolist, PheWebError
from ..file_utils import VariantFileReader, write_json, get_pheno_filepath
from .load_utils import get_maf, parallelize_per_pheno, get_phenos_subset

from typing import Dict,Any,List,Iterator,Set,Tuple
import argparse, itertools
import boltons.mathutils
import boltons.iterutils
import math
import scipy.stats
import numpy as np

NUM_BINS = 400
NUM_MAF_RANGES = 4


def run(argv:List[str]) -> None:
    parser = argparse.ArgumentParser(description="Make a QQ plot for each phenotype.")
    parser.add_argument('--phenos', help="Can be like '4,5,6,12' or '4-6,12' to run on only the phenos at those positions (0-indexed) in pheno-list.json (and only if they need to run)")
    args = parser.parse_args(argv)

    phenos = get_phenos_subset(args.phenos) if args.phenos else get_phenolist()

    parallelize_per_pheno(
        get_input_filepaths = lambda pheno: get_pheno_filepath('pheno_gz', pheno['phenocode']),
        get_output_filepaths = lambda pheno: get_pheno_filepath('qq', pheno['phenocode'], must_exist=False),
        convert = make_json_file,
        cmd = 'qq',
        phenos = phenos,
    )


def make_json_file(pheno:Dict[str,Any]) -> None:
    make_json_file_explicit(
        get_pheno_filepath('pheno_gz', pheno['phenocode']),
        get_pheno_filepath('qq', pheno['phenocode'], must_exist=False),
        pheno
    )

def make_json_file_explicit(in_filepath:str, out_filepath:str, pheno:Dict[str,Any]) -> None:
    # Store all variants in a dataframe with columns (qval, maf) or just (qval)
    variants = get_variants_df(in_filepath, pheno)
    rv: Dict[str,Any] = {}
    if 'maf' in variants.dtype.fields:  # type:ignore
        rv['by_maf'] = make_qq_stratified(variants)
        rv['overall'] = make_qq_unstratified(variants, include_qq=False)  # Must run AFTER `_stratified()`, because it sorts by qval, which could bias the maf_range strata.
        rv['ci'] = list(get_confidence_intervals(len(variants) / len(rv['by_maf'])))
    else:
        rv['overall'] = make_qq_unstratified(variants, include_qq=True)
        rv['ci'] = list(get_confidence_intervals(len(variants)))
    write_json(filepath=out_filepath, data=rv)

def get_variants_df(in_filepath:str, pheno:Dict[str,Any]) -> np.ndarray:
    # I'm making a dataframe with either the columns [qval maf] or just [qval], depending on whether we can calculate maf from the fields we have.
    # I use float32 because I have no use for more precision, and I want to 100M variants in <1GB.  (ie, <10bytes/variant)
    # I'm avoid pandas because it's a little fragile and magic and it was broken on my mac.
    # And anyways pd.DataFrame() allows passing in an iterator, but then it just calls list() on it, so it temporarily uses python's list overhead.
    # Instead, I'm using np.fromiter() to make a "structured array".
    with VariantFileReader(in_filepath) as variant_dicts:
        try: first_variant = next(iter(variant_dicts))
        except StopIteration: raise PheWebError("No variants found in {}".format(in_filepath))
    has_maf = get_maf(first_variant, pheno) is not None
    if has_maf:
        return np.fromiter(get_maf_qval_pairs(in_filepath, pheno), dtype=[('maf',np.float32),('qval',np.float32)])
    else:
        return np.fromiter((qval for maf,qval in get_maf_qval_pairs(in_filepath, pheno)), dtype=[('qval',np.float32)])
def get_maf_qval_pairs(in_filepath:str, pheno:Dict[str,Any]) -> Iterator[Tuple[float,float]]:
    with VariantFileReader(in_filepath) as variant_dicts:
        for v in variant_dicts:
            maf: float = get_maf(v, pheno) or 0
            qval: float = 1000 if v['pval']==0 else -math.log10(v['pval'])
            yield (maf, qval)


def make_qq_stratified(variants:np.ndarray) -> List[Dict[str,Any]]:
    # `variants.sort(order=['maf'])` breaks ties with remaining column 'qval', which biases the qq for the different maf slices.  Unacceptable.
    # We could fix that by shuffling all the tied rows at maf_range borders.
    # `sorted_mafs = np.sort(variants['maf'])` would require us to deal with ties.  Inconvenient.
    # I want the behavior of `pd.sort_values(by='mf', inplace=True, ignore_index=True)` but without requiring pandas.
    # This is the only way I could find to sort by only one column in numpy, and it's quite inefficient:
    variants = variants[np.argsort(variants['maf'])]

    def make_strata(idx:int) -> Dict[str,Any]:
        # Note: slice_indices[1] is the same as slice_indices[0] of the next slice.
        # But that's not a problem, because range() ignores the last index.
        slice_indices = (len(variants) * idx//NUM_MAF_RANGES,
                         len(variants) * (idx+1)//NUM_MAF_RANGES)
        qvals = variants['qval'][slice_indices[0]:slice_indices[1]].copy()  # Make sure to copy so we don't modify `variants`.
        qvals *= -1; qvals.sort(); qvals *= -1  # lol, sort descending
        return {
            'maf_range': (variants['maf'][slice_indices[0]],
                          variants['maf'][slice_indices[1]-1]),
            'count': len(qvals),
            'qq': compute_qq(qvals),
        }

    return [make_strata(i) for i in range(NUM_MAF_RANGES)]

def make_qq_unstratified(variants:np.ndarray, include_qq:bool) -> Dict[str,Any]:
    variants[::-1].sort(order=['qval'])  # Sort descending.
    qvals = variants['qval']
    rv: Dict[str,Any] = {}
    if include_qq:
        rv['qq'] = compute_qq(qvals)
    rv['count'] = len(qvals)
    rv['gc_lambda'] = {}
    for perc in ['0.5', '0.1', '0.01', '0.001']:
        gc = gc_value_from_list(qvals, float(perc))
        if math.isnan(gc) or abs(gc) == math.inf:
            print('WARNING: got gc_value {!r}'.format(gc))
        else:
            rv['gc_lambda'][perc] = round_sig(gc, 5)
    return rv


def compute_qq(qvals:np.ndarray) -> Dict[str,Any]:
    # qvals must be in decreasing order.
    # Decreasing order (from strongest pvalue to weakest) works well because we it lets us use `(idx+0.5)/len(qvals)` as the expected pvalue.
    assert all(a >= b for a,b in boltons.iterutils.pairwise_iter(qvals))

    if len(qvals) == 0 or qvals[0] == 0:
        return {}  # the js detects that the values for each key are undefined

    max_exp_qval = -math.log10(0.5 / len(qvals))
    # Our QQ plot will only show `obs_qval` up to `ceil(2*max_exp_pval)`.
    # So we can drop any obs_qval above that, to save space and make sure the visible range gets all the NUM_BINS.

    # this calculation must avoid dropping points that would be shown by the calculation done in javascript.
    # `max_obs_qval` means the largest observed -log10(pvalue) that will be shown in the plot. It's usually NOT the largest in the data.
    max_obs_qval = boltons.mathutils.clamp(qvals[0],
                                           lower = max_exp_qval,
                                           upper = math.ceil(2*max_exp_qval))
    if qvals[0] > max_obs_qval:
        for qval in qvals:
            if qval <= max_obs_qval:
                max_obs_qval = qval
                break

    occupied_bins: Set[Tuple[int,int]] = set()
    for i, obs_qval in enumerate(qvals):
        if obs_qval > max_obs_qval: continue
        exp_qval = -math.log10( (i+0.5) / len(qvals))
        exp_bin = int(exp_qval / max_exp_qval * NUM_BINS)
        # TODO: it'd be great if the `obs_bin`s started right at the lowest qval in that `exp_bin`.
        #       that way we could have fewer bins but still get a nice straight diagonal line without that stair-stepping appearance.
        obs_bin = int(obs_qval / max_obs_qval * NUM_BINS)
        occupied_bins.add( (exp_bin,obs_bin) )

    bins = []
    for exp_bin, obs_bin in occupied_bins:
        assert 0 <= exp_bin <= NUM_BINS, exp_bin
        assert 0 <= obs_bin <= NUM_BINS, obs_bin
        bins.append((
            exp_bin / NUM_BINS * max_exp_qval,
            obs_bin / NUM_BINS * max_obs_qval
        ))
    bins.sort()
    return {
        'bins': bins,
        'max_exp_qval': max_exp_qval,
    }


def gc_value_from_list(qvals:List[float], quantile:float = 0.5) -> float:
    # qvals must be in decreasing order.
    assert all(a >= b for a,b in boltons.iterutils.pairwise_iter(qvals))
    qval = qvals[int(len(qvals) * quantile)]
    pval = 10 ** -qval
    return gc_value(pval, quantile)
def gc_value(pval:float, quantile:float = 0.5) -> float:
    # This should be equivalent to this R: `qchisq(median_pval, df=1, lower.tail=F) / qchisq(quantile, df=1, lower.tail=F)`
    return scipy.stats.chi2.ppf(1 - pval, 1) / scipy.stats.chi2.ppf(1 - quantile, 1)
assert approx_equal(gc_value(0.49), 1.047457) # I computed these using that R code.
assert approx_equal(gc_value(0.5), 1)
assert approx_equal(gc_value(0.50001), 0.9999533)
assert approx_equal(gc_value(0.6123), 0.5645607)



def get_confidence_intervals(num_variants:float, confidence:float = 0.95) -> Iterator[Dict[str,float]]:
    one_sided_doubt = (1-confidence) / 2

    # `variant_counts` are the numbers of variants at which we'll calculate the confidence intervals
    # any `1 <= variant_count <= num_variants-1` could be used, but we scale in powers of 2 to make the CI visually pretty smooth.
    variant_counts = []
    for x in range(0, int(math.ceil(math.log2(num_variants)))):
        variant_counts.append(2**x)
    variant_counts.append(num_variants-1)
    variant_counts.reverse()

    for variant_count in variant_counts:
        rv = scipy.stats.beta(variant_count, num_variants-variant_count)
        yield {
            'x': round(-math.log10((variant_count-0.5)/num_variants),2),
            'y_min': round(-math.log10(rv.ppf(1-one_sided_doubt)),2),
            'y_max': round(-math.log10(rv.ppf(one_sided_doubt)),2),
        }
