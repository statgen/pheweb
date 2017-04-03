


# TODO: color lines with ==> using colors like $(tput setab 3 2>/dev/null; tput setaf 0 2>/dev/null) $text $(tput sgr0 2>/dev/null)

from .. import utils
conf = utils.conf

import time
import importlib

scripts = '''
get_cpras
merge_cpras
download_rsids
download_genes
make_gene_aliases_trie
add_rsids
add_genes
make_tries
standardize_phenos
make_manhattan
make_qq
make_matrix
bgzip_phenos
top_hits
gather_pvalues_for_each_gene
'''.split()

def run(argv):
    if argv and argv[0] == '-h':
        print('Run all the steps to go from a prepared phenolist to a ready-to-serve pheweb.')
        print('This is equivalent to running:\n')
        print(' &&\n'.join('    pheweb {}'.format(script.replace('_', '-')) for script in scripts))
        exit(0)

    for script in scripts:
        print('==> Starting `pheweb {}`'.format(script.replace('_', '-')))
        start_time = time.time()
        module = importlib.import_module('.{}'.format(script), __package__)
        try:
            module.run([])
        except Exception:
            print('==> failed after {:.0f} seconds'.format(time.time() - start_time))
            raise
        else:
            print('==> Completed in {:.0f} seconds'.format(time.time() - start_time), end='\n\n')
