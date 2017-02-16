

'''
I'm reading in a full position at a time to avoid this issue that was happening before:
 ...
 1       72897673        G       A
 1       72897673        G       T
 1       72897673        G       A
 ...
'''

# TODO:
# - split up by chromosome?



from .. import utils
conf = utils.conf

import contextlib
import os
import random
import multiprocessing
import datetime
from boltons.fileutils import mkdir_p, AtomicSaver


NUM_FILES_TO_MERGE_AT_ONCE = 8 # I have no idea what's fastest.  Maybe #files / #cpus?
MIN_NUM_FILES_TO_MERGE_AT_ONCE = 4 # Try to avoid ever merging fewer than this many files at a time.

def exit(*args):
    # You can't catch exit(), so I override it.  TODO: don't do this.
    raise Exception()

def get_cpras(file):
    header = next(file)
    assert header.rstrip('\r\n').split('\t')[:4] == 'chrom pos ref alt'.split(), repr(header)
    for line in file:
        v = line.rstrip('\r\n').split('\t')
        yield (v[0], int(v[1]), v[2], v[3])

# TODO: instead of relying on utils.chrom_order, make our own dynamically as we encounter new chromosomes
def convert_to_numeric_chrom(cpra_iterator):
    for cpra in cpra_iterator:
        yield (utils.chrom_order[cpra[0]], cpra[1], cpra[2], cpra[3])

def order_cpras(cpra_iterator):
    # Assert that [chrom, pos, ref, alt] are in order
    prev_cpra = (-1, -1, '', '')
    for cpra in cpra_iterator:
        assert isinstance(cpra[0], int)
        if cpra[0] < prev_cpra[0]:
            print("The chromosomes in your file appear to be in the wrong order.")
            print("The required order is: {!r}".format(utils.chrom_order_list))
            print("But in your file, the chromosome {!r} came after the chromosome {!r}".format(
                utils.chrom_order_list[cpra[0]], utils.chrom_order_list[prev_cpra[0]]))
            exit(1)
        elif cpra[0] == prev_cpra[0]:
            if cpra[1] < prev_cpra[1]:
                print("The positions in your file appear to be in the wrong order.")
                print("In your file, the position {!r} came after the position {!r} on chromsome {!r}".format(
                    cpra[1], prev_cpra[1], utils.chrom_order_list[cpra[0]]))
                exit(1)
            elif cpra[1] == prev_cpra[1]:
                if cpra[2] < prev_cpra[2]:
                    print("The variants in your file appear to be in the wrong order.")
                    print("The variant {chrom}-{pos}-{ref1}-{alt1} came before {chrom}-{pos}-{ref2}-{alt2}, but they should be in the other order.".format(
                        chrom=utils.chrom_order_list[cpra[0]], pos=cpra[1],
                        ref1=prev_cpra[2], alt1=prev_cpra[3],
                        ref2=cpra[2], alt2=prev_cpra[3]))
                    print("That's because the ref allele should be in alphabetical order.")
                    exit(1)
                elif cpra[2] == prev_cpra[2] and cpra[3] < prev_cpra[3]:
                    print("The variants in your file appear to be in the wrong order.")
                    print("The variant {chrom}-{pos}-{ref}-{alt1} came before {chrom}-{pos}-{ref}-{alt2}, but they should be in the other order.".format(
                        chrom=utils.chrom_order_list[cpra[0]], pos=cpra[1], ref=cpra[2],
                        alt1=prev_cpra[3], alt2=prev_cpra[3]))
                    print("That's because the alt allele should be in alphabetical order (at least, after ref is sorted).")
                    exit(1)
        yield cpra

def merge(input_filenames, out_filename):
    tmp_filename = '{}/tmp/merging-{}'.format(conf.data_dir, random.randrange(1e10)) # I don't like tempfile.

    with contextlib.ExitStack() as es, \
         AtomicSaver(out_filename, text_mode=True, part_file=tmp_filename, overwrite_part=True) as f_out:
        f_out.write('\t'.join('chrom pos ref alt'.split()) + '\n')

        readers = {}
        for input_filename in input_filenames:
            phenocode = os.path.basename(input_filename)
            file = es.enter_context(open(input_filename))
            readers[phenocode] = order_cpras(convert_to_numeric_chrom(get_cpras(file)))

        # TODO: use heapq
        next_cpras = {}
        for phenocode, reader in readers.items():
            try:
                next_cpra = next(reader)
            except StopIteration:
                print('StopIteration exception occurred for {}'.format(phenocode))
                raise
            else:
                next_cpras.setdefault(next_cpra, list()).append(phenocode)

        n_variants = 0
        while next_cpras:
            assert len(next_cpras) <= len(input_filenames), len(next_cpras)
            n_variants += 1

            next_cpra = min(next_cpras)
            f_out.write('{chrom}\t{1}\t{2}\t{3}\n'.format(*next_cpra, chrom=utils.chrom_order_list[next_cpra[0]]))

            for phenocode in next_cpras.pop(next_cpra):
                try:
                    next_cpra = next(readers[phenocode])
                except StopIteration:
                    del readers[phenocode]
                else:
                    next_cpras.setdefault(next_cpra, []).append(phenocode)

        assert not readers, list(readers.items())

    print('{:8} variants in {} <- {}'.format(n_variants, os.path.basename(out_filename), [os.path.basename(path) for path in input_filenames]))


