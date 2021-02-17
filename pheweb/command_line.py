#!/usr/bin/env python3

from . import conf
from .utils import PheWebError

import sys, json
import os
import importlib
import functools
import math
from typing import List,Dict,Callable


if sys.platform.startswith('win'):
    raise Exception("PheWeb doesn't support Windows, because pysam doesn't support windows.")
if sys.version_info.major <= 2:
    print("PheWeb requires Python 3.  Please use Python 3 by installing it with `pip3 install pheweb` or `python3 -m pip install pheweb`.")
    sys.exit(1)
if sys.version_info < (3, 6):
    print("PheWeb requires Python 3.6 or newer.  Use Miniconda or Homebrew or another solution to install a newer Python.")
    sys.exit(1)


if 'PHEWEB_IPDB' in os.environ:
    # from <http://ipython.readthedocs.io/en/stable/interactive/reference.html#post-mortem-debugging>
    from IPython.core import ultratb
    sys.excepthook = ultratb.FormattedTB(mode='Verbose', color_scheme='Linux', call_pdb=1)


handlers:Dict[str,Callable[[List[str]],None]] = {}
for submodule in '''
 phenolist
 cluster
 parse_input_files
 sites
 download_rsids
 download_rsids_from_scratch
 download_genes
 download_genes_from_scratch
 make_gene_aliases_sqlite3
 add_rsids
 add_genes
 make_cpras_rsids_sqlite3
 augment_phenos
 pheno_correlation
 best_of_pheno
 manhattan
 qq
 matrix
 top_hits
 phenotypes
 gather_pvalues_for_each_gene
 process_assoc_files
 wsgi
 top_loci
 detect_ref
'''.split():
    def f(submodule:str, argv:List[str]) -> None:
        module = importlib.import_module('.load.{}'.format(submodule), __package__)
        module_run = getattr(module, 'run', None)
        if not callable(module_run): raise Exception("module.run ({!r}) isn't callable for module {!r}".format(module_run, module))
        module_run(argv)
    handlers[submodule.replace('_', '-')] = functools.partial(f, submodule)
handlers['process'] = handlers['process-assoc-files']
handlers['parse'] = handlers['parse-input-files']

def serve(argv:List[str]) -> None:
    from pheweb.serve.run import run
    run(argv)
handlers['serve'] = serve

def configure(argv:List[str]) -> None:
    for i, arg in enumerate(argv):
        if '=' not in arg: break
        k,v = arg.split('=', 1)
        try: v = json.loads(v)
        except json.JSONDecodeError: pass
        conf.set_override(k, v)
    else:
        print(json.dumps(conf.overrides, indent=2))
        return
    run(argv[i:])
handlers['conf'] = configure


def print_help_message() -> None:
    from pheweb import version
    print('''\
PheWeb {}

To see more information about a subcommand, run that command followed by `-h`.

Subcommands:

    pheweb phenolist
        Prepare a list of phenotypes.

    pheweb process
        Once a phenolist has been prepared, load all data to be ready to run the server.

    pheweb serve
        Host a webserver.

    pheweb conf key=value ... <subcommand> <arg>...
        Run `pheweb <subcommand> <arg>...` with some configuration changed, overriding values in `config.py`.

    pheweb conf
        Show configuration.

'''.format(version.version))


def run(argv:List[str]) -> None:
    subcommand = argv[0] if argv else ''
    if subcommand in ['', '-h', '--help']:
        print_help_message()
    elif subcommand not in handlers:
        print('Unknown subcommand {!r}\n'.format(subcommand))
        print_help_message()
    else:
        handlers[subcommand](argv[1:])

# this is in `entry_points` in setup.py:
def main() -> None:
    # Load config.py
    config_filepath = os.path.join(conf.get_data_dir(), 'config.py')
    if os.path.isfile(config_filepath):
        conf.load_overrides_from_file(config_filepath)
    # Run
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
        if isinstance(exc, PheWebError): print('\n\n'); print(exc)
        elif isinstance(exc, KeyboardInterrupt): print('\nInterrupted')
        elif isinstance(exc, SyntaxError): print(repr(exc))
        else: print('\nAn exception occurred')
        print('(Details in {})\n'.format(exc_filepath))
        exit(1)
