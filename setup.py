# to install: `pip install -e .` or `pip install .`
# to upload to pypi:
#     0. have a good `~/.pypirc`
#     1. set a new version in `pheweb/version.py`
#     2. `python3 setup.py sdist bdist_wheel && twine upload --skip-existing dist/PheWeb-0.9.<version>*`
# to upgrade: `pip3 install --upgrade --upgrade-strategy only-if-needed --no-cache-dir pheweb`


from setuptools import setup
import imp
import os.path

version = imp.load_source('pheweb.version', os.path.join('pheweb', 'version.py')).version

setup(
    name='PheWeb',
    version=version,
    description="A tool for building PheWAS websites from association files",
    long_description='Please see the README `on github <https://github.com/statgen/pheweb>`__', # TODO: use `try: import pypandoc; return pypandoc.convert('README.md', 'rst') except: return ''`
    author="Peter VandeHaar",
    author_email="pjvh@umich.edu",
    url="https://github.com/statgen/pheweb",
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

    packages=['pheweb'],
    entry_points={'console_scripts': [
        'pheweb=pheweb.command_line:main',
        'detect-ref=pheweb.load.detect_ref:main',
    ]},
    # TODO: add test_suite (ie, make a single file that runs tests, figure out how to access input_data, make a data_dir in /tmp)
    include_package_data=True,
    zip_safe=False,
    cffi_modules=['pheweb/load/cffi/ffibuilder.py:ffibuilder'],
    setup_requires=[
        'cffi~=1.9',
    ],
    install_requires=[
        'flask>=0.12',
        'flask-compress~=1.4',
        'flask-Login>=0.3.2',
        'rauth>=0.7.2',
        'pysam~=0.9',
        'marisa-trie~=0.7',
        'intervaltree~=2.1',
        'tqdm~=4.11',
        'openpyxl~=2.4',
        'scipy~=0.18',
        'numpy>=1.11',
        'requests[security]~=2.13',
        'gunicorn~=19.6',
        'boltons~=17.0',
        'blist~=1.3',
        'cffi~=1.9',
        'wget~=3.2',
    ]
    # LATER: when py3 gunicorn becomes compatible with inotify, add it too.
)