mkdir_p(conf.data_dir + '/sites')
mkdir_p(conf.data_dir + '/tmp')

def merge_files_in_queue(lock, manna_dict):
    # Keep a work queue of files that need to get merged.
    # Each process takes files off the queue, merges them, and pushes the result back onto the queue.
    # But if there are fewer than MIN_NUM_FILES_TO_MERGE_AT_ONCE on the work queue, and there are files currently being merged (ie, the process is not alone),
    #    then the process just exits rather than merge a small number of files.

    while True:
        with lock:
            if len(manna_dict['files_to_merge']) <= 1: # no work to do.
                return
            elif len(manna_dict['files_to_merge']) >= MIN_NUM_FILES_TO_MERGE_AT_ONCE or len(manna_dict['files_being_merged']) == 0:
                # If there's a good amount of work to do (or if we're the only process left to do the work), we merge some files.
                files_to_merge_now = manna_dict['files_to_merge'][-NUM_FILES_TO_MERGE_AT_ONCE:]
                manna_dict['files_being_merged'] = manna_dict['files_being_merged'] + files_to_merge_now
                manna_dict['files_to_merge'] = manna_dict['files_to_merge'][:-NUM_FILES_TO_MERGE_AT_ONCE]
                print('this process is now merging {:4} files, {:4} files remaining, {:4} currently in progress'.format(
                    len(files_to_merge_now), len(manna_dict['files_to_merge']), len(manna_dict['files_being_merged'])))
            else:
                return

        out_filename = '{}/tmp/merging-{}'.format(conf.data_dir, random.randrange(1e10)) # I don't like tempfile.

        start_time = datetime.datetime.now()
        merge(files_to_merge_now, out_filename)

        for filename in files_to_merge_now:
            if filename.startswith('{}/tmp/merging-'.format(conf.data_dir)):
                os.remove(filename)

        with lock:
            manna_dict['files_being_merged'] = [f for f in manna_dict['files_being_merged'] if f not in files_to_merge_now]
            manna_dict['files_to_merge'] = manna_dict['files_to_merge'] + [out_filename]
            print('remaining files to merge : {:4} (just did {} files in {} seconds)'.format(
                len(manna_dict['files_to_merge']), len(files_to_merge_now), (datetime.datetime.now() - start_time).seconds))


def get_files_to_merge():
    phenos = utils.get_phenolist()
    print('number of phenos:', len(phenos))
    for pheno in phenos:
        fname = os.path.join(conf.data_dir, 'cpra', pheno['phenocode'])
        assert os.path.exists(fname)
        yield fname


def run(argv):

    out_filename = conf.data_dir + '/sites/cpra.tsv'
    files_to_merge = list(get_files_to_merge())

    if os.path.exists(out_filename):
        dest_file_modification_time = os.stat(out_filename).st_mtime
        src_file_modification_times = [os.stat(fname).st_mtime for fname in files_to_merge]
        if dest_file_modification_time >= max(src_file_modification_times):
            print('The list of sites is up-to-date!')
            return

    print('number of files to merge: {:4}'.format(len(files_to_merge)))

    manna = multiprocessing.Manager()
    manna_lock = manna.Lock()
    manna_dict = manna.dict()
    manna_dict['files_to_merge'] = files_to_merge
    manna_dict['files_being_merged'] = []
    num_procs = utils.get_num_procs()
    print('number of processes:', num_procs)

    processes = [multiprocessing.Process(target=merge_files_in_queue, args=(manna_lock, manna_dict)) for _ in range(num_procs)]
    for p in processes:
        p.start()
    failed = False
    for p in processes:
        p.join()
        if p.exitcode != 0:
            print('process {} exited with exitcode {}'.format(p.name, p.exitcode))
            failed = True

    print('all workers returned')
    if not failed:
        assert len(manna_dict['files_to_merge']) == 1, manna_dict['files_to_merge']
        os.rename(manna_dict['files_to_merge'][0], out_filename)
