#!/usr/bin/env python2

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
from utils import round_sig, parse_marker_id

import contextlib2 # python2 backport of python3.5+ contextlib

import glob
import re
import csv
import collections
import random
import errno
import multiprocessing
import functools
import datetime

NUM_FILES_TO_MERGE_AT_ONCE = 8 # I have no idea what's fastest.


def merge(input_filenames, out_filename):
    tmp_filename = '{}/tmp/merging-{}'.format(data_dir, random.randrange(1e10)) # I don't like tempfile.

    def get_file_reader(file):
        header = next(file)
        assert header.rstrip('\r\n').split('\t')[:4] == 'chr pos ref alt'.split(), repr(header)
        for line in file:
            v = line.rstrip('\r\n').split('\t')
            yield (int(v[0]), int(v[1]), v[2], v[3])

    with contextlib2.ExitStack() as es, \
         open(tmp_filename, 'w') as f_out:
        f_out.write('\t'.join('chr pos ref alt'.split()) + '\n')

        readers = {}
        for input_filename in input_filenames:
            pheno_code = os.path.basename(input_filename)
            file = es.enter_context(open(input_filename))
            readers[pheno_code] = get_file_reader(file)

        next_lines = {}
        for pheno_code, reader in readers.items():
            next_line = next(reader)
            next_lines.setdefault(next_line, list()).append(pheno_code)

        while next_lines:
            next_line = min(next_lines)
            f_out.write('{}\t{}\t{}\t{}\n'.format(*next_line))

            for pheno_code in next_lines[next_line]:
                try:
                    next_lines.setdefault(next(readers[pheno_code]), list()).append(pheno_code)
                except StopIteration:
                    del readers[pheno_code]

            del next_lines[next_line]

        assert not readers, readers.items()

        os.fsync(f_out.fileno()) # Recommended by <http://stackoverflow.com/a/2333979/1166306>
    os.rename(tmp_filename, out_filename)



def mkdir_p(path):
    # like `mkdir -p`
    try:
        os.makedirs(path)
    except OSError as exc:
        if exc.errno != errno.EEXIST or not os.path.isdir(path):
            raise
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
            print('number of files to merge : {:4} (in {} seconds)'.format(len(files_to_merge), (datetime.datetime.now() - start_time).seconds))


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
