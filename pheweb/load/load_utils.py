
from ..utils import round_sig, get_phenolist, PheWebError, fmt_seconds
from .. import conf
from .. import parse_utils
from ..file_utils import get_dated_tmp_path

import functools
import traceback
import time
import os
import subprocess
import multiprocessing, queue
import random
import sys
import heapq
from pathlib import Path
from types import GeneratorType
from typing import List,Set,Dict,Optional,Any,Callable,Union
import re


def get_maf(variant:Dict[str,Any], pheno:Dict[str,Any]) -> Optional[float]:
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
        maf_sigfigs = parse_utils.fields['maf']['sigfigs']  # type:ignore
        if not isinstance(maf_sigfigs, int): raise Exception()
        return round_sig(sum(mafs)/len(mafs), maf_sigfigs)


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


def run_script(script:str) -> str:
    script = 'set -euo pipefail\n' + script
    try:
        with open(os.devnull) as devnull:
            # is this the right way to block stdin?
            data_bytes = subprocess.check_output(['bash', '-c', script], stderr=subprocess.STDOUT, stdin=devnull)
        status = 0
    except subprocess.CalledProcessError as ex:
        data_bytes = ex.output
        status = ex.returncode
    data = data_bytes.decode('utf8')
    if status != 0:
        raise PheWebError(
            'FAILED with status {}\n'.format(status) +
            'output was:\n' +
            data)
    return data



def set_loading_nice() -> None:
    '''Set `nice` value to give loading lower cpu/io priority.'''
    if conf.overrides.get('loading_nice'):
        os.setpriority(os.PRIO_PROCESS, os.getpid(), 20)
        # Supposedly if ionice is unset it will act like BestEffort with value = nice/5 .
        # But I'm setting the extremely careful class=idle which won't even use the disk when others do.
        import psutil
        psutil.Process().ionice(ioclass=psutil.IOPRIO_CLASS_IDLE)
set_loading_nice()


class MaxPriorityQueue:
    # TODO: check if this is slower than blist-based MaxPriorityQueue, for ~500 items
    # Note: `ComparesFalse()` is used to prevent `heapq` from comparing `item`s to eachother.
    #       Even if two priorities are equal, `ComparesFalse() <= ComparesFalse()` will be `False`, so `item`s won't be compared.
    '''
    `.pop()` returns the item with the largest priority.
    `.popall()` iteratively `.pop()`s until empty.
    priorities must be comparable.
    `item` can be anything.
    '''
    class ComparesFalse: __eq__ = __lt__ = __gt__ = lambda s,o: False
    def __init__(self):
        self._q = [] # a heap-property-satisfying list like [(priority, ComparesFalse(), item), ...]
    def add(self, item, priority) -> None:
        heapq.heappush(self._q, (-priority, MaxPriorityQueue.ComparesFalse(), item))
    def add_and_keep_size(self, item, priority, size:int, popped_callback:Optional[Callable] = None) -> None:
        if len(self._q) < size:
            self.add(item, priority)
        else:
            if -priority > self._q[0][0]: # if the new priority isn't as big as the biggest priority in the heap, switch them
                _, _, item = heapq.heapreplace(self._q, (-priority, MaxPriorityQueue.ComparesFalse(), item))
            if popped_callback: popped_callback(item)
    def pop(self):
        _, _, item = heapq.heappop(self._q)
        return item
    def __len__(self):
        return len(self._q)
    def pop_all(self):
        while self._q:
            yield self.pop()


