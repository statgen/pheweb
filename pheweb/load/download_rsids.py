# This module finds rsid data (wherever it can) and puts a copy in `generated-by-pheweb/resources/`.

from ..utils import PheWebError
from ..file_utils import get_filepath, get_tmp_path
from .. import conf

import shutil, wget, os
from pathlib import Path
from typing import List


def get_rsids_for_build(hg_build_number: int) -> None:

    dest_filepath = Path(get_filepath('rsids-hg{}'.format(hg_build_number), must_exist=False))
    if dest_filepath.exists(): return

    # Check cache_dir
    cache_dir = conf.get_cache_dir()
    if cache_dir:
        cache_filepath = Path(cache_dir) / dest_filepath.name
        if cache_filepath.exists():
            print('Copying {} to {}'.format(cache_filepath, dest_filepath))
            shutil.copy(cache_filepath, dest_filepath)
            return

    if not conf.is_allowed_to_download():
        raise PheWebError("PheWeb is set to disallow downloading files, but couldn't pull {!r} from cache_dir {!r}".format(
            dest_filepath, conf.get_cache_dir()))

    # Download from https://resources.pheweb.org/
    url = 'https://resources.pheweb.org/{}'.format(dest_filepath.name)
    print('Downloading {} from {}'.format(dest_filepath, url))
    dest_tmp_filepath = Path(get_tmp_path(dest_filepath))
    try:
        wget.download(url=url, out=str(dest_tmp_filepath)); print()
    except Exception as exc:
        raise PheWebError('Failed to download rsids from {}.  Try `pheweb download-rsids-from-scratch` instead.'.format(url)) from exc
    os.rename(dest_tmp_filepath, dest_filepath)
    if cache_dir and Path(cache_dir).exists():
        print('Cacheing {} at {}'.format(dest_filepath, cache_filepath))
        # It's okay if this doesn't work
        try: shutil.copy(dest_filepath, cache_filepath)
        except Exception: pass

def run(argv:List[str]) -> None:
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--hg', type=int, default=conf.get_hg_build_number(), choices=[19,38])
    args = parser.parse_args(argv)
    get_rsids_for_build(args.hg)
