
import re
import itertools
import functools
import traceback
import math
import json
import gzip
import os
import random
import sys
import subprocess
import time
import multiprocessing
import csv
import boltons.mathutils
import urllib.parse
import blist
import bisect


## Functions required by `conf`

def round_sig(x, digits):
    if x == 0:
        return 0
    elif abs(x) == math.inf or math.isnan(x):
        raise ValueError("Cannot round infinity or NaN")
    else:
        log = math.log10(abs(x))
        digits_above_zero = int(math.floor(log))
        return round(x, digits - 1 - digits_above_zero)
assert round_sig(0.00123, 2) == 0.0012
assert round_sig(1.59e-10, 2) == 1.6e-10

def approx_equal(a, b, tolerance=1e-4):
    return abs(a-b) <= max(abs(a), abs(b)) * tolerance
assert approx_equal(42, 42.0000001)
assert not approx_equal(42, 42.01)


## Functions requiring `conf`

from . import conf_utils
conf = conf_utils.conf


class variant_parser:
    chrom_regex = re.compile(r'(?:[cC][hH][rR])?([0-9XYMT]+)')
    chrom_pos_regex = re.compile(chrom_regex.pattern + r'[-_:/ ]([0-9]+)')
    chrom_pos_ref_alt_regex = re.compile(chrom_pos_regex.pattern + r'[-_:/ ]([-AaTtCcGg\.]+)[-_:/ ]([-AaTtCcGg\.]+)')

    @classmethod
    def parse(self, query, default_chrom_pos=True):

        match = self.chrom_pos_ref_alt_regex.match(query) or self.chrom_pos_regex.match(query) or self.chrom_regex.match(query)
        g = match.groups() if match else ()

        if default_chrom_pos:
            if len(g) == 0: g += ('1',)
            if len(g) == 1: g += (0,)
        if len(g) >= 2: g = (g[0], int(g[1])) + tuple([bases.upper() for bases in g[2:]])
        return g + tuple(itertools.repeat(None, 4-len(g)))




def get_phenolist():
    fname = os.path.join(conf.data_dir, 'pheno-list.json')
    try:
        with open(os.path.join(fname)) as f:
            phenolist = json.load(f)
    except (FileNotFoundError, PermissionError):
        die("You need a file to define your phenotypes at '{fname}'.\n".format(fname=fname) +
            "For more information on how to make one, see <https://github.com/statgen/pheweb#3-make-a-list-of-your-phenotypes>")
    except json.JSONDecodeError:
        print("Your file at '{fname}' contains invalid json.\n".format(fname=fname) +
              "The error it produced was:")
        raise
    for pheno in phenolist:
        pheno['phenocode'] = urllib.parse.quote_plus(pheno['phenocode'])
    return phenolist

def get_phenos_with_colnums():
    phenos_by_phenocode = {pheno['phenocode']: pheno for pheno in get_phenolist()}
    with gzip.open(os.path.join(conf.data_dir, 'matrix.tsv.gz'), 'rt') as f:
        header = f.readline().rstrip('\r\n').split('\t')
    assert header[:7] == '#chrom pos ref alt rsids nearest_genes maf'.split()
    for phenocode in phenos_by_phenocode:
        phenos_by_phenocode[phenocode]['colnum'] = {}
    for colnum, colname in enumerate(header[7:], start=7):
        label, phenocode = colname.split('@')
        phenos_by_phenocode[phenocode]['colnum'][label] = colnum
    for phenocode in phenos_by_phenocode:
        assert 'pval' in phenos_by_phenocode[phenocode]['colnum'], (phenocode, phenos_by_phenocode[phenocode])
    return phenos_by_phenocode


pheno_fields_to_include_with_variant = {
    'phenostring', 'category', 'num_cases', 'num_controls', 'num_samples',
}

def get_maf(variant, pheno):
    mafs = []
    if 'maf' in variant:
        mafs.append(variant['maf'])
    if 'af' in variant:
        mafs.append(min(variant['af'], 1-variant['af']))
    if 'ac' in variant and 'num_samples' in pheno:
        mafs.append(variant['ac'] / pheno['num_samples'])
    if not mafs: return None
    if len(mafs) > 1:
        if not approx_equal(min(mafs), max(mafs), tolerance=0.1):
            raise Exception("Error: the variant {} has two ways of computing maf, resulting in the mafs {}, which differ by more than 10%.")
        return sum(mafs[0])/len(mafs)
    return mafs[0]


