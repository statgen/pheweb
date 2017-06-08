
import functools
import traceback
import time
import os
import subprocess
import multiprocessing
import blist
import bisect
import random
import itertools
import tqdm

from ..utils import conf, round_sig, get_phenolist
from ..file_utils import common_filepaths


def get_maf(variant, pheno):
    mafs = []
    if 'maf' in variant:
        mafs.append(variant['maf'])
    if 'af' in variant:
        mafs.append(min(variant['af'], 1-variant['af']))
    if 'ac' in variant and 'num_samples' in pheno:
        x = variant['ac'] / 2 / pheno['num_samples']
        mafs.append(min(x, 1-x))
    if len(mafs) == 0: return None
    elif len(mafs) == 1:
        return mafs[0]
    else:
        if max(mafs) - min(mafs) > 0.05:
            raise Exception(
                "Error: the variant {} in pheno {} has two ways of computing maf, resulting in the mafs {}, which differ by more than 0.05.".format(
                    variant, pheno, mafs))
        return round_sig(sum(mafs)/len(mafs), conf.parse.fields['maf']['sigfigs'])



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

# pheweb slurm
# - option 1: open server on port, figure out ip, use slurm to create workers which connect home (w/ big timeout), feed them work, they send home results/exceptions, send them EXIT when done.
#     - all tasks must be atomic.  if a worker times out, slurm up a replacement worker.
#     - task-management code must be separate from task-doing code.
#        - when a RPC comes in to the worker, what happens?  RPC = {cmd:'augment-phenos', phenos:[0,1,2,3]} yields exceptions & results like now.
#     - how does master send work to worker?  can worker open a bidirectional pipe?  websocket?  long-polling XHR?

# I need:
# - allow just collecting the set of phenos that need to run.
# - allow running with a subset of phenos.
# - make a separate runner for genes (pretty bare-bones, gather.py:process_tasks directly reads the q, but try to standardize error reporting with other Para)
# - make a separate runner for sites - can it share anything?
#    - gotta 
#    - it still needs to report errors and terminate workers.  should that work the same way?

# if we always used manna.list/lock() instead of queue, how much code could we share?
# processes starve when no more jobs.

'''
sites
    manna.lock(), manna.list() like now
    error reporting using a queue
    progress using a queue
gather-genes
    tasks = genes
    do_tasks
parse
    tasks = [{src:{assoc_filepath:assoc_filepath}, dest:..., pheno:pheno}, ...]
    convert(assoc_filepath, dest_filepath, pheno):
        yield {exception:True, exc_str, exc_tb} # parents sets `task` retq.put
        yield {complete:True}
augment

manh/qq/bgzip
    allow  
'''

class Parallelizer:
    @staticmethod
    def _run_tasks(tasks, do_task):
        pass




def parallelize(tasks, do_task=None, do_tasks=None, tqdm_desc=None):
    '''
    tasks is [task, ...]
    pass in either do_task or do_tasks:
    - do_task is a function(task) that can return a result
    - do_tasks is a function(taskq, doneq, stop_sentinel)
    '''
    assert do_task or do_tasks

    n_procs = get_num_procs()
    stop_sentinel = 9001 # TODO: this is not a good sentinel
    taskq = multiprocessing.Queue()
    doneq = multiprocessing.Queue()
    for task in tasks: taskq.put(task)
    for _ in range(n_procs): taskq.put(stop_sentinel)

    if not do_tasks:
        do_tasks = _make_task_doer(do_task)
    for _ in range(n_procs):
        multiprocessing.Process(target=do_tasks, args=(taskq, doneq, stop_sentinel)).start()

    for _ in tqdm.tqdm(range(len(tasks)), desc=tqdm_desc): # TODO: only show tqdm if `tasks`.
        yield doneq.get()

def _make_task_doer(do_task):
    def f(taskq, doneq, stop_sentinel):
        for task in iter(taskq.get, stop_sentinel):
            doneq.put(do_task(task))
    return f

def parallelize_per_pheno(src, dest, convert, other_dependencies=[]):
    '''
    pseudocode:
    ret = {}
    for each pheno,
        src_filepath = common_filepaths[src](phenocode)
        dest_filepath = common_filepaths[dest](phenocode)
        if not os.path.exists(src_filepath): error
        if (not os.path.exists(dest_filepath)
            or src newer than dest
            or also_check_age newer than dest):
            ret[phenocode] = convert(src_filepath, dest_filepath)
    return ret
    '''
    def mtime(filepath): return os.stat(filepath).st_mtime

    for filepath in other_dependencies:
        if not os.path.exists(filepath):
            raise Exception("Cannot convert {} to {}, because {} does not exist".format(
                src, dest, filepath))
    if other_dependencies:
        newest_other_dependency = max(mtime(fp) for fp in other_dependencies)

    def needs_replacing(src_filepath, dest_filepath):
        if not os.path.exists(dest_filepath): return True
        dest_mtime = mtime(dest_filepath)
        if dest_mtime < mtime(src_filepath): return True
        if other_dependencies and dest_mtime < newest_other_dependency: return True
        return False

    phenos = get_phenolist()
    tasks = []
    for pheno in phenos:
        phenocode = pheno['phenocode']
        src_filepath = common_filepaths[src](phenocode)
        dest_filepath = common_filepaths[dest](phenocode)
        if not os.path.exists(src_filepath):
            raise Exception("Cannot convert {} to {} for pheno {}, because {} does not exist".format(
                src, dest, phenocode, src_filepath))
        if needs_replacing(src_filepath, dest_filepath):
            tasks.append({
                'pheno': pheno,
                'src_filepath': src_filepath,
                'dest_filepath': dest_filepath,
            })

    if not tasks:
        print("{} are all newer than {}, so nothing to do.".format(dest, src))
        return
    if len(phenos) == len(tasks):
        print("Processing {} phenos".format(len(tasks)))
    else:
        print("Processing {} phenos ({} already done)".format(
            len(tasks), len(phenos)-len(tasks)))

    results = {}
    p = parallelize(
        tasks,
        do_tasks=_make_per_pheno_do_tasks(convert),
        tqdm_desc='Converting {} to {}'.format(src, dest))
    for result in p:
        if 'exception' in result:
            print("\n\nA worker had a problem while working on:")
            print(_indent(result['task']))
            print(_indent(result['str']))
            print("\nHere's its traceback:")
            print(_indent(result['traceback']))
            print("\nTerminating.\n")
            raise Exception()

    return {phenocode:v for d in results for phenocode,v in d.items()}

def _indent(string):
    return '\n'.join('   '+line for line in str(string).split('\n'))

def _make_per_pheno_do_tasks(convert):
    def f(taskq, doneq, stop_sentinel):
        for task in iter(taskq.get, stop_sentinel):
            try:
                result = convert(**task)
            except Exception as exc:
                doneq.put({
                    'exception': True,
                    'str': str(exc),
                    'traceback': traceback.format_exc(),
                    'task': task,
                })
            else:
                doneq.put({'task':task, 'result':result})
    return f
