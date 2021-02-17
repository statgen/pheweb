#!/usr/bin/env python3
# to install: `pip3 install -e .`
# to install latest from pypi: `pip3 install --upgrade --upgrade-strategy eager --no-cache-dir pheweb`
# to upload to pypi: `./setup.py publish`
# to update deps: `kpa pip-find-updates`, edit, `pip3 install -U --upgrade-strategy=eager .`, test
# to test: `./setup.py test` or `pytest`

from setuptools import setup
import importlib
import sys


if sys.platform.startswith('win'):
    raise Exception("PheWeb doesn't support Windows, because pysam doesn't support windows.")
if sys.version_info.major <= 2:
    print("PheWeb requires Python 3.  Please use Python 3 by installing it with `pip3 install pheweb` or `python3 -m pip install pheweb`.")
    sys.exit(1)
if sys.version_info < (3, 6):
    print("PheWeb requires Python 3.6 or newer.  Use Miniconda or Homebrew or another solution to install a newer Python.")
    sys.exit(1)


def load_module_by_path(module_name, filepath):
    module = importlib.util.module_from_spec(importlib.util.spec_from_file_location(module_name, filepath))
    module.__spec__.loader.exec_module(module)
    return module
version = load_module_by_path('pheweb.version', 'pheweb/version.py').version


if sys.argv[-1] in ['publish', 'pub']:
    import kpa.pypi_utils
    kpa.pypi_utils.upload_package('pheweb', version)
    sys.exit(0)


setup(
    name='PheWeb',
    version=version,
    description="A tool for building PheWAS websites from association files",
    long_description='Please see the README `on github <https://github.com/statgen/pheweb>`__',
    author="Peter VandeHaar",
    author_email="pjvh@umich.edu",
    url="https://github.com/statgen/pheweb",
    classifiers=[
        'Programming Language :: Python :: 3 :: Only',
        'Operating System :: Unix',
        'Operating System :: POSIX :: Linux',
        'Operating System :: MacOS :: MacOS X',
        'License :: OSI Approved :: GNU Affero General Public License v3 or later (AGPLv3+)',
        'Intended Audience :: Science/Research',
        'Topic :: Scientific/Engineering :: Visualization',
        'Topic :: Scientific/Engineering :: Bio-Informatics',
        'Topic :: Internet :: WWW/HTTP :: WSGI :: Application',
    ],

    packages=['pheweb'],
    entry_points={'console_scripts': [
        'pheweb=pheweb.command_line:main',
        'detect-ref=pheweb.load.detect_ref:main',
    ]},
    include_package_data=True,
    zip_safe=False,
    cffi_modules=['pheweb/load/cffi/ffibuilder.py:ffibuilder'],
    python_requires=">=3.6",
    setup_requires=[
        'cffi~=1.14',
        'pytest-runner~=5.2',
    ],
    install_requires=[
        'Flask~=1.1',
        'Flask-Compress~=1.8',
        'Flask-Login~=0.5',
        'rauth~=0.7',
        'pysam~=0.16',
        'intervaltree~=3.1',
        'tqdm~=4.56',
        'scipy~=1.5',
        'numpy~=1.19',
        'requests[security]~=2.25',
        'gunicorn~=20.0.4',
        'boltons~=20.2',
        'blist~=1.3.6',
        'cffi~=1.14', # in both `setup_requires` and `install_requires` as per <https://github.com/pypa/setuptools/issues/391>
        'wget~=3.2',
        'gevent~=21.1',
        'psutil~=5.8',
    ],
    tests_require=[
        'pytest~=6.2',
    ],
)
