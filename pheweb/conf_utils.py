
# This module creates the object `conf`.
# It also offers some configuration-related utility functions.

from . import utils

import os
import imp
import itertools
from collections import OrderedDict
from copy import deepcopy
from boltons.fileutils import mkdir_p


class _Attrdict(dict):
    '''a dictionary where dict.key is a proxy for dict[key]'''
    def __getattr__(self, attr):
        try: return self[attr]
        except KeyError: raise AttributeError()
    def __setattr__(self, attr, val):
        self[attr] = val
conf = _Attrdict()
conf.parse = _Attrdict()



### Data_Dir, config.py, &c

conf.data_dir = os.path.abspath(os.environ.get('PHEWEB_DATADIR', False) or os.path.curdir)
if not os.path.isdir(conf.data_dir):
    mkdir_p(conf.data_dir)
if not os.access(conf.data_dir, os.R_OK):
    raise Exception("Your data directory, {!r}, is not readable.".format(conf.data_dir))

config_file = os.path.join(conf.data_dir, 'config.py')
if os.path.isfile(config_file):
    try:
        conf_module = imp.load_source('config', config_file)
    except:
        raise Exception("PheWeb tried to load your config.py at {!r} but it failed.".format(config_file))
    else:
        for key in dir(conf_module):
            if not key.startswith('_'):
                conf[key] = getattr(conf_module, key)

if 'custom_templates' not in conf:
    conf['custom_templates'] = os.path.join(conf.data_dir, 'custom_templates')

if 'debug' not in conf: conf.debug = False


### Cache

def _configure_cache():
    # if conf['cache'] exists and is Falsey, don't cache.
    if 'cache' in conf and not conf['cache']:
        del conf['cache']
        return
    # if it doesn't exist, use the default.
    if 'cache' not in conf:
        conf.cache = '~/.pheweb/cache'
    conf.cache = os.path.expanduser(conf['cache'])
    # check whether dir exists
    if not os.path.isdir(conf['cache']):
        try:
            mkdir_p(conf.cache)
        except:
            print("Warning: caching is disabled because the directory {!r} can't be created.\n".format(conf.cache) +
                  "If you don't want caching, set `cache = False` in your config.py.")
            del conf['cache']
            return
    if not os.access(conf['cache'], os.R_OK):
        print('Warning: the directory {!r} is configured to be your cache directory but it is not readable.\n'.format(conf.cache) +
              "If you don't want caching, set `cache = False` in your config.py.")
        del conf['cache']
_configure_cache()


### Parsing

class Field:
    def __init__(self, d):
        self._d = d
    def parse(self, value):
        '''parse from input file'''
        # nullable
        if self._d['nullable'] and value in conf.parse.null_values:
            return ''
        # type
        x = self._d['type'](value)
        # range
        if 'range' in self._d:
            assert self._d['range'][0] is None or x >= self._d['range'][0]
            assert self._d['range'][1] is None or x <= self._d['range'][1]
        if 'sigfigs' in self._d:
            x = utils.round_sig(x, self._d['sigfigs'])
        return x
    def read(self, value):
        '''read from internal file'''
        if self._d['nullable'] and value == '':
            return ''
        x = self._d['type'](value)
        if 'range' in self._d:
            assert self._d['range'][0] is None or x >= self._d['range'][0]
            assert self._d['range'][1] is None or x <= self._d['range'][1]
        return x

default_null_values = ['.', 'NA', 'nan', 'NaN']

default_field = {
    'aliases': [],
    'required': False,
    'type': str,
    'nullable': False,
    'from_assoc_files': True, # if this is False, then the field will not be parsed from input files, because annotation will add it.
}

default_per_variant_fields = OrderedDict([
    ('chrom', {
        'aliases': ['#CHROM', 'chr'],
        'required': True,
    }),
    ('pos', {
        'aliases': ['BEG', 'BEGIN', 'BP'],
        'required': True,
        'type': int,
        'range': [0, None],
    }),
    ('ref', {
        'aliases': ['reference', 'allele0'],
        'required': True,
    }),
    ('alt', {
        'aliases': ['alternate', 'allele1'],
        'required': True,
    }),
    ('rsids', {
        'from_assoc_files': False,
    }),
    ('nearest_genes', {
        'from_assoc_files': False,
    }),
])

default_per_assoc_fields = OrderedDict([
    ('pval', {
        'aliases': ['PVALUE'],
        'required': True,
        'type': float,
        'nullable': True,
        'range': [0, 1],
        'sigfigs': 2,
    }),
    ('beta', {
        'type': float,
        'nullable': True,
        'sigfigs': 2,
    }),
    ('sebeta', {
        'type': float,
        'nullable': True,
        'sigfigs': 2,
    }),
    ('or', {
        'type': float,
        'nullable': True,
        'range': [0, None],
        'sigfigs': 2,
    }),
    ('maf', {
        'type': float,
        'range': [0, 0.5],
        'sigfigs': 2,
    }),
    ('af', {
        'type': float,
        'range': [0, 1],
        'sigfigs': 2, # TODO: never round 99.99% to 100%.  Make sure MAF would have the right sigfigs.
    }),
    ('ac', {
        'type': float,
        'range': [0, None],
    }),
    ('r2', {
        'type': float,
        'nullable': True,
    }),
])

default_per_pheno_fields = OrderedDict([
    ('num_cases', {
        'aliases': ['NS.CASE', 'N_cases'],
        'type': int,
        'nullable': True,
        'range': [0, None],
    }),
    ('num_controls', {
        'aliases': ['NS.CTRL', 'N_controls'],
        'type': int,
        'nullable': True,
        'range': [0, None],
    }),
    ('num_samples', {
        'aliases': ['NS', 'N'],
        'type': int,
        'nullable': True,
        'range': [0, None],
    }),
    # TODO: phenocode, phenostring, category, &c?
    # TODO: include `assoc_files` with {never_send: True}?
])

conf.parse.null_values = deepcopy(default_null_values)
conf.parse.per_variant_fields = deepcopy(default_per_variant_fields)
conf.parse.per_assoc_fields = deepcopy(default_per_assoc_fields)
conf.parse.per_pheno_fields = deepcopy(default_per_pheno_fields)
conf.parse.fields = OrderedDict(itertools.chain(conf.parse.per_variant_fields.items(),
                                                conf.parse.per_assoc_fields.items(),
                                                conf.parse.per_pheno_fields.items()))
assert len(conf.parse.fields) == len(conf.parse.per_variant_fields) + len(conf.parse.per_assoc_fields) + len(conf.parse.per_pheno_fields) # no overlaps!

if 'aliases' in conf:
    for alias, field in conf.aliases.items():
        conf.parse.fields[field].setdefault('aliases', []).append(alias)

if 'null_values' in conf:
    conf.parse.null_values.extend(conf.null_values)

# make all aliases lowercase and add parsers
for field_name, field_dict in conf.parse.fields.items():
    for k,v in default_field.items():
        field_dict.setdefault(k, v)
    field_dict['aliases'] = list(set([field_name.lower()] + [alias.lower() for alias in field_dict['aliases']]))
    field_dict['_parse'] = Field(field_dict).parse
    field_dict['_read']  = Field(field_dict).read
