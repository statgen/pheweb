
# to install:
#     1. delete any build directories
#     2. `pip install -e .`
#        or `python3 setup.py install` (probably while in a virtualenv)
#        or `python3 setup.py develop` (which uses a symlink)
# to upload to pypi:
#     1. set a new version in `pheweb/version.py`
#     2. `python3 setup.py sdist bdist_wheel; twine upload --skip-existing dist/*`
# to upgrade: `pip3 install --upgrade --upgrade-strategy only-if-needed --no-cache-dir pheweb`

from setuptools import setup
import imp
import os.path

def readme():
    with open('README.rst') as f:
        return f.read()

version = imp.load_source('pheweb.version', os.path.join('pheweb', 'version.py')).version

setup(
    name='PheWeb',
    version=version,
    description="A tool for building PheWAS websites from association files",
    long_description=readme(),
    author="Peter VandeHaar",
    author_email="pjvh@umich.edu",
    url="https://github.com/statgen/pheweb",
    packages=['pheweb'],
    scripts=['bin/pheweb'],
    # TODO: use: entry_points={'console_scripts': ['pheweb=pheweb.command_line:main']},
    #       see <https://python-packaging.readthedocs.io/en/latest/everything.html>
    # TODO: add test_suite (ie, make a single file that runs tests, figure out how to access input_data, make a data_dir in /tmp)
    license="MIT",
    classifiers=[
        'Programming Language :: Python :: 3 :: Only',
        'Operating System :: Unix',
        'License :: OSI Approved :: MIT License',
        'Intended Audience :: Science/Research',
        'Topic :: Scientific/Engineering :: Visualization',
        'Topic :: Scientific/Engineering :: Bio-Informatics',
        'Topic :: Internet :: WWW/HTTP :: WSGI :: Application',
    ],
    include_package_data=True,
    zip_safe=False,
    install_requires=[
        'Flask>=0.12',
        'pysam~=0.9',
        'marisa-trie~=0.7',
        'flask-compress~=1.4',
        'intervaltree~=2.1',
        'tqdm~=4.11',
        'openpyxl~=2.4',
        'scipy~=0.18',
        'numpy>=1.11',
        'attrdict~=2.0',
        'requests~=2.13',
        'gunicorn~=19.6',
        'boltons~=17.0',
        'blist~=1.3',
    ]
)
