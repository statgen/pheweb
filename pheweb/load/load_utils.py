
from ..utils import round_sig, get_phenolist, PheWebError
from ..conf_utils import conf
from ..file_utils import get_dated_tmp_path

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
import sys
from types import GeneratorType


def get_maf(variant, pheno):
    mafs = []
    if 'maf' in variant:
        mafs.append(variant['maf'])
    if 'af' in variant:
        mafs.append(min(variant['af'], 1-variant['af']))
    if 'mac' in variant and 'num_samples' in pheno:
        mafs.append(variant['ac'] / 2 / pheno['num_samples'])
    if 'ac' in variant and 'num_samples' in pheno:
        x = variant['ac'] / 2 / pheno['num_samples']
        mafs.append(min(x, 1-x))
    if len(mafs) == 0: return None
    elif len(mafs) == 1:
        return mafs[0]
    else:
        if any(maf > 0.5 for maf in mafs):
            raise PheWebError("Error: the variant {} in pheno {} has at least one way of computing maf that is > 0.5 ({})".format(
                variant, pheno, mafs))
        if max(mafs) - min(mafs) > 0.05:
            raise PheWebError(
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
        raise PheWebError(
            'FAILED with status {}\n'.format(status) +
            'output was:\n' +
            data)
    return data


def get_num_procs(cmd=None):
    try: return int(conf.num_procs[cmd])
    except Exception: pass
    try: return int(conf.num_procs['*'])
    except Exception: pass
    try: return int(conf.num_procs)
    except Exception: pass
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

    def add_and_keep_size(self, item, priority, size, popped_callback):
        if len(self._q) < size:
            self.add(item, priority)
        else:
            if priority > self._q[-1][0]:
                popped_callback(item)
            else:
                popped_callback(self.pop())
                self.add(item, priority)

    def pop(self):
        priority, idx = self._q.pop()
        return self._items.pop(idx)

    def __len__(self):
        return len(self._q)

    def pop_all(self):
        while self._q:
            yield self.pop()


class Parallelizer:
    def run_multiple_tasks(self, tasks, do_multiple_tasks, cmd=None):
        # yields things like: {type:"result", ...}
        if not tasks: return
        n_procs = min(get_num_procs(cmd), len(tasks))
        taskq = multiprocessing.Queue()
        for task in tasks: taskq.put(task)
        for _ in range(n_procs): taskq.put({"exit":True})
        retq = multiprocessing.Queue()
        procs = [multiprocessing.Process(target=do_multiple_tasks, args=(taskq, retq), daemon=True) for _ in range(n_procs)]
        for p in procs: p.start()
        with ProgressBar() as progressbar:
            n_tasks_complete = 0
            self._update_progressbar(progressbar, n_tasks_complete, n_procs, len(tasks))
            while True:
                ret = retq.get()
                if ret['type'] == 'result':
                    yield ret
                elif ret['type'] == 'task-completion':
                    n_tasks_complete += 1
                    self._update_progressbar(progressbar, n_tasks_complete, n_procs, len(tasks))
                elif ret['type'] == 'exception':
                    for p in procs:
                        if p.is_alive():
                            p.terminate() # is this a good choice?  I dunno.
                    exc_filepath = get_dated_tmp_path('exception')
                    with open(exc_filepath, 'wt') as f:
                        f.write(
                            "Child process had exception:\n" + indent(ret['exception_str']) + '\n' +
                            "Traceback:\n" + indent(ret['exception_tb']) + '\n'
                        )
                    raise PheWebError('Child process had exception, info dumped to {}'.format(exc_filepath))
                elif ret['type'] == 'exit':
                    n_procs -= 1
                    if n_procs == 0:
                        self._update_progressbar(progressbar, n_tasks_complete, n_procs, len(tasks))
                        return
                else:
                    raise PheWebError("Unknown type of ret: {}".format(ret))
            for p in procs:
                p.join()
                assert p.exitcode == 0
    def run_single_tasks(self, tasks, do_single_task, cmd=None):
        do_multiple_tasks = self._make_multiple_tasks_doer(do_single_task)
        for ret in self.run_multiple_tasks(tasks, do_multiple_tasks, cmd=cmd):
            yield ret
    def _update_progressbar(self, progressbar, n_tasks_complete, n_procs, num_tasks):
        if n_procs == 0 and num_tasks == n_tasks_complete:
            progressbar.set_message('Completed {:4} tasks in {}'.format(
                n_tasks_complete, progressbar.fmt_elapsed()))
        else:
            progressbar.set_message('Completed {:4} tasks in {} ({} currently in progress, {} remain)'.format(
                n_tasks_complete, progressbar.fmt_elapsed(), n_procs, num_tasks-n_tasks_complete))

    @staticmethod
    def _make_multiple_tasks_doer(do_single_task):
        # do_single_task(task) yields pickleable results and may raise an exception
        def f(taskq, retq):
            for task in iter(taskq.get, {'exit':True}):
                try:
                    x = do_single_task(task)
                    for ret in (x if isinstance(x, GeneratorType) else [x]): # if it returns None (rather than a generator), assume it has no results
                        retq.put({
                            "type": "result",
                            "task": task,
                            "value": ret,
                        })
                    retq.put({
                        'type': 'task-completion',
                        'task': task,
                    })
                except (Exception, KeyboardInterrupt) as exc:
                    retq.put({
                        "type": "exception",
                        "task": task,
                        "exception_str": str(exc),
                        "exception_tb": traceback.format_exc(),
                    })
                    return
            retq.put({"type":"exit"})
        return f

class PerPhenoParallelizer(Parallelizer):
    def run_on_each_pheno(self, get_input_filepaths, get_output_filepaths, convert, *, cmd=None, phenos=None):
        if phenos is None: phenos = get_phenolist()
        tasks = [pheno for pheno in phenos if self.should_process_pheno(pheno, get_input_filepaths, get_output_filepaths)]
        if not tasks:
            print("Output files are all newer than input files, so there's nothing to do.")
            return {}
        if len(phenos) == len(tasks):
            print("Processing {} phenos".format(len(tasks)))
        else:
            print("Processing {} phenos ({} already done)".format(len(tasks), len(phenos)-len(tasks)))
        pheno_results = {}
        for ret in self.run_single_tasks(tasks, convert, cmd=cmd):
            pc = ret['task']['phenocode']
            v = ret['value']
            if isinstance(v, dict) and v.get('type', '') == 'warning':
                continue # TODO: self._progressbar.prepend_message(ret['message'])
            assert pc not in pheno_results
            pheno_results[pc] = v
        return pheno_results
    def should_process_pheno(self, pheno, get_input_filepaths, get_output_filepaths):
        input_filepaths = get_input_filepaths(pheno)
        output_filepaths = get_output_filepaths(pheno)
        if isinstance(input_filepaths, str): input_filepaths = [input_filepaths]
        if isinstance(output_filepaths, str): output_filepaths = [output_filepaths]
        for fp in input_filepaths:
            if not os.path.exists(fp):
                raise PheWebError("Cannot make {} because {} does not exist".format(' or '.join(output_filepaths), fp))
        return any(not os.path.exists(fp) for fp in output_filepaths) or max(map(mtime, input_filepaths)) > min(map(mtime, output_filepaths))
def parallelize_per_pheno(get_input_filepaths, get_output_filepaths, convert, *, cmd=None, phenos=None):
    return PerPhenoParallelizer().run_on_each_pheno(get_input_filepaths, get_output_filepaths, convert, cmd=cmd, phenos=phenos)



def indent(string):
    return '\n'.join('   '+line for line in str(string).split('\n'))

def mtime(filepath):
    return os.stat(filepath).st_mtime


class ProgressBar:
    def __enter__(self):
        self._start_time = time.time()
        self._last_time_written = 0
        self._last_message_written = ''
        self._last_message_set = ''
        # if we're writing to a log file, just use newlines.
        # unfortunately, that'll make really long output that can hide important warnings.
        # TODO: decide what to do about that.
        self._r = '\r' if sys.stderr.isatty() else '\n'
        return self
    def __exit__(self, *args):
        self._write_message(self._last_message_set)
        sys.stderr.write('\n')
    def prepend_message(self, message):
        first_line, following_lines = message.split('\n', 1)
        sys.stderr.write(
            self._r + first_line +
            ' '*max(0, len(self._last_message_written) - len(message)) + '\n' +
            following_lines + '\n' +
            self._last_message_set
        )
        self._last_time_written = time.time()
    def set_message(self, message):
        self._last_message_set = message
        t = time.time()
        if t > self._last_time_written + 0.5:
            self._write_message(message, t=t)
    def _write_message(self, message, t=None):
        # TODO: handle multiline messages
        if message != self._last_message_written:
            sys.stderr.write(
                self._r + message +
                ' '*max(0, len(self._last_message_written) - len(message))
            )
            self._last_message_written = message
            self._last_time_written = t or time.time()
    def fmt_elapsed(self):
        seconds = time.time() - self._start_time
        if seconds < 5*60: return '{} seconds'.format(int(seconds))
        if seconds < 5*60*60: return '{} minutes'.format(int(seconds//60))
        return '{} hours'.format(int(seconds//60//60))
