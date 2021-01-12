#!/usr/bin/env python3
# to install: `pip install -e .`
# to install latest from pypi: `pip3 install --upgrade --upgrade-strategy eager --no-cache-dir pheweb`
# to upload to pypi: have `~/.pypirc`, update `pheweb/version.py`, `rm -r dist && python3 setup.py sdist bdist_wheel && twine upload dist/*`
# to update dependencies: `./tests/check-for-old-requirements.py`, edit, `pip3 install -U --upgrade-strategy=eager ipython`, test
# to test: `python3 setup.py test` or `pytest`


from setuptools import setup
import importlib
import os.path
import sys


if sys.platform.startswith('win'):
    raise Exception("PheWeb doesn't support Windows, because pysam doesn't support windows.")


def load_module_by_path(module_name, filepath):
    module = importlib.util.module_from_spec(importlib.util.spec_from_file_location(module_name, filepath))
    module.__spec__.loader.exec_module(module)
    return module
version = load_module_by_path('pheweb.version', os.path.join('pheweb', 'version.py')).version

if sys.argv[-1] in ['publish', 'pub']:
    # TODO: use `class UploadCommand(setuptools.Command)` from <https://github.com/kennethreitz/setup.py/blob/master/setup.py#L49>
    import subprocess, json
    from pathlib import Path
    from urllib.request import urlopen
    # make sure there's no unstaged changess
    git_workdir_returncode = subprocess.run('git diff-files --quiet'.split()).returncode
    assert git_workdir_returncode in [0,1]
    if git_workdir_returncode == 1:
        print('=> git workdir has changes')
        print('=> please either revert or stage them')
        sys.exit(1)
    # if the local version is the same as the PyPI version, increment it
    pypi_url = 'https://pypi.python.org/pypi/PheWeb/json'
    latest_version = json.loads(urlopen(pypi_url).read())['info']['version']
    # Note: it takes pypi a minute to update the API, so this can be wrong.
    if latest_version == version:
        new_version_parts = version.split('.')
        new_version_parts[2] = str(1+int(new_version_parts[2]))
        new_version = '.'.join(new_version_parts)
        print('=> autoincrementing version {} -> {}'.format(version, new_version))
        Path('pheweb/version.py').write_text("version = '{}'\n".format(new_version))
        version = new_version
        subprocess.run(['git','stage','pheweb/version.py'])
    # commit any staged changes
    git_index_returncode = subprocess.run('git diff-index --quiet --cached HEAD'.split()).returncode
    assert git_index_returncode in [0,1]
    if git_index_returncode == 1:
        print('=> git index has changes')
        subprocess.run(['git','commit','-m',version])
    # make sure there's a ~/.pypirc
    if not Path('~/.pypirc').expanduser().exists():
        print('=> warning: you need a ~/.pypirc')
    # delete ./dist/PheWeb-* and repopulate it and upload to PyPI
    if Path('dist').exists() and list(Path('dist').iterdir()):
        setuppy = Path('setup.py').absolute() # check that we are where we think we are before unlinking
        assert setuppy.is_file() and 'pheweb' in setuppy.read_text()
        for child in Path('dist').absolute().iterdir():
            assert child.name.startswith('PheWeb-'), child
            print('=> unlinking', child)
            child.unlink()
    subprocess.run('python3 setup.py sdist bdist_wheel'.split(), check=True)
    try:
        subprocess.run('twine --version'.split())
    except FileNotFoundError:
        print('=> Run `pip3 install twine` and try again')
        sys.exit(1)
    subprocess.run('twine upload dist/*'.split(), check=True)
    if git_index_returncode == 1:
        print('=> Now do `git push`.')
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
        'pytest-runner~=4.4',
    ],
    install_requires=[
        'Flask~=1.1',
        'Flask-Compress~=1.8',
        'Flask-Login~=0.5',
        'rauth~=0.7',
        'pysam~=0.16',
        'intervaltree~=3.1',
        'tqdm~=4.51',
        'openpyxl~=3.0.5',
        'scipy~=1.5',
        'numpy~=1.19',
        'requests[security]~=2.24',
        'gunicorn~=20.0.4',
        'boltons~=20.2',
        'blist~=1.3.6',
        'cffi~=1.14', # in both `setup_requires` and `install_requires` as per <https://github.com/pypa/setuptools/issues/391>
        'wget~=3.2',
        'gevent~=20.9',
    ],
    tests_require=[
        'pytest~=6.1',
    ],
)
