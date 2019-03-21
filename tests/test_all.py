
#TODO: use subprocess to eliminate conf_utils state?
#TODO: split into multiple tests that share tmpdir and run in order

import os



def test_all(tmpdir, capsys):
    p = tmpdir.realpath()
    with capsys.disabled(): print('\n{}'.format(p))
    indir = os.path.join(os.path.dirname(__file__), 'input_files/')
    conf = ['conf', 'data_dir="{}"'.format(p), 'cache="{}/fake-cache"'.format(indir)]

    # with capsys.disabled():
    #     print('tmpdir:', repr(p))
    #     print('__file__:', repr(__file__))
    #     print('indir:', repr(indir))
    #     print('conf:', repr(conf))
    #     print('fake-cache:', repr(os.listdir(indir+'/fake-cache')))


    from pheweb.command_line import run as cl_run
    cl_run(conf+['-h'])
    cl_run(conf+['phenolist', 'glob', '--simple-phenocode', '{}/assoc-files/*'.format(indir)])
    cl_run(conf+['phenolist', 'unique-phenocode'])
    cl_run(conf+['phenolist', 'read-info-from-association-files'])
    cl_run(conf+['phenolist', 'filter-phenotypes', '--minimum-num-cases', '20', '--minimum-num-controls', '20', '--minimum-num-samples', '20'])
    cl_run(conf+['phenolist', 'hide-small-numbers-of-samples', '--minimum-visible-number', '50'])
    cl_run(conf+['phenolist', 'hide-small-numbers-of-samples', '--minimum-visible-number', '50'])
    cl_run(conf+['phenolist', 'import-phenolist', '-f', '{}/pheno-list-categories.json'.format(p), '{}/categories.csv'.format(indir)])
    cl_run(conf+['phenolist', 'merge-in-info', '{}/pheno-list-categories.json'.format(p)])
    cl_run(conf+['phenolist', 'verify', '--required-columns', 'category'])
    # with capsys.disabled(): print(1)
    # with capsys.disabled():
    #     import pheweb.conf_utils
    #     print(pheweb.conf_utils.conf)
    # TODO: verify that `dbsnp-{latest}.tsv` exists (so that it won't be downloaded/parsed)
    # TODO: replace `process` with each sub-step.
    cl_run(conf+['process'])
    # TODO: check some properties of our files, such as manh.json
    cl_run(conf+['top-loci'])
    cl_run(conf+['wsgi'])
    # with capsys.disabled(): print(2)

    from pheweb.serve.server import app # TODO: this relies on data_dir being set earlier, but shouldn't.
    app.testing = True # makes application exception propogate up to `client`
    with app.test_client() as client:
        assert client.get('/').status_code == 200
        assert client.get('/variant/15-55447871-C-T').status_code == 200
        assert client.get('/static/variant.js').status_code == 200
        assert client.get('/pheno/snowstorm').status_code == 200
        assert client.get('/api/manhattan/pheno/snowstorm.json').status_code == 200
        assert client.get('/api/qq/pheno/snowstorm.json').status_code == 200
        assert client.get('/region/snowstorm/8-926279-1326279').status_code == 200
        assert client.get('/api/region/snowstorm/lz-results/?filter=chromosome%20in%20%20%278%27%20and%20position%20ge%20976279%20and%20position%20le%201276279').status_code == 200
        assert client.get('/region/snowstorm/gene/DNAH14?include=1-225494097').status_code == 200
        assert client.get('/api/autocomplete?query=%20DAP-2').status_code == 200
        assert b'EAR-LENGTH' in client.get('/region/1/gene/SAMD11').data
        assert b'\t' in client.get('/download/top_hits.tsv').data
