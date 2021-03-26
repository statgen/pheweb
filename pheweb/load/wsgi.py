from .. import utils
from ..file_utils import get_generated_path, make_basedir

import os

template1 = '''
import os, sys

# Add the pheweb package into the PYTHONPATH so that we can import it.
# This assumes that you cloned pheweb from github.  If you installed with pip, maybe this has no effect?
sys.path.insert(0, '{pheweb_dir}')
'''

template2 = '''
# Activate a virtual environment to get pheweb's dependencies.
path = os.path.join('{venv_dir}/bin/activate_this.py')
with open(path) as f:
    code = compile(f.read(), path, 'exec')
    exec(code, dict(__file__=path))
'''

template3 = '''
# `data_dir` is the directory that contains `config.py` and `generated-by-pheweb/`.
data_dir = os.path.dirname(os.path.abspath(__file__))
os.environ['PHEWEB_DATADIR'] = data_dir

# Load `config.py`.
config_filepath = os.path.join(data_dir, 'config.py')
assert os.path.exists(config_filepath)
import pheweb.conf
pheweb.conf.load_overrides_from_file(config_filepath)

# WSGI uses the variable named `application`.
from pheweb.serve.server import app as application
'''

def run(argv):
    if argv and argv[0] == '-h':
        print('Make wsgi.py, which can be used with gunicorn or other WSGI-compatible webservers.')
        return

    venv_dir = os.environ.get('VIRTUAL_ENV', '')
    if venv_dir: template = template1 + template2 + template3
    else:        template = template1 + template3

    pheweb_dir = os.path.dirname(os.path.dirname(utils.__file__))
    wsgi = template.format(pheweb_dir=pheweb_dir, venv_dir=venv_dir)
    with open('wsgi.py', 'w') as f:
        f.write(wsgi)
