
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
import itertools

from ..utils import conf, round_sig


def get_maf(variant, pheno):
    mafs = []
    if 'maf' in variant:
        mafs.append(variant['maf'])
    if 'af' in variant:
        mafs.append(min(variant['af'], 1-variant['af']))
    if 'ac' in variant and 'num_samples' in pheno:
        x = variant['ac'] / 2 / pheno['num_samples']
        mafs.append(min(x, 1-x))
    if not mafs: return None
    if len(mafs) > 1:
        if max(mafs) - min(mafs) > 0.05:
            raise Exception(
                "Error: the variant {} in pheno {} has two ways of computing maf, resulting in the mafs {}, which differ by more than 0.05.".format(
                    variant, pheno, mafs))
        return round_sig(sum(mafs)/len(mafs), conf.parse.fields['maf']['sigfigs'])
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



class MaxPriorityQueue:
    '''
    .pop() returns the item with the largest priority.
    .popall() iteratively .pop()s until empty.
    priorities must be comparable (duh).
    '''
    def __init__(self):
        self._q = blist.blist() # a sorted list of [(priority, idx), ...]
        self._items = {} # maps idx -> item
        self._counter = itertools.count()

    def add(self, item, priority):
        idx = next(self._counter)
        if self._q and priority > self._q[-1][0]:
            # optimization for use case where new item has largest priority
            self._q.append((priority, idx))
        else:
            bisect.insort(self._q, (priority, idx))
        self._items[idx] = item

    def pop(self):
        priority, idx = self._q.pop()
        return self._items.pop(idx)

    def __len__(self):
        return len(self._q)

    def pop_all(self):
        while self._q:
            yield self.pop()
