
from ..utils import conf, get_phenolist
from ..file_utils import VariantFileWriter, write_json, get_generated_path
from .read_input_file import PhenoReader
from .load_utils import exception_tester, star_kwargs, get_num_procs

import itertools
import datetime
import multiprocessing
import os


@exception_tester
@star_kwargs
def convert(pheno, dest_filename):
    with VariantFileWriter(dest_filename) as writer:
        minimum_maf = conf.minimum_maf if hasattr(conf, 'minimum_maf') else None
        pheno_reader = PhenoReader(pheno, only_cpra=True, minimum_maf=minimum_maf)
        assert set(pheno_reader.fields) == set(['chrom', 'pos', 'ref', 'alt'])
        variants = pheno_reader.get_variants()
        if conf.get('quick', False): variants = itertools.islice(variants, 0, 10000)
        writer.write_all(variants)
    print('{}\t{} -> {}'.format(datetime.datetime.now(), pheno['phenocode'], dest_filename))


def get_conversions_to_do():
    phenos = get_phenolist()
    print('number of phenos:', len(phenos))
    for pheno in phenos:
        dest_filename = get_generated_path('cpra', pheno['phenocode'])
        should_write_file = not os.path.exists(dest_filename)
        if not should_write_file:
            dest_file_mtime = os.stat(dest_filename).st_mtime
            src_file_mtimes = [os.stat(fname).st_mtime for fname in pheno['assoc_files']]
            if dest_file_mtime < max(src_file_mtimes):
                should_write_file = True
        if should_write_file:
            yield {
                'pheno': pheno,
                'dest_filename': dest_filename,
            }

def run(argv):

    conversions_to_do = list(get_conversions_to_do())
    print('number of phenos to process:', len(conversions_to_do))

    with multiprocessing.Pool(get_num_procs()) as p:
        results = p.map(convert, conversions_to_do)

    bad_results = [r['args'][0]['pheno'] for r in results if not r['succeeded']]
    if bad_results:
        print('num phenotypes that failed:', len(bad_results))

        bad_result_phenocodes = {p['phenocode'] for p in bad_results}
        phenos = get_phenolist()
        good_results = [p for p in phenos if p['phenocode'] not in bad_result_phenocodes]

        fname = get_generated_path('tmp', 'pheno-list-successful-only.json')
        write_json(filename=fname, data=good_results, indent=2, sort_keys=True)
        print('wrote {} good_results (of {} total) into {!r}, which you should probably use to replace pheno-list.json'.format(len(good_results), len(phenos), fname))
        fname = get_generated_path('tmp', 'pheno-list-bad-only.json')
        write_json(filename=fname, data=bad_results, indent=2, sort_keys=True)
        print('wrote bad_results into {!r}'.format(fname))

        raise Exception('Cannot continue when some files failed')