class Parallelizer:
    def run_multiple_tasks(self, tasks, do_multiple_tasks, cmd=None):
        '''
        Make a task queue and a return queue.
        Spawn child processes `do_multiple_tasks(taskq, retq, overrides)` to pop taskq and push retq.
        We manually pass `overrides` down to the child, because otherwise multiprocessing won't pickle it and pass it down.
        Watch for results, exceptions, and task-completion in retq.
        Yields things like: {type:"result", ...}
        '''
        if not tasks: return
        n_procs = min(conf.get_num_procs(cmd), len(tasks))
        taskq = multiprocessing.Queue()
        for task in tasks: taskq.put(task)
        for _ in range(n_procs): taskq.put({"exit":True})
        retq = multiprocessing.Queue()
        procs = [multiprocessing.Process(target=do_multiple_tasks, args=(taskq, retq, conf.overrides), daemon=True) for _ in range(n_procs)]
        for p in procs: p.start()
        with ProgressBar() as progressbar:
            n_tasks_complete = 0
            self._update_progressbar(progressbar, n_tasks_complete, n_procs, len(tasks))
            while True:
                try:
                    ret = retq.get(block=True, timeout=10)
                except queue.Empty:
                    if not any(p.is_alive() for p in procs):
                        raise PheWebError("No living children remain and retq is empty, but n_procs={} and taskq.get_nowait()={!r}".format(n_procs, taskq.get_nowait()))
                    continue

                if ret['type'] == 'result':
                    yield ret
                elif ret['type'] == 'task-completion':
                    n_tasks_complete += 1
                    self._update_progressbar(progressbar, n_tasks_complete, n_procs, len(tasks))
                elif ret['type'] == 'exception':
                    for p in procs:
                        if p.is_alive():
                            p.terminate()
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
                        for p in procs:
                            p.join()
                            if p.exitcode != 0: raise PheWebError("A child process exited with status {}".format(p.exitcode))
                        return
                else:
                    raise PheWebError("Unknown type of ret: {}".format(ret))
    def run_single_tasks(self, tasks, do_single_task, cmd=None):
        do_multiple_tasks = self._make_multiple_tasks_doer(do_single_task)
        for ret in self.run_multiple_tasks(tasks, do_multiple_tasks, cmd=cmd):
            yield ret
    def _update_progressbar(self, progressbar, n_tasks_complete, n_procs, num_tasks):
        if n_procs == 0 and num_tasks == n_tasks_complete:
            progressbar.set_message('Completed {:4} tasks in {}'.format(
                n_tasks_complete, progressbar.fmt_elapsed()))
        else:
            progressbar.set_message('Completed {:4} tasks in {} ({} currently in progress, {} queued)'.format(
                n_tasks_complete, progressbar.fmt_elapsed(), n_procs, num_tasks-n_tasks_complete-n_procs))

    @staticmethod
    def _make_multiple_tasks_doer(do_single_task):
        # Use `functools.partial` so that our resulting function will be `pickle`able (for multiprocessing).
        # See <https://stackoverflow.com/a/14550773/1166306> for more info.
        return functools.partial(Parallelizer._partialable_multiple_tasks_doer, do_single_task)
    @staticmethod
    def _partialable_multiple_tasks_doer(do_single_task, taskq, retq, parent_overrides):
        if conf.overrides and conf.overrides != parent_overrides:
            err = 'Tried to pass parent_overrides {!r} down to child process that already had overrides {!r}'.format(parent_overrides, conf.overrides)
            retq.put({'type': 'exception', 'task': None, 'exception_str': err, 'exception_tb': err})
            raise Exception(err)
        conf.overrides.update(parent_overrides)
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

def get_phenos_subset(pheno_subset_str:str) -> List[Dict[str,Any]]:
    phenos = get_phenolist()
    idxs_to_include = _get_idxs_from_subset_str(pheno_subset_str)
    return [phenos[idx] for idx in idxs_to_include]
def _get_idxs_from_subset_str(subset_str:str) -> List[int]:
    if not re.match(r'^(\d+(-\d+)?)(,\d+(-\d+)?)*$', subset_str):
        raise PheWebError("Couldn't parse subset string: {}".format(repr(subset_str)))
    idxs: Set[int] = set()
    for part in subset_str.split(','):
        if '-' in part:
            start, stop = part.split('-')
            idxs.update(range(int(start), 1+int(stop)))
        else:
            idxs.add(int(part))
    return sorted(idxs)
assert list(_get_idxs_from_subset_str('1,3,5-7')) == [1,3,5,6,7]
assert list(_get_idxs_from_subset_str('5-7,1,3,3-3')) == [1,3,5,6,7]

def indent(string:str) -> str:
    return '\n'.join('   '+line for line in str(string).split('\n'))

def mtime(filepath:Union[str,Path]) -> float:
    return os.stat(filepath).st_mtime


class ProgressBar:
    def __enter__(self) -> "ProgressBar":
        self._start_time = time.time()
        self._last_time_written = 0.
        self._last_message_written = ''
        self._last_message_set = ''
        # if we're writing to a log file, just use newlines.
        # unfortunately, that'll make really long output that can hide important warnings.
        # TODO: decide what to do about that.
        self._r = '\r' if sys.stderr.isatty() else '\n'
        return self
    def __exit__(self, *args) -> None:
        self._write_message(self._last_message_set)
        sys.stderr.write('\n')
    def prepend_message(self, message:str) -> None:
        first_line, following_lines = message.split('\n', 1)
        sys.stderr.write(
            self._r + first_line +
            ' '*max(0, len(self._last_message_written) - len(message)) + '\n' +
            following_lines + '\n' +
            self._last_message_set
        )
        self._last_time_written = time.time()
    def set_message(self, message:str) -> None:
        self._last_message_set = message
        t = time.time()
        if t > self._last_time_written + 0.5:
            self._write_message(message, t=t)
    def _write_message(self, message:str, t:Optional[float] = None) -> None:
        # TODO: handle multiline messages
        if message != self._last_message_written:
            sys.stderr.write(
                self._r + message +
                ' '*max(0, len(self._last_message_written) - len(message))
            )
            self._last_message_written = message
            self._last_time_written = t or time.time()
    def fmt_elapsed(self) -> str:
        return fmt_seconds(time.time() - self._start_time)
