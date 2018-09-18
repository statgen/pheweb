
from ..utils import chrom_order, get_phenolist, PheWebError
from ..conf_utils import conf
from ..file_utils import VariantFileReader, VariantFileWriter, common_filepaths, make_basedir, get_dated_tmp_path, get_tmp_path
from .load_utils import get_num_procs, get_maf, mtime, indent, ProgressBar

import contextlib
import os
import random
import multiprocessing
import bisect
import traceback
import blist


MAX_NUM_FILES_TO_MERGE_AT_ONCE = 8 # I have no idea what's fastest.  Maybe #files / #cpus?
MIN_NUM_FILES_TO_MERGE_AT_ONCE = 4 # Try to avoid ever merging fewer than this many files at a time.

def run(argv):
    out_filepath = common_filepaths['unanno']

    force = False
    if argv == ['-f']:
        force = True
    elif argv:
        print(
            '1. Extract all variants that have MAF >= conf.variant_inclusion_maf from each phenotype\n' +
            '2. Union them.\n' +
            '3. Write to {}\n\n'.format(out_filepath) +
            'Usage:\n'
            '  -h   print this message\n' +
            '  -f   run even if {} is up-to-date\n'.format(os.path.basename(out_filepath))
        )
        exit(1)

    manna = MergeManager()

    # TODO: If a phenotype is removed, this still reports that the list of sites is up-to-date.  How to check that?
    if os.path.exists(out_filepath) and not force:
        if mtime(out_filepath) >= max(mtime(f['filepath']) for f in manna.files):
            print('The list of sites is up-to-date!')
            return

    taskq = multiprocessing.Queue()
    retq  = multiprocessing.Queue()
    procs = [multiprocessing.Process(target=mp_target, args=(taskq, retq)) for _ in range(manna.n_procs)]
    for p in procs: p.start()
    for p in procs: manna.put_task(taskq)

    with ProgressBar() as progressbar:
        def update_progressbar():
            progressbar.set_message('Working set contains {} input files and {} merged files, with {:2} tasks in progress and {} elapsed'.format(
                sum(f['type'] == 'input' for f in manna.files),
                sum(f['type'] == 'merged' for f in manna.files),
                manna.n_procs,
                progressbar.fmt_elapsed()
            ))
        update_progressbar()
        while True:
            ret = retq.get()
            if ret['type'] == 'warning':
                progressbar.prepend_message(ret['warning_str'])
            else:
                manna.apply_ret(ret)
                if manna.put_task(taskq) == 'ALLDONE': break
                update_progressbar()
        update_progressbar()

    for p in procs:
        p.join()
        assert p.exitcode == 0
    make_basedir(out_filepath)
    os.rename(manna.files[0]['filepath'], out_filepath)


class MergeManager:
    '''Keeps track of what needs to get merged next.'''
    def __init__(self):
        self.n_procs = get_num_procs(cmd='sites')
        self.files = []
        for pheno in get_phenolist():
            filepath = common_filepaths['parsed'](pheno['phenocode'])
            assert os.path.exists(filepath)
            self.files.append({
                'type': 'input',
                'filepath': filepath,
                'pheno': pheno,
            })
    def apply_ret(self, ret):
        if ret['type'] == 'task-completion':
            self.files.append({
                'type': 'merged',
                'filepath': ret['task']['out_filepath'],
            })
        elif ret['type'] == 'exception':
            exc_filepath = get_dated_tmp_path('exception')
            with open(exc_filepath, 'wt') as f:
                f.write(
                    "Child process had exception:\n" + indent(ret['exception_str']) + '\n' +
                    "Traceback:\n" + indent(ret['exception_tb']) + '\n'
                )
            raise PheWebError('Child process had exception, info dumped to {}'.format(exc_filepath))
        else:
            raise PheWebError('Unknown ret type: {}'.format(ret['type']))
    def put_task(self, taskq):
        if self.n_procs == 1 and len(self.files) == 1 and self.files[0]['type'] == 'merged':
            # ALL DONE!
            self.n_procs -= 1
            taskq.put({'exit':True})
            return 'ALLDONE'
        elif len(self.files) == 0:
            # NO WORK, TERMINATE WORKER
            self.n_procs -= 1
            taskq.put({'exit':True})
        elif self.n_procs > 1 and len(self.files) < MIN_NUM_FILES_TO_MERGE_AT_ONCE:
            # INSUFFICIENT WORK, TERMINATE WORKER
            self.n_procs -= 1
            taskq.put({'exit':True})
        else:
            # MAKE A TASK FOR THE WORKER
            files_to_merge = self.files[:MAX_NUM_FILES_TO_MERGE_AT_ONCE]
            self.files =     self.files[MAX_NUM_FILES_TO_MERGE_AT_ONCE:]
            out_filepath = get_tmp_path('merging-{}'.format(random.randrange(1e10)))
            taskq.put({
                'files_to_merge': files_to_merge,
                'out_filepath': out_filepath,
            })


