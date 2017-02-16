
from .. import utils
conf = utils.conf

import os
import json
import math
import datetime
import multiprocessing
import scipy.stats
import collections
import csv
from boltons.fileutils import mkdir_p, AtomicSaver


NEGLOG10_PVAL_BIN_SIZE = 0.05 # Use 0.05, 0.1, 0.15, etc
NEGLOG10_PVAL_BIN_DIGITS = 2 # Then round to this many digits
NUM_BINS = 1000

NUM_MAF_RANGES = 4

Variant = collections.namedtuple('Variant', ['neglog10_pval', 'maf'])
def get_variants(f, fname=None):
    for v in csv.DictReader(f, delimiter='\t'):
        pval = v['pval']
        try:
            pval = float(pval)
        except ValueError:
            continue
        maf = float(v['maf'])
        if pval != 0:
            yield Variant(-math.log10(pval), maf)
        else:
            print("Warning: There's a variant with pval 0 in {!r}.  (Variant: {!r})".format(fname, v))


def approx_equal(a, b, tolerance=1e-4):
    return abs(a-b) <= max(abs(a), abs(b)) * tolerance
assert approx_equal(42, 42.0000001)
assert not approx_equal(42, 42.01)

def gc_value_from_list(neglog10_pvals, quantile=0.5):
    # neglog10_pvals must be in decreasing order.
    assert all(neglog10_pvals[i] >= neglog10_pvals[i+1] for i in range(len(neglog10_pvals)-1))
    neglog10_pval = neglog10_pvals[int(len(neglog10_pvals) * quantile)]
    pval = 10 ** -neglog10_pval
    return gc_value(pval, quantile)
def gc_value(pval, quantile=0.5):
    # This should be equivalent to this R: `qchisq(p, df=1, lower.tail=F) / qchisq(.5, df=1, lower.tail=F)`
    return scipy.stats.chi2.ppf(1 - pval, 1) / scipy.stats.chi2.ppf(1 - quantile, 1)
assert approx_equal(gc_value(0.49), 1.047457) # I computed these using that R code.
assert approx_equal(gc_value(0.5), 1)
assert approx_equal(gc_value(0.50001), 0.9999533)
assert approx_equal(gc_value(0.6123), 0.5645607)


def compute_qq(neglog10_pvals):
    # neglog10_pvals must be in decreasing order.
    assert all(neglog10_pvals[i] >= neglog10_pvals[i+1] for i in range(len(neglog10_pvals)-1))

    if len(neglog10_pvals) == 0:
        return []

    max_exp_neglog10_pval = -math.log10(0.5 / len(neglog10_pvals))
    max_obs_neglog10_pval = neglog10_pvals[0]

    if max_obs_neglog10_pval == 0:
        print('WARNING: All pvalues are 1! How is that supposed to make a QQ plot?')
        return []

    occupied_bins = set()
    for i, obs_neglog10_pval in enumerate(neglog10_pvals):
        exp_neglog10_pval = -math.log10( (i+0.5) / len(neglog10_pvals))
        exp_bin = int(exp_neglog10_pval / max_exp_neglog10_pval * NUM_BINS)
        obs_bin = int(obs_neglog10_pval / max_obs_neglog10_pval * NUM_BINS)
        occupied_bins.add( (exp_bin,obs_bin) )

    qq = []
    for exp_bin, obs_bin in occupied_bins:
        assert 0 <= exp_bin <= NUM_BINS, exp_bin
        assert 0 <= obs_bin <= NUM_BINS, obs_bin
        qq.append((
            exp_bin / NUM_BINS * max_exp_neglog10_pval,
            obs_bin / NUM_BINS * max_obs_neglog10_pval
        ))
    return sorted(qq)


def make_qq_stratified(variants):
    variants = sorted(variants, key=lambda v: v.maf)

    qqs = [dict() for i in range(NUM_MAF_RANGES)]
    for qq_i in range(NUM_MAF_RANGES):
        # Note: slice_indices[1] is the same as slice_indices[0] of the next slice.
        # But that's not a problem, because range() ignores the last index.
        slice_indices = (len(variants) * qq_i//NUM_MAF_RANGES,
                         len(variants) * (qq_i+1)//NUM_MAF_RANGES)
        qqs[qq_i]['maf_range'] = (variants[slice_indices[0]].maf,
                                  variants[slice_indices[1]-1].maf)
        neglog10_pvals = sorted((variants[i].neglog10_pval for i in range(*slice_indices)), reverse=True)
        qqs[qq_i]['count'] = len(neglog10_pvals)
        qqs[qq_i]['qq'] = compute_qq(neglog10_pvals)

    return qqs


def make_qq(neglog10_pvals):
    neglog10_pvals = sorted(neglog10_pvals, reverse=True)
    rv = {}
    rv['qq'] = compute_qq(neglog10_pvals) # We don't need this now.
    rv['count'] = len(neglog10_pvals)
    rv['gc_lambda'] = {}
    for perc in ['0.5', '0.1', '0.01', '0.001']:
        gc = gc_value_from_list(neglog10_pvals, float(perc))
        if math.isnan(gc) or abs(gc) == math.inf:
            print('WARNING: got gc_value {!r}'.format(gc))
        else:
            rv['gc_lambda'][perc] = utils.round_sig(gc, 5)
    return rv


@utils.exception_printer
def make_json_file(args):
    src_filename, dest_filename, tmp_filename = args['src'], args['dest'], args['tmp']
    try:

        with open(src_filename) as f:
            variants = list(get_variants(f, fname=src_filename))

        rv = {}
        if variants:
            rv['overall'] = make_qq(v.neglog10_pval for v in variants)
            rv['by_maf'] = make_qq_stratified(variants)

        with AtomicSaver(dest_filename, text_mode=True, part_file=tmp_filename, overwrite_part=True) as f:
            json.dump(rv, f)
        print('{}\t{} -> {}'.format(datetime.datetime.now(), src_filename, dest_filename))

    except Exception as exc:
        print('ERROR OCCURRED WHEN MAKING QQ FILE {!r} FROM FILE {!r} (TMP FILE AT {!r})'.format(
            dest_filename, src_filename, tmp_filename))
        print('ERROR WAS:')
        print(exc)
        print('---')
        raise


def get_conversions_to_do():
    phenocodes = [pheno['phenocode'] for pheno in utils.get_phenolist()]
    for phenocode in phenocodes:
        src_filename = os.path.join(conf.data_dir, 'augmented_pheno', phenocode)
        dest_filename = os.path.join(conf.data_dir, 'qq', '{}.json'.format(phenocode))
        tmp_filename = os.path.join(conf.data_dir, 'tmp', 'qq-{}.json'.format(phenocode))
        if not os.path.exists(dest_filename) or os.stat(dest_filename).st_mtime < os.stat(src_filename).st_mtime:
            yield {'src':src_filename, 'dest':dest_filename, 'tmp':tmp_filename}

def run(argv):

    mkdir_p(conf.data_dir + '/qq')
    mkdir_p(conf.data_dir + '/tmp')

    conversions_to_do = list(get_conversions_to_do())
    print('number of phenos to process:', len(conversions_to_do))
    with multiprocessing.Pool(utils.get_num_procs()) as p:
        p.map(make_json_file, conversions_to_do)
