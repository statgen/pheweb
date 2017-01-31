
from __future__ import print_function, division, absolute_import

from .. import utils
conf = utils.conf

import os

template1 = '''
import os.path
import sys
'''

template2 = '''
path = os.path.join('{venv_dir}/bin/activate_this.py')
with open(path) as f:
    code = compile(f.read(), path, 'exec')
    exec(code, dict(__file__=path))
'''

template3 = '''
sys.path.insert(0, '{pheweb_dir}')

from pheweb import utils
utils.conf.data_dir = os.path.dirname(os.path.abspath(__file__))

from pheweb.serve.server import app as application
# The word `application` is special to WSGI
'''


def run(argv):

    if 'VIRTUAL_ENV' in os.environ:
        template = template1 + template2 + template3
    else:
        template = template1 + template3

    pheweb_dir = os.path.dirname(os.path.dirname(utils.__file__))
    venv_dir = os.environ.get('VIRTUAL_ENV', '')
    wsgi = template.format(
        pheweb_dir=pheweb_dir,
        venv_dir=venv_dir,
    )

    with open(os.path.join(conf.data_dir, 'wsgi.py'), 'w') as f:
        f.write(wsgi)
