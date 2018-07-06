#!/usr/bin/env python3

import sys
import os
import importlib
import functools
import math


if sys.version_info.major <= 2:
    print("Sorry, PheWeb requires Python 3.  Please use Python 3 by installing it with `pip3 install pheweb` or `python3 -m pip install pheweb`.")
    sys.exit(1)
if sys.version_info < (3, 4):
    print("Sorry, PheWeb requires Python 3.4 or newer.  Use Miniconda, Linuxbrew, Homebrew, or another solution to install a newer Python.")
    sys.exit(1)

# math.inf was introduced in python3.5
try: math.inf
except AttributeError: math.inf = float('inf')


def enable_ipdb():
    # from <http://ipython.readthedocs.io/en/stable/interactive/reference.html#post-mortem-debugging>
    from IPython.core import ultratb
    sys.excepthook = ultratb.FormattedTB(mode='Verbose', color_scheme='Linux', call_pdb=1)
def enable_debug():
    from .conf_utils import conf
    conf.debug = True
def enable_quick():
    from .conf_utils import conf
    conf.quick = True

# handle environ
if 'PHEWEB_IPDB' in os.environ:
    enable_ipdb()
if 'PHEWEB_DEBUG' in os.environ:
    enable_debug()


handlers = {}
for submodule in '''
 phenolist
 slurm-parse
 parse_input_files
 sites
 download_rsids
 download_genes
 make_gene_aliases_trie
 add_rsids
 add_genes
 make_tries
 augment_phenos
 manhattan
 qq
 matrix
 bgzip_phenos
 top_hits
 phenotypes
 gather_pvalues_for_each_gene
 process_assoc_files
 wsgi
 top_loci
 detect_ref
'''.split():
    def f(submodule, argv):
        module = importlib.import_module('.load.{}'.format(submodule), __package__)
        module.run(argv)
    handlers[submodule.replace('_', '-')] = functools.partial(f, submodule)
handlers['process'] = handlers['process-assoc-files']
handlers['parse'] = handlers['parse-input-files']

def serve(argv):
    from pheweb.serve.run import run
    run(argv)
handlers['serve'] = serve

def configure(argv):
    from .conf_utils import conf
    import json
    for i, arg in enumerate(argv):
        if '=' not in arg: break
        k,v = arg.split('=', 1)
        try: conf[k] = json.loads(v)
        except json.JSONDecodeError: conf[k] = v
    else:
        print(conf)
        exit(1)
    run(argv[i:])
handlers['conf'] = configure

def debug(argv):
    enable_debug()
    run(argv)
handlers['debug'] = debug

def quick(argv):
    enable_quick()
    run(argv)
handlers['quick'] = quick

def ipdb(argv):
    enable_ipdb()
    run(argv)
handlers['ipdb'] = ipdb

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

    pheweb process
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

    pheweb conf key=value ... <subcommand> <arg>...
        run `pheweb <subcommand> <arg>...` with some configuration changed, overriding values in config.py
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
    from .utils import PheWebError
    try:
        run(sys.argv[1:])
    except (KeyboardInterrupt, Exception) as exc:
        from .file_utils import get_dated_tmp_path
        import traceback
        exc_filepath = get_dated_tmp_path('exception')
        with open(exc_filepath, 'w') as f:
            f.write('======= Exception ====\n')
            f.write(str(exc) + '\n\n')
            f.write('======= Traceback ====\n')
            f.write(traceback.format_exc())
        if isinstance(exc, PheWebError): print(exc)
        elif isinstance(exc, KeyboardInterrupt): print('\nInterrupted')
        elif isinstance(exc, SyntaxError): print(repr(exc))
        else: print('\nAn exception occurred')
        print('(Details in {})\n'.format(exc_filepath))
        exit(1)