def get_variant(query, phenos):
    import pysam
    # todo: differentiate between parse errors and variants-not-found
    chrom, pos, ref, alt = variant_parser.parse(query)
    assert None not in [chrom, pos, ref, alt]

    tabix_file = pysam.TabixFile(os.path.join(conf['data_dir'], 'matrix.tsv.gz'))
    tabix_iter = tabix_file.fetch(chrom, pos-1, pos+1, parser = pysam.asTuple())
    for variant_row in tabix_iter:
        if int(variant_row[1]) == int(pos) and variant_row[3] == alt:
            matching_variant_row = tuple(variant_row)
            break
    else: # didn't break
        return None

    maf = round_sig(float(matching_variant_row[6]), 3)
    assert 0 < maf <= 0.5

    rv = {
        'variant_name': '{} : {:,} {}>{}'.format(chrom, pos, ref, alt),
        'chrom': chrom,
        'pos': pos,
        'ref': ref,
        'alt': alt,
        'maf': maf,
        'rsids': matching_variant_row[4],
        'nearest_genes': matching_variant_row[5],
        'phenos': [],
    }

    for phenocode, pheno in phenos.items():
        p = {}
        for colname, colnum in pheno['colnum'].items():
            if matching_variant_row[colnum] != '':
                p[colname] = matching_variant_row[colnum]
                if colname in {'pval', 'beta', 'sebeta', 'or'}:
                    p[colname] = float(p[colname])
        if p:
            p['phenocode'] = phenocode
            for key in pheno:
                if key in pheno_fields_to_include_with_variant:
                    p[key] = pheno[key]
            rv['phenos'].append(p)
    return rv


