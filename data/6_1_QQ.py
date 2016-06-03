#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

import os.path

my_dir = os.path.dirname(os.path.abspath(__file__))
activate_this = os.path.join(my_dir, '../../venv/bin/activate_this.py')
execfile(activate_this, dict(__file__=activate_this))

import glob
import re
import os
import json
import gzip
import math
import datetime
import multiprocessing
import scipy.stats
import collections

import sys
sys.path.insert(0, os.path.join(my_dir, '..'))
from utils import round_sig, parse_marker_id

data_dir = '/var/pheweb_data/'
NEGLOG10_PVAL_BIN_SIZE = 0.05 # Use 0.05, 0.1, 0.15, etc
NEGLOG10_PVAL_BIN_DIGITS = 2 # Then round to this many digits
NUM_BINS = 1000

NUM_MAF_RANGES = 4

Variant = collections.namedtuple('Variant', ['neglog10_pval', 'maf'])
def parse_variant_line(variant_line):
    v = variant_line.split('\t')
    chrom, pos, maf, pval, beta = v[0], int(v[1]), float(v[3]), float(v[4]), float(v[5])
    chrom2, pos2, ref, alt = parse_marker_id(v[2])
    assert chrom == chrom2
    assert pos == pos2
    return Variant(-math.log10(pval), maf)


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

    max_exp_neglog10_pval = -math.log10(0.5 / len(neglog10_pvals))
    max_obs_neglog10_pval = neglog10_pvals[0]

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
#    rv['qq'] = compute_qq(neglog10_pvals) # We don't need this now.
    rv['count'] = len(neglog10_pvals)
    rv['gc_lambda'] = {}
    rv['gc_lambda']['0.5'] = round_sig(gc_value_from_list(neglog10_pvals, 0.5), 5)
    rv['gc_lambda']['0.1'] = round_sig(gc_value_from_list(neglog10_pvals, 0.1), 5)
    rv['gc_lambda']['0.01'] = round_sig(gc_value_from_list(neglog10_pvals, 0.01), 5)
    rv['gc_lambda']['0.001'] = round_sig(gc_value_from_list(neglog10_pvals, 0.001), 5)
    return rv


def make_json_file(args):
    src_filename, dest_filename, tmp_filename = args
    assert not os.path.exists(dest_filename), dest_filename

    with gzip.open(src_filename) as f:
        header = f.readline().rstrip('\n').split('\t')
        assert len(header) == 6, header
        assert header[:4] == ['#CHROM', 'BEG', 'MARKER_ID', 'MAF']
        assert re.match(r'[0-9]+(?:\.[0-9]+)?\.P', header[4])
        assert re.match(r'[0-9]+(?:\.[0-9]+)?\.B', header[5])

        variants = [parse_variant_line(line.rstrip('\n')) for line in f]
        rv = {}
        rv['overall'] = make_qq(v.neglog10_pval for v in variants)
        rv['by_maf'] = make_qq_stratified(variants)


    # Avoid getting killed while writing dest_filename, to stay idempotent despite me frequently killing the program
    with open(tmp_filename, 'w') as f:
        json.dump(rv, f, sort_keys=True, indent=0)
        os.fsync(f.fileno()) # Recommended by <http://stackoverflow.com/a/2333979/1166306>
    print('{}\t{} -> {}'.format(datetime.datetime.now(), src_filename, dest_filename))
    os.rename(tmp_filename, dest_filename)


def get_files_to_convert():
    src_filenames = glob.glob(data_dir + '/gwas-one-pheno/*.vcf.gz')
    print('source files:', len(src_filenames))
    for src_filename in src_filenames:
        basename = os.path.basename(src_filename)
        dest_filename = '{}/qq/{}.json'.format(data_dir, basename.replace('.vcf.gz', ''))
        tmp_filename = '{}/qq/tmp-{}.json'.format(data_dir, basename.replace('.vcf.gz', ''))
        assert not os.path.exists(tmp_filename), tmp_filename # It's not really a problem, just surprising.
        if not os.path.exists(dest_filename):
            yield (src_filename, dest_filename, tmp_filename)

files_to_convert = list(get_files_to_convert())
print('files to convert:', len(files_to_convert))

p = multiprocessing.Pool(30)
#p.map(make_json_file, files_to_convert)
p.map_async(make_json_file, files_to_convert).get(1e8) # Makes KeyboardInterrupt work

# for f in files_to_convert:
#     make_json_file(f) # for debugging
