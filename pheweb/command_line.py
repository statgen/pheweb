#!/usr/bin/env python3
# -*- mode: python -*-

import sys
import os
import importlib
import functools
import math

if sys.version_info.major < 3:
    print("Sorry, PheWeb doesn't work on Python 2.  Please use Python 3 by installing it with `pip3 install pheweb`.")
    sys.exit(1)

# math.inf was introduced in python3.5
try: math.inf
except AttributeError: math.inf = float('inf')

if 'PHEWEB_IPDB' in os.environ:
    # from <http://ipython.readthedocs.io/en/stable/interactive/reference.html#post-mortem-debugging>
    from IPython.core import ultratb
    sys.excepthook = ultratb.FormattedTB(mode='Verbose', color_scheme='Linux', call_pdb=1)

handlers = {}
for submodule in '''
 phenolist
 parse_input_files
 sites
 download_rsids
 download_genes
 make_gene_aliases_trie
 add_rsids
 make_tries
 augment_phenos
 manhattan
 qq
 matrix
 bgzip_phenos
 top_hits
 gather_pvalues_for_each_gene
 process_assoc_files
 wsgi
 top_loci
'''.split():
    def f(submodule, argv):
        module = importlib.import_module('.load.{}'.format(submodule), __package__)
        module.run(argv)
    handlers[submodule.replace('_', '-')] = functools.partial(f, submodule)

def serve(argv):
    from pheweb.serve.run import run
    run(argv)
handlers['serve'] = serve

def debug(argv):
    from . import utils
    utils.conf.debug = True
    run(argv)
handlers['debug'] = debug

def quick(argv):
    from . import utils
    utils.conf.quick = True
    run(argv)
handlers['quick'] = quick

def help(argv):
    run(argv[0:1] + ['-h'])
handlers['help'] = help


def print_help_message():
    from pheweb import version
    print('''\
PheWeb {}

To see more information about a subcommand, run that command followed by `-h`.

Subcommands:

    pheweb phenolist
        prepare a list of phenotypes

    pheweb process-assoc-files
        once a phenolist has been prepared, load all data to be ready to run the server.

    pheweb serve
        host a webserver

    pheweb wsgi
        make wsgi.py, which can be used with gunicorn or other WSGI-compatible webservers.

    pheweb top-hits
        make top-hits.tsv, which contains variants that:
            - have a p-value < 10^-6
            - have a better p-value than every variant within 500kb in the same phenotype.

    pheweb top-loci
        make top-loci.tsv, which contains variants that:
            - have a p-value < 10^-6
            - have a better p-value than every variant within 500kb
            - have a better p-value than every variant within 1Mb in the same phenotype.
'''.format(version.version))


def run(argv):
    subcommand = argv[0] if argv else ''
    if subcommand in ['', '-h', '--help']:
        print_help_message()
    elif subcommand not in handlers:
        print('Unknown subcommand {!r}'.format(subcommand))
        print_help_message()
    else:
        handlers[subcommand](argv[1:])


# this is in `entry_points` in setup.py:
def main():
    run(sys.argv[1:])
