#!/usr/bin/env python2

# I tried io.open(fname, bufffering=2**16), but it made things slower.  I don't know how to get better buffering.

'''
I'm reading in a full position at a time to avoid this issue that was happening before:
 ...
 1       72897673        G       A
 1       72897673        G       T
 1       72897673        G       A
 ...
'''


from __future__ import print_function, division, absolute_import

# Load config
import os.path
my_dir = os.path.dirname(os.path.abspath(__file__))
execfile(os.path.join(my_dir, '../config.config'))

# Activate virtualenv
activate_this = os.path.join(virtualenv_dir, 'bin/activate_this.py')
execfile(activate_this, dict(__file__=activate_this))

import sys
sys.path.insert(0, os.path.join(my_dir, '..'))
from utils import mkdir_p


import contextlib2 # python2 backport of python3.5+ contextlib

import glob
import random
import errno
import multiprocessing
import datetime

NUM_FILES_TO_MERGE_AT_ONCE = 8 # I have no idea what's fastest.


class CpraReader(object):
    def __init__(self, file):
        header = next(file)
        assert header.rstrip('\r\n').split('\t')[:4] == 'chr pos ref alt'.split(), repr(header)
        self.file = file
        self.peek_cpra = None
    def __iter__(self):
        return self # Do I really need this?

    def get_a_cpra(self):
        'Returns the next chrom-pos-ref-alt'
        line = next(self.file)
        v = line.rstrip('\r\n').split('\t')
        return (int(v[0]), int(v[1]), v[2], v[3])

    def next(self):
        'Returns a list of lines that are tied for the next chrom-pos.'
        if self.peek_cpra is not None:
            next_cp = [self.peek_cpra]
            self.peek_cpra = None
        else:
            next_cp = [self.get_a_cpra()]
        while True:
            cpra = self.get_a_cpra()
            if cpra[0] == next_cp[0][0] and cpra[1] == next_cp[0][1]:
                next_cp.append(cpra)
                return next_cp
            else:
                self.peek_cpra = cpra
                return next_cp
    __next__ = next # Py2



def merge(input_filenames, out_filename):
    tmp_filename = '{}/tmp/merging-{}'.format(data_dir, random.randrange(1e10)) # I don't like tempfile.

    with contextlib2.ExitStack() as es, \
         open(tmp_filename, 'w') as f_out:
        f_out.write('\t'.join('chr pos ref alt'.split()) + '\n')

        readers = {}
        for input_filename in input_filenames:
            pheno_code = os.path.basename(input_filename)
            file = es.enter_context(open(input_filename))
            readers[pheno_code] = CpraReader(file)

        next_cpras = {}
        num_next_cpras_for_pheno = {}
        for pheno_code, reader in readers.items():
            try:
                next_cp = next(reader)
            except StopIteration:
                print('StopIteration exception occurred for {}'.format(pheno_code))
                raise
            else:
                num_next_cpras_for_pheno[pheno_code] = len(next_cp)
                for cpra in next_cp:
                    next_cpras.setdefault(cpra, list()).append(pheno_code)

        n_variants = 0
        while next_cpras:
            assert len(next_cpras) <= len(input_filenames) * 2, len(next_cpras)

            next_cpra = min(next_cpras)
            f_out.write('{}\t{}\t{}\t{}\n'.format(*next_cpra))
            n_variants += 1

            for pheno_code in next_cpras[next_cpra]:
                num_next_cpras_for_pheno[pheno_code] -= 1
                assert num_next_cpras_for_pheno[pheno_code] >= 0
                if num_next_cpras_for_pheno[pheno_code] == 0:
                    try:
                        next_cp = next(readers[pheno_code])
                        num_next_cpras_for_pheno[pheno_code] = len(next_cp)
                        for cpra in next_cp:
                            next_cpras.setdefault(cpra, list()).append(pheno_code)
                    except StopIteration:
                        del readers[pheno_code]

            del next_cpras[next_cpra]

        assert not readers, readers.items()

        os.fsync(f_out.fileno()) # Recommended by <http://stackoverflow.com/a/2333979/1166306>
    os.rename(tmp_filename, out_filename)
    print('{:8} variants in {} <- {}'.format(n_variants, os.path.basename(out_filename), [os.path.basename(path) for path in input_filenames]))


mkdir_p(data_dir + '/tmp')

def merge_files_in_queue(lock, files_to_merge):

    while True:
        with lock:
            if len(files_to_merge) <= 1: # no work to do.
                return
            else:
                files_to_merge_now = files_to_merge[-NUM_FILES_TO_MERGE_AT_ONCE:]
                for _ in files_to_merge_now:
                    files_to_merge.pop()
                print('number of files to merge: {:4}'.format(len(files_to_merge)))

        out_filename = '{}/tmp/merging-{}'.format(data_dir, random.randrange(1e10)) # I don't like tempfile.

        start_time = datetime.datetime.now()
        merge(files_to_merge_now, out_filename)

        for filename in files_to_merge_now:
            if filename.startswith('{}/tmp/merging-'.format(data_dir)):
                os.remove(filename)

        with lock:
            files_to_merge.append(out_filename)
            print('number of files to merge : {:4} ({} files in {} seconds)'.format(len(files_to_merge), len(files_to_merge_now), (datetime.datetime.now() - start_time).seconds))


# # debug
# files_to_merge = glob.glob(data_dir + '/pheno/*')[:NUM_FILES_TO_MERGE_AT_ONCE]
# merge(files_to_merge, data_dir+'/tmp/debug-cpra.tsv')
# exit(0)

out_filename = data_dir + '/sites/cpra.tsv'
files_to_merge = glob.glob(data_dir + '/pheno/*')
print('number of files to merge: {:4}'.format(len(files_to_merge)))

manna = multiprocessing.Manager()
manna_lock = manna.Lock()
manna_files_to_merge = manna.list(files_to_merge)
num_processes = multiprocessing.cpu_count() * 3//4 + 1
print('number of processes:', num_processes)

processes = [multiprocessing.Process(target=merge_files_in_queue, args=(manna_lock, manna_files_to_merge)) for _ in range(num_processes)]
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
    assert len(manna_files_to_merge) == 1, manna_files_to_merge
    os.rename(manna_files_to_merge[0], out_filename)
