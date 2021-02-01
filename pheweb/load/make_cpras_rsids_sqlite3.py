
from ..file_utils import VariantFileReader, common_filepaths, get_tmp_path

import sqlite3
from pathlib import Path


sites_filepath = Path(common_filepaths['sites']())
cpras_rsids_filepath = Path(common_filepaths['cpras-rsids-sqlite3']())

def run(argv):

    if '-h' in argv or '--help' in argv:
        print('Make sqlite3 db for converting between chr-pos-ref-alt and rsid')
        exit(1)

    if cpras_rsids_filepath.exists() and cpras_rsids_filepath.stat().st_mtime >= sites_filepath.stat().st_mtime:
        print('cpras-rsids-sqlite3 is up-to-date!')

    else:
        def get_cpra_rsid_pairs():
            with VariantFileReader(sites_filepath) as reader:
                for v in reader:
                    cpra = '{chrom}-{pos}-{ref}-{alt}'.format(**v)
                    if v['rsids']:
                        for rsid in v['rsids'].split(','):
                            yield (cpra, rsid)
                    else:
                        yield (cpra, None)

        if cpras_rsids_filepath.exists(): cpras_rsids_filepath.unlink()
        cpras_rsids_tmp_filepath = Path(get_tmp_path(cpras_rsids_filepath))
        if cpras_rsids_tmp_filepath.exists(): cpras_rsids_tmp_filepath.unlink()
        db_conn = sqlite3.connect(str(cpras_rsids_tmp_filepath))
        with db_conn:
            db_conn.execute('CREATE TABLE cpras_rsids (cpra TEXT, rsid TEXT)')
            db_conn.executemany('INSERT INTO cpras_rsids (cpra, rsid) VALUES (?,?)', get_cpra_rsid_pairs())
            db_conn.execute('CREATE INDEX rsid_idx ON cpras_rsids (rsid)')

        cpras_rsids_tmp_filepath.rename(cpras_rsids_filepath)
        print('Done making cpras-rsids sqlite3 at {}'.format(str(cpras_rsids_filepath)))