def pad_gene(start, end):
    # We'd like to get 100kb on each side of the gene.
    # But max-region-length is 500kb, so let's try not to exceed that.
    if start < 1e5:
        if end > 5e5: return (0, end)
        if end > 4e5: return (0, 5e5)
        return (0, end + 1e5)
    padding = boltons.mathutils.clamp(5e5 - (end - start), 0, 2e5)
    return (int(start - padding//2), int(end + padding//2))
assert pad_gene(1000,     2345) == (0,      102345)
assert pad_gene(1000,   400000) == (0,      500000)
assert pad_gene(200000, 400000) == (100000, 500000)
assert pad_gene(200000, 500000) == (100000, 600000)
assert pad_gene(200000, 500001) == (100001, 600000)
assert pad_gene(200000, 600000) == (150000, 650000)
assert pad_gene(200000, 700000) == (200000, 700000)
assert pad_gene(200000, 800000) == (200000, 800000)


def get_random_page():
    with open(os.path.join(conf['data_dir'], 'top_hits.json')) as f:
        hits = json.load(f)
    hits_to_choose_from = [hit for hit in hits if hit['pval'] < 5e-8]
    if not hits_to_choose_from:
        hits_to_choose_from = hits
    if not hits:
        return None
    hit = random.choice(hits_to_choose_from)
    r = random.random()
    if r < 0.4:
        return '/pheno/{}'.format(hit['phenocode'])
    elif r < 0.8:
        return '/variant/{chrom}-{pos}-{ref}-{alt}'.format(**hit)
    else:
        offset = int(50e3)
        return '/region/{phenocode}/{chrom}:{pos1}-{pos2}'.format(pos1=hit['pos']-offset, pos2=hit['pos']+offset, **hit)


def die(message):
    print(message, file=sys.stderr)
    raise Exception()


def exception_printer(f):
    @functools.wraps(f)
    def f2(*args, **kwargs):
        try:
            rv = f(*args, **kwargs)
        except Exception as exc:
            time.sleep(2*random.random()) # hopefully avoid interleaved printing (when using multiprocessing)
            traceback.print_exc()
            strexc = str(exc) # parser errors can get very long
            if len(strexc) > 10000: strexc = strexc[1000:] + '\n\n...\n\n' + strexc[-1000:]
            print(strexc)
            if args: print('args were: {!r}'.format(args))
            if kwargs: print('kwargs were: {!r}'.format(args))
            print('')
            raise
        return rv
    return f2

def exception_tester(f):
    @functools.wraps(f)
    def f2(*args, **kwargs):
        try:
            rv = f(*args, **kwargs)
        except Exception as exc:
            traceback.print_exc()
            strexc = str(exc) # parser errors can get very long
            if len(strexc) > 10000: strexc = strexc[1000:] + '\n\n...\n\n' + strexc[-1000:]
            print(strexc)
            if args: print('args were: {!r}'.format(args))
            if kwargs: print('kwargs were: {!r}'.format(args))
            print('')
            return {'args': args, 'kwargs': kwargs, 'succeeded': False}
        return {'args': args, 'kwargs': kwargs, 'succeeded': True, 'rv': rv}
    return f2


def star_kwargs(f):
    # LATER: use multiprocessing.Pool().starmap(func, [(arg1, arg2), ...]) instead.
    @functools.wraps(f)
    def f2(kwargs):
        return f(**kwargs)
    return f2


class open_maybe_gzip(object):
    def __init__(self, fname, *args):
        self.fname = fname
        self.args = args
    def __enter__(self):
        is_gzip = False
        with open(self.fname, 'rb') as f:
            if f.read(3) == b'\x1f\x8b\x08':
                is_gzip = True
        if is_gzip:
            self.f = gzip.open(self.fname, *self.args)
        else:
            self.f = open(self.fname, *self.args)
        return self.f
    def __exit__(self, *exc):
        self.f.close()


# TODO: chrom_order_list[25-1] = 'M', chrom_order['M'] = 25-1, chrom_order['MT'] = 25-1 ?
#       and epacts.py should convert all chroms to chrom_idx?
chrom_order_list = [str(i) for i in range(1,22+1)] + ['X', 'Y', 'M', 'MT']
chrom_order = {chrom: index for index,chrom in enumerate(chrom_order_list)}


def get_path(cmd, attr=None):
    if attr is None: attr = '{}_path'.format(cmd)
    path = None
    if attr in conf:
        path = conf[attr]
    else:
        try: path = subprocess.check_output(['which', cmd]).strip().decode('utf8')
        except subprocess.CalledProcessError: pass
    if path is None:
        raise Exception("The command '{cmd}' was not found in $PATH and was not specified (as {attr}) in config.py.".format(cmd=cmd, attr=attr))
    return path


def run_script(script):
    script = 'set -euo pipefail\n' + script
    try:
        with open(os.devnull) as devnull:
            # is this the right way to block stdin?
            data = subprocess.check_output(['bash', '-c', script], stderr=subprocess.STDOUT, stdin=devnull)
        status = 0
    except subprocess.CalledProcessError as ex:
        data = ex.output
        status = ex.returncode
    data = data.decode('utf8')
    if status != 0:
        print('FAILED with status {}'.format(status))
        print('output was:')
        print(data)
        raise Exception()
    return data


def run_cmd(cmd):
    '''cmd must be a list of arguments'''
    try:
        with open(os.devnull) as devnull:
            # is this the right way to block stdin?
            data = subprocess.check_output(cmd, stderr=subprocess.STDOUT, stdin=devnull)
        status = 0
    except subprocess.CalledProcessError as ex:
        data = ex.output
        status = ex.returncode
    data = data.decode('utf8')
    if status != 0:
        print('FAILED with status {}'.format(status))
        print('output was:')
        print(data)
        raise Exception()
    return data


def get_cacheable_file_location(default_dir, fname):
    if 'cache' in conf:
        return os.path.join(conf.cache, fname)
    return os.path.join(default_dir, fname)


def get_gene_tuples(include_ensg=False):
    genes_file = get_cacheable_file_location(os.path.join(conf.data_dir, 'sites', 'genes'), 'genes.bed')

    with open(genes_file) as f:
        for row in csv.reader(f, delimiter='\t'):
            assert row[0] in chrom_order_list, row[0]
            if include_ensg:
                yield (row[0], int(row[1]), int(row[2]), row[3], row[4])
            else:
                yield (row[0], int(row[1]), int(row[2]), row[3])


def get_num_procs():
    if conf.debug: return 1
    try: return conf.num_procs
    except: pass
    n_cpus = multiprocessing.cpu_count()
    if n_cpus == 1: return 1
    if n_cpus < 4: return n_cpus - 1
    return n_cpus * 3//4


class Heap():
    '''Unlike most heaps, this heap can safely store uncomparable values'''
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
