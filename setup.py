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

version = imp.load_source('pheweb.version', os.path.join('pheweb', 'version.py')).version

setup(
    name='PheWeb',
    version=version,
    description="A tool for building PheWAS websites from association files",
    long_description='Please see the README `on github <https://github.com/statgen/pheweb>`__',
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
        'cffi~=1.11',
        'pytest-runner~=4.0',
    ],
    install_requires=[
        'finngen_common_data_model@git+https://github.com/FINNGEN/finngen-common-data-model.git@7a3d457cdcccdbd7e8be173259150ec98e2737ad#egg=finngen_common_data_model',
        'pheweb_colocalization@git+https://github.com/FINNGEN/pheweb-colocalization.git@f2a707f6d74049a235a9eede5c81ce7679bb2a9b#egg=pheweb_colocalization',
        'Jinja2~=3.0.3',
        'Flask~=2.0.3',
        'Flask-Compress~=1.10.1',
        'Flask-Cors~=3.0.10',
        'Flask-Login~=0.5.0',
        'Werkzeug~=2.0.0',
        'pyasn1~=0.4.6',
        'google-api-python-client~=2.33.0',
        'google-auth~=2.3.3',
        'google-auth-httplib2~=0.1.0',
        'google-compute-engine~=2.8.13',
        'rauth~=0.7',
        'pysam~=0.21.0',
        'marisa-trie~=0.7',
        'intervaltree~=2.1',
        'tqdm~=4.14',
        'openpyxl~=2.5',
        'scipy~=1.0',
        'numpy~=1.14',
        'requests[security]~=2.18',
        'cryptography~=3.2',
        'idna~=2.6',
        'gunicorn~=19.7',
        'boltons~=18.0',
        'blist~=1.3.6',
        'cffi~=1.11',
        'wget~=3.2',
        'elasticsearch~=6.2.0',
        'latex~=0.7.0',
        'attrs',
        'pandas~=0.24.2',
        'SQLAlchemy~=1.3.19',
        'PyMySQL>=0.10.1',
        'mysqlclient>=2.0.1',
        'smart_open[gcs]~=5.2.1',
        'tiledb==0.18.3',
    ],
    dependency_links=[
        'https://github.com/FINNGEN/finngen-common-data-model.git@7a3d457cdcccdbd7e8be173259150ec98e2737ad#egg=finngen_common_data_model'
        'https://github.com/FINNGEN/pheweb-colocalization.git@f2a707f6d74049a235a9eede5c81ce7679bb2a9b#egg=pheweb_colocalization',
    ],
    tests_require=[
        'pytest~=3.4',
    ],
)
