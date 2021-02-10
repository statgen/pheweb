

# TODO: color lines with ==> using `colorama`
# TODO: add a step to verify that the genome build is correct using detect_ref (once on first 10k of each input file, and again on `sites`)

from ..utils import fmt_seconds

import time
import importlib
from typing import List

scripts = '''
phenolist verify
parse_input_files
sites
make_gene_aliases_sqlite3
add_rsids
add_genes
make_cpras_rsids_sqlite3
augment_phenos
matrix
gather_pvalues_for_each_gene
manhattan
top_hits
qq
phenotypes
pheno_correlation
'''.split('\n')
scripts = [script for script in scripts if script]

def run(argv:List[str]) -> None:
    if any(arg in ['-h', '--help'] for arg in argv):
        print('Run all the steps to go from a prepared phenolist to a ready-to-serve pheweb.')
        print('This is equivalent to running:\n')
        print(' &&\n'.join('    pheweb {}'.format(script.replace('_', '-')) for script in scripts))
        print('')
        print("Passing `--no-parse` will skip `pheweb parse-input-files` (so it won't error if input filepaths are missing)")
        exit(1)

    if argv == ['--no-parse']:
        myscripts = [s for s in scripts if s != 'parse_input_files']
    else:
        myscripts = scripts

    for script in myscripts:
        print('==> Starting `pheweb {}`'.format(script.replace('_', '-')))
        start_time = time.time()
        script_parts = script.split()
        module = importlib.import_module('.{}'.format(script_parts[0]), __package__)
        module_run = getattr(module, 'run', None)  # appeases mypy
        if not callable(module_run): raise Exception("module.run ({!r}) isn't callable for module {!r} for script {!r}".format(module_run, module, script))
        try:
            module_run(script_parts[1:])
        except Exception:
            print('==> failed after {}'.format(fmt_seconds(time.time() - start_time)))
            raise
        else:
            print('==> Completed in {}'.format(fmt_seconds(time.time() - start_time)), end='\n\n')