def mp_target(taskq, retq):
    for task in iter(taskq.get, {"exit":True}):
        try:
            for ret in merge(task['files_to_merge'], task['out_filepath']):
                if isinstance(ret, dict) and ret['type'] == 'warning':
                    retq.put(ret)
                else:
                    retq.put({
                        'type': 'message',
                        'message_str': 'unknown return type: {!r}'.format(ret),
                    })
            retq.put({
                'type': 'task-completion',
                'task': task,
            })
        except (Exception, KeyboardInterrupt) as exc:
            retq.put({
                'type': 'exception',
                'task': task,
                "exception_str": str(exc),
                "exception_tb": traceback.format_exc(),
            })

def merge(files_to_merge, out_filepath):
    # files_to_merge is like [
    #   {filepath: "/foo/bar", type:"input", pheno:pheno},
    #   {filepath: "/foo/bar", type:"merged"},
    # ]
    with contextlib.ExitStack() as exit_stack, \
         VariantFileWriter(out_filepath) as writer:

        readers = []
        _reader_info = []
        vlm = VariantListMerger()
        for file_to_merge in files_to_merge:
            reader = iter(exit_stack.enter_context(VariantFileReader(file_to_merge['filepath'], only_per_variant_fields=True)))
            if file_to_merge['type'] == 'input' and conf.variant_inclusion_maf:
                pheno = file_to_merge['pheno']
                reader = apply_maf_cutoff(reader, pheno)
            reader_id = len(readers)
            readers.append(reader)
            _reader_info.append(file_to_merge)

            # insert the first variant of each pheno into the VariantListMerger
            try:
                v = next(reader)
            except StopIteration:
                yield {
                    'type': 'warning',
                    'warning_str': 'Warning: {!r} didnt even have ONE variant that passed the MAF thresholds.'.format(_reader_info[reader_id]['filepath']),
                }
            vlm.insert(v, reader_id)

        # each time we pop the leftmost variant from the VariantListMerger, fetch a new variant from each pheno that contained that variant
        n_variants = 0
        while vlm:
            assert len(vlm) <= len(files_to_merge), repr(vlm)
            v, reader_ids = vlm.pop()
            writer.write(v)
            n_variants += 1
            for reader_id in reader_ids:
                try:
                    new_v = next(readers[reader_id])
                except StopIteration:
                    readers[reader_id] = None
                else:
                    vlm.insert(new_v, reader_id)

        assert all(reader is None for reader in readers), list(zip(_reader_info, readers))

    for file_to_merge in files_to_merge:
        if file_to_merge['type'] == 'merged':
            os.remove(file_to_merge['filepath'])
    #print('{:8} variants in {} <- {}'.format(n_variants, os.path.basename(out_filepath), [os.path.basename(f['filepath']) for f in files_to_merge]))

def apply_maf_cutoff(variants, pheno):
    for v in variants:
        maf = get_maf(v, pheno)
        if maf is None: yield v
        elif maf > conf.variant_inclusion_maf: yield v

class VariantListMerger:
    '''
    Works like a heap for variants, where .pop() returns the variant with the smallest chrom-pos-ref-alt.
    Also tracks which readers had the variant.
    Variants must match EXACTLY.
    '''
    def __init__(self):
        self._q = blist.blist()
        # self._q is like sorted([(key, variant_dict, [reader_id, ...]), ...])
        # key is like (chrom_idx, pos, ref, alt)

    def insert(self, variant, reader_id):
        key = self._key_from_variant(variant)
        idx = bisect.bisect_left(self._q, (key,)) # note: (a,) < (a,b)
        if idx == len(self._q) or self._q[idx][0] != key:
            # new variant, so just insert
            self._q.insert(idx, (key, variant, [reader_id]))
        else:
            # key matches, so variant must too
            if variant != self._q[idx][1]:
                raise PheWebError('trying to add {!r} to VariantMerger, but it already contains {!r} which has the same chrom-pos-ref-alt'.format(
                    variant, self._q[idx][1]))
            self._q[idx][2].append(reader_id)

    def pop(self):
        return self._q.pop(0)[1:3] # return (item, [tag, ...])

    def __len__(self):
        return len(self._q)

    def __repr__(self):
        return 'VariantMerger<_q={!r}>'.format(self._q)

    @staticmethod
    def _key_from_variant(v):
        return (chrom_order[v['chrom']], v['pos'], v['ref'], v['alt'])
