

# TODO: color lines with ==> using `colorama`
# TODO: add a step to verify that the genome build is correct using detect_ref (probably after `sites`)

import time
import importlib

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

def run(argv):
    if any(arg in ['-h', '--help'] for arg in argv):
        print('Run all the steps to go from a prepared phenolist to a ready-to-serve pheweb.')
        print('This is equivalent to running:\n')
        print(' &&\n'.join('    pheweb {}'.format(script.replace('_', '-')) for script in scripts))
        print('')
        print('Passing `--no-parse` will skip `pheweb parse-input-files`')
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
        try:
            module.run(script_parts[1:])
        except Exception:
            print('==> failed after {:.0f} seconds'.format(time.time() - start_time))
            raise
        else:
            print('==> Completed in {:.0f} seconds'.format(time.time() - start_time), end='\n\n')
