
'''
TODO: run on travis-ci

TODO: integrate tests with `setup.py`.
   <https://pytest.readthedocs.io/en/latest/goodpractices.html#integrating-with-setuptools-python-setup-py-test-pytest-runner>

TODO: learn how to use `tox` to test different python versions in virtualenvs
   <https://tox.readthedocs.io/en/latest/>
   <https://tox.readthedocs.io/en/latest/example/pytest.html>

TODO: use subprocess to eliminate conf_utils state?
'''

import pytest, os, random
import pheweb.version
from pheweb.command_line import run as cl_run

def test_all(tmpdir, capsys):
    p = tmpdir.realpath()
    with capsys.disabled(): print(f'\n{p}')
    indir = os.path.join(os.path.dirname(__file__), 'input_files/')

    conf = ['conf', f'data_dir="{p}"', f'cache="{indir}/fake-cache"']

    assert pheweb.version.version.count('.') == 2
    cl_run(conf+['-h'])
    cl_run(conf+['phenolist', 'glob', '--simple-phenocode', f'{indir}/assoc-files/*'])
    cl_run(conf+['phenolist', 'unique-phenocode'])
    cl_run(conf+['phenolist', 'read-info-from-association-files'])
    cl_run(conf+['phenolist', 'filter-phenotypes', '--minimum-num-cases', '20', '--minimum-num-controls', '20', '--minimum-num-samples', '20'])
    cl_run(conf+['phenolist', 'hide-small-numbers-of-samples', '--minimum-visible-number', '50'])
    cl_run(conf+['phenolist', 'hide-small-numbers-of-samples', '--minimum-visible-number', '50'])
    cl_run(conf+['phenolist', 'import-phenolist', '-f', f'{p}/pheno-list-categories.json', f'{indir}/categories.csv'])
    cl_run(conf+['phenolist', 'merge-in-info', f'{p}/pheno-list-categories.json'])
    cl_run(conf+['phenolist', 'verify', '--required-columns', 'category'])
    cl_run(conf+['process'])
    cl_run(conf+['top-loci'])
    cl_run(conf+['wsgi'])

    ## TODO: check server
    # port = random.randrange(5000,9000)
    # with capsys.disabled(): print(f'\n{port}')
    # cl_run(conf+['serve', '--port', f'{port}'])
    from pheweb.serve.server import app # TODO: this relies on data_dir being set earlier, but shouldn't.
    app.testing = True
    client = app.test_client()
    assert client.get('/').status_code == 200
    assert client.get('/variant/15-55447871-C-T').status_code == 200
    assert client.get('/static/variant.js').status_code == 200
    assert client.get('/pheno/snowstorm').status_code == 200
    assert client.get('/api/manhattan/pheno/snowstorm.json').status_code == 200
    assert client.get('/api/qq/pheno/snowstorm.json').status_code == 200
    assert client.get('/region/snowstorm/8-926279-1326279').status_code == 200
    assert client.get('http://localhost:$port/api/region/snowstorm/lz-results/?filter=analysis%20in%203%20and%20chromosome%20in%20%20%278%27%20and%20position%20ge%20976279%20and%20position%20le%201276279').status_code == 200
    assert client.get('http://localhost:$port/region/snowstorm/gene/DNAH14?include=1-225494097').status_code == 200
    assert client.get('http://localhost:$port/api/autocomplete?query=%20DAP-2').status_code == 200
    assert b'EAR-LENGTH' in client.get('http://localhost:$port/region/1/gene/SAMD11').data

    #assert 0 # shows stdout
