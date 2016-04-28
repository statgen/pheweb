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

import sys
sys.path.insert(0, os.path.join(my_dir, '..'))
from utils import round_sig, parse_marker_id

data_dir = '/var/pheweb_data/'
NEGLOG10_PVAL_BIN_SIZE = 0.05 # Use 0.05, 0.1, 0.15, etc
NEGLOG10_PVAL_BIN_DIGITS = 2 # Then round to this many digits
NUM_BINS = 1000

def approx_equal(a, b, tolerance=1e-4):
    return abs(a-b) <= max(abs(a), abs(b)) * tolerance
assert approx_equal(42, 42.0000001)
assert not approx_equal(42, 42.01)

def gc_value(median_pval):
    # This should be equivalent to this R: `qchisq(p, df=1, lower.tail=F) / qchisq(.5, df=1, lower.tail=F)`
    return scipy.stats.chi2.ppf(1 - median_pval, 1) / scipy.stats.chi2.ppf(0.5, 1)
assert approx_equal(gc_value(0.49), 1.047457) # I computed these using that R code.
assert approx_equal(gc_value(0.5), 1)
assert approx_equal(gc_value(0.50001), 0.9999533)
assert approx_equal(gc_value(0.6123), 0.5645607)

def parse_variant_tuple(variant):
    chrom, pos, maf, pval, beta = variant[0], int(variant[1]), float(variant[3]), float(variant[4]), float(variant[5])
    chrom2, pos2, ref, alt = parse_marker_id(variant[2])
    assert chrom == chrom2
    assert pos == pos2
    return (chrom, pos, ref, alt, maf, pval)

def rounded(x):
    return round(x // NEGLOG10_PVAL_BIN_SIZE * NEGLOG10_PVAL_BIN_SIZE, NEGLOG10_PVAL_BIN_DIGITS)

def make_qq(variants):
    neglog10_pvals = []
    for variant in variants:
        chrom, pos, ref, alt, maf, pval = parse_variant_tuple(variant)
        neglog10_pvals.append(-math.log10(pval))
    neglog10_pvals = sorted(neglog10_pvals)

    # QQ
    max_exp_neglog10_pval = -math.log10(1/len(neglog10_pvals)) #expected
    max_obs_neglog10_pval = max(neglog10_pvals) #observed
    # print(max_obs_neglog10_pval, max_exp_neglog10_pval)

    occupied_bins = set()
    for i, obs_neglog10_pval in enumerate(neglog10_pvals):
        exp_neglog10_pval = -math.log10((len(neglog10_pvals)-i)/len(neglog10_pvals))
        exp_bin = int(exp_neglog10_pval / max_exp_neglog10_pval * NUM_BINS)
        obs_bin = int(obs_neglog10_pval / max_obs_neglog10_pval * NUM_BINS)
        occupied_bins.add( (exp_bin,obs_bin) )
    # print(sorted(occupied_bins))

    qq = []
    for exp_bin, obs_bin in occupied_bins:
        assert exp_bin <= NUM_BINS, exp_bin
        assert obs_bin <= NUM_BINS, obs_bin
        qq.append((
            exp_bin / NUM_BINS * max_exp_neglog10_pval,
            obs_bin / NUM_BINS * max_obs_neglog10_pval
        ))
    qq = sorted(qq)

    # GC_value lambda
    median_neglog10_pval = neglog10_pvals[len(neglog10_pvals)//2]
    median_pval = 10 ** -median_neglog10_pval # I know, `10 ** -(-math.log10(pval))` is gross.
    gc_value_lambda = gc_value(median_pval)

    rv = {
        'qq': qq,
        'median_pval': median_pval,
        'gc_value_lambda': round_sig(gc_value_lambda, 5),
    }
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

        variants = (line.rstrip('\n').split('\t') for line in f)
        rv = make_qq(variants)

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
# make_json_file(files_to_convert[0]) # for debugging