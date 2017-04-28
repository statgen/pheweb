
import functools
import traceback
import time
import gzip
import os
import subprocess
import multiprocessing
import blist
import bisect
import random

from ..utils import approx_equal, conf


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
