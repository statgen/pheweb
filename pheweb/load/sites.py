

'''
I'm reading in a full position at a time to avoid this issue that was happening before:
 ...
 1       72897673        G       A
 1       72897673        G       T
 1       72897673        G       A
 ...
'''

from ..utils import chrom_order, get_phenolist, conf
from ..file_utils import VariantFileReader, VariantFileWriter, get_generated_path, common_filepaths, make_basedir
from .load_utils import get_num_procs, get_maf

import contextlib
import os
import random
import multiprocessing
import time
from boltons.fileutils import mkdir_p
import blist
import bisect


MAX_NUM_FILES_TO_MERGE_AT_ONCE = 8 # I have no idea what's fastest.  Maybe #files / #cpus?
MIN_NUM_FILES_TO_MERGE_AT_ONCE = 4 # Try to avoid ever merging fewer than this many files at a time.

def multiprocess_merge_files_in_queue(lock, manna_dict):
    '''
    Keep a work queue of all the files we're currently working with.
    We need to merge files until (1) there's only one left, and (2) it's {type: 'merged'}.
    Each process takes some files off the queue, merges them, and pushes the result back onto the queue.
    As an optimization, if there are fewer than MIN_NUM_FILES_TO_MERGE_AT_ONCE on the work queue,
       and there are other processes still alive,
       then the process just exits rather than waste time merging a small number of files.
    '''
    while True:

        # get work to do
        with lock:
            if manna_dict['num_procs_left'] == 1 and len(manna_dict['files']) == 1 and manna_dict['files'][0]['type'] == 'merged':
                break # all done
            if len(manna_dict['files']) == 0:
                break # no work for this process
            if manna_dict['num_procs_left'] > 1 and len(manna_dict['files']) < MIN_NUM_FILES_TO_MERGE_AT_ONCE:
                break # not enough files to be worth merging, let another process do it

            my_files_to_merge =   manna_dict['files'][:MAX_NUM_FILES_TO_MERGE_AT_ONCE]
            manna_dict['files'] = manna_dict['files'][MAX_NUM_FILES_TO_MERGE_AT_ONCE:]
            print('this process is now merging {:4} files, {:4} files remaining'.format(
                len(my_files_to_merge), len(manna_dict['files'])))

        out_filepath = get_generated_path('tmp', 'merging-{}'.format(random.randrange(1e10))) # I don't like tempfile
        start_time = time.time()
        merge(my_files_to_merge, out_filepath)

        with lock:
            manna_dict['files'] = manna_dict['files'] + [{'filepath': out_filepath, 'type':'merged'}]
            print('remaining files to merge : {:4} (just did {} files in {:.0f} seconds)'.format(
                len(manna_dict['files']),
                len(my_files_to_merge),
                time.time() - start_time))

    manna_dict['num_procs_left'] -= 1

def merge(files_to_merge, out_filepath):
    with contextlib.ExitStack() as exit_stack, \
         VariantFileWriter(out_filepath) as writer:

        readers = []
        _reader_info = []
        vlm = VariantListMerger()
        for file_to_merge in files_to_merge:
            reader = iter(exit_stack.enter_context(VariantFileReader(file_to_merge['filepath'], only_per_variant_fields=True)))
            if file_to_merge['type'] == 'input' and conf.get('variant_inclusion_maf', False):
                pheno = file_to_merge['pheno']
                reader = apply_maf_cutoff(reader, pheno)
            reader_id = len(readers)
            readers.append(reader)
            _reader_info.append(file_to_merge)

            # insert the first variant of each pheno into the VariantListMerger
            try:
                v = next(reader)
            except StopIteration:
                print('Warning: {!r} didnt even have ONE variant that passed the MAF thresholds.'.format(_reader_info[reader_id]['filepath']))
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
    print('{:8} variants in {} <- {}'.format(n_variants, os.path.basename(out_filepath), [os.path.basename(f['filepath']) for f in files_to_merge]))

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
                raise Exception('trying to add {!r} to VariantMerger, but it already contains {!r} which has the same chrom-pos-ref-alt'.format(
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



def get_files_to_merge():
    for pheno in get_phenolist():
        filepath = get_generated_path('parsed', pheno['phenocode'])
        assert os.path.exists(filepath)
        yield {
            'type': 'input',
            'filepath': filepath,
            'pheno': pheno,
        }



def run(argv):

    if argv[:1] == ['-h']:
        print('1. Extract all variants that have MAF >= conf.variant_inclusion_maf from each phenotype')
        print('2. Union them.')
        print('3. Write to sites/sites-unannotated.tsv')
        exit(0)

    out_filepath = common_filepaths['unanno']
    files_to_merge = list(get_files_to_merge())

    # TODO: If a phenotype is removed, this still reports that the list of sites is up-to-date.  How to check that?
    if os.path.exists(out_filepath):
        dest_file_modification_time = os.stat(out_filepath).st_mtime
        src_file_modification_times = [os.stat(file_to_merge['filepath']).st_mtime for file_to_merge in files_to_merge]
        if dest_file_modification_time >= max(src_file_modification_times):
            print('The list of sites is up-to-date!')
            return

    print('number of files to merge: {:4}'.format(len(files_to_merge)))

    num_procs = get_num_procs()
    print('number of processes:', num_procs)

    mkdir_p(get_generated_path('tmp'))

    manna = multiprocessing.Manager()
    manna_lock = manna.Lock()
    manna_dict = manna.dict()
    manna_dict['files'] = files_to_merge
    manna_dict['num_procs_left'] = num_procs

    # TODO: switch back to Pool(num_procs).map(merge_files_in_queue, [(manna_lock, manna_dict) for _ in range(num_procs)]) with try-except
    processes = [multiprocessing.Process(target=multiprocess_merge_files_in_queue, args=(manna_lock, manna_dict)) for _ in range(num_procs)]
    for p in processes:
        p.start()
    failed = False
    for p in processes:
        p.join()
        if p.exitcode != 0:
            print('process {} exited with exitcode {}'.format(p.name, p.exitcode))
            failed = True
    print('all workers returned')
    if failed:
        raise Exception("Failed to merge.")
    else:
        assert len(manna_dict['files']) == 1, manna_dict['files']
        make_basedir(out_filepath)
        os.rename(manna_dict['files'][0]['filepath'], out_filepath)
