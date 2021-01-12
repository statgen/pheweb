# This module finds rsid data (wherever it can) and puts a copy in `generated-by-pheweb/resources/`.

from ..utils import PheWebError
from ..file_utils import common_filepaths, get_tmp_path
from ..conf_utils import conf

import shutil, wget, os
from pathlib import Path


def get_rsids_for_build(hg_build_number: int):

    dest_filepath = Path(common_filepaths['rsids-hg{}'.format(hg_build_number)]())
    if dest_filepath.exists(): return

    # Check ~/.pheweb/cache/
    if conf.cache:
        cache_filepath = Path(conf.cache) / dest_filepath.name
        if cache_filepath.exists():
            print('Copying {} to {}'.format(cache_filepath, dest_filepath))
            shutil.copy(cache_filepath, dest_filepath)
            return

    # Download from https://resources.pheweb.org/
    url = 'https://resources.pheweb.org/{}'.format(dest_filepath.name)
    print('Downloading {} from {}'.format(dest_filepath, url))
    dest_tmp_filepath = Path(get_tmp_path(dest_filepath))
    try:
        wget.download(url=url, out=str(dest_tmp_filepath)); print()
    except Exception as exc:
        raise PheWebError('Failed to download rsids from {}.  Try `pheweb download-rsids-from-scratch` instead.'.format(url)) from exc
    os.rename(dest_tmp_filepath, dest_filepath)
    if conf.cache and Path(conf.cache).exists():
        print('Cacheing {} at {}'.format(dest_filepath, cache_filepath))
        # It's okay if this doesn't work
        try: shutil.copy(dest_filepath, cache_filepath)
        except Exception: pass

def run(argv):
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--hg', type=int, default=conf.hg_build_number, choices=[19,38])
    args = parser.parse_args(argv)
    get_rsids_for_build(args.hg)
