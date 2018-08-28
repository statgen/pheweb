#!/usr/bin/env python3
# to install: `pip install -e .` or `pip install .`
# to upload to pypi:
#     0. have a good `~/.pypirc`
#     1. set a new version in `pheweb/version.py`
#     2. `rm -r dist && python3 setup.py sdist bdist_wheel && twine upload dist/*`
# to upgrade: `pip3 install --upgrade --upgrade-strategy only-if-needed --no-cache-dir pheweb`
# to test: `python3 setup.py test`


from setuptools import setup
import imp
import os.path
import sys

if sys.version_info[:2] == (3,7):
    try:
        import pysam # noqa: F401
    except ImportError:
        raise Exception('\n\n'
                        'PheWeb depends on pysam, which currently cannot be installed from the python package index (pypi) for python 3.7.\n'
                        '(More information is at <https://github.com/pysam-developers/pysam/issues/697#issuecomment-402735807>)\n'
                        'Please run these two commands to install pysam:\n'
                        '  pip3 install -U cython\n'
                        '  pip3 install https://github.com/pysam-developers/pysam/archive/master.zip\n'
                        'Then try to install pheweb again.')


version = imp.load_source('pheweb.version', os.path.join('pheweb', 'version.py')).version

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
    python_requires=">=3.4",
    setup_requires=[
        'cffi~=1.11',
        'pytest-runner~=4.0',
    ],
    install_requires=[
        'Flask>=0.12',
        'Flask-Compress~=1.4',
        'Flask-Login~=0.4',
        'rauth~=0.7',
        'pysam~=0.14',
        'marisa-trie~=0.7',
        'intervaltree~=2.1',
        'tqdm~=4.14',
        'openpyxl~=2.5',
        'scipy~=1.0',
        'numpy~=1.14',
        'requests[security]~=2.18',
        'gunicorn~=19.7',
        'boltons~=18.0',
        'blist~=1.3',
        'cffi~=1.11',
        'wget~=3.2',
        'gevent~=1.2',
    ],
    tests_require=[
        'pytest~=3.4',
    ],
)
