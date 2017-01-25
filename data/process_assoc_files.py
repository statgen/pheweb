
from __future__ import print_function, division, absolute_import

# TODO: color lines with ==> using colors like $(tput setab 3 2>/dev/null; tput setaf 0 2>/dev/null) $text $(tput sgr0 2>/dev/null)

# Load config, utils, venv
import os.path
import imp
my_dir = os.path.dirname(os.path.abspath(__file__))
utils = imp.load_source('utils', os.path.join(my_dir, '../utils.py'))
conf = utils.conf
utils.activate_virtualenv()

import imp
import time

scripts = [{'name': name} for name in '''
get_cpras
merge_cpras
download_rsids
download_genes
add_rsids
add_genes
make_tries
standardize_phenos
make_manhattan
make_qq
make_matrix
bgzip_phenos
top_loci
'''.split()]

for script in scripts:
    script['module'] = imp.load_source(script['name'], os.path.join(my_dir, script['name']+'.py'))

def run(argv):
    for script in scripts:
        print('==> Starting', script['name'])
        start_time = time.time()
        failed = False
        try:
            script['module'].run([])
        except Exception as exc:
            failed = True
        time_spent = time.time() - start_time
        if failed:
            print('==> failed.')
            print('Error message:')
            print(exc)
            raise exc
        else:
            print('==> Completed in {:.0f} seconds', end='\n\n')
