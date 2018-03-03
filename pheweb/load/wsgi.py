from .. import utils
from ..file_utils import get_generated_path, make_basedir

import os

template1 = '''
import os.path, sys
sys.path.insert(0, '{pheweb_dir}')
'''

template2 = '''
path = os.path.join('{venv_dir}/bin/activate_this.py')
with open(path) as f:
    code = compile(f.read(), path, 'exec')
    exec(code, dict(__file__=path))
'''

template3 = '''
sys.path.insert(0, '{pheweb_dir}')
os.environ['PHEWEB_DATADIR'] = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

from pheweb.serve.server import app as application
# The variable `application` is the default for WSGI
'''

def run(argv):
    out_filepath = get_generated_path('wsgi.py')
    make_basedir(out_filepath)

    if argv and argv[0] == '-h':
        print('Make {}, which can be used with gunicorn or other WSGI-compatible webservers.'.format(
            out_filepath))
        return

    venv_dir = os.environ.get('VIRTUAL_ENV', '')
    if venv_dir: template = template1 + template2 + template3
    else:        template = template1 + template3

    pheweb_dir = os.path.dirname(os.path.dirname(utils.__file__))
    wsgi = template.format(pheweb_dir=pheweb_dir, venv_dir=venv_dir)
    with open(out_filepath, 'w') as f:
        f.write(wsgi)
