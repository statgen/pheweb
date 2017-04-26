
from . import utils
conf = utils.conf

import os
import csv
import contextlib
import itertools
import json
from boltons.fileutils import AtomicSaver


csv.register_dialect(
    'pheweb-internal-dialect',
    delimiter='\t',
    doublequote=False,
    escapechar='\\',
    lineterminator='\n',
    quotechar='"',
    skipinitialspace=False,
    strict=True,
)


## Readers

@contextlib.contextmanager
def VariantFileReader(fname, chrom_idx=False):
    '''
    Reads variants (as dictionaries) from an internal file.  Iterable.  Exposes `.fields`.

        with VariantFileReader('a.tsv') as reader:
            print(list(reader.values()))
    '''
    with open(fname, 'rt') as f:
        reader = csv.reader(f, dialect='pheweb-internal-dialect')
        fields = next(reader)
        for field in fields:
            assert field in conf.parse.per_variant_fields or field in conf.parse.per_assoc_fields
        yield _r(fields, reader, chrom_idx=chrom_idx)
class _r:
    def __init__(self, fields, reader, chrom_idx):
        self.fields = fields
        self._reader = reader
        self._chrom_idx = chrom_idx
    def __iter__(self):
        return self._get_variants()
    def _get_variants(self):
        parsers = [conf.parse.fields[field]['_parse'] for field in self.fields]
        for unparsed_variant in self._reader:
            assert len(unparsed_variant) == len(self.fields)
            variant = {field: parser(value) for parser,field,value in zip(parsers, self.fields, unparsed_variant)}
            if self._chrom_idx:
                variant['chrom_idx'] = utils.chrom_order[variant['chrom']]
            yield variant


## Writers

def _get_part_file(fname):
    part_file = fname
    if part_file.startswith(conf.data_dir):
        part_file = part_file[len(conf.data_dir):].lstrip(os.path.sep)
    else:
        print("WARNING: outfile {!r} didn't start with conf.data_dir {!r}".format(fname, conf.data_dir))
    return os.path.join(conf.data_dir, 'tmp', part_file.replace(os.path.sep, '-'))

@contextlib.contextmanager
def VariantFileWriter(fname, allow_extra_fields=False):
    '''
    Writes variants (represented by dictionaries) to an internal file.

        with VariantFileWriter(conf.data_dir+'/a.tsv') as writer:
            writer.write({'chrom': '2', 'pos': 47, ...})
    '''
    part_file = _get_part_file(fname)
    with AtomicSaver(fname, text_mode=True, part_file=part_file, overwrite_part=True, rm_part_on_exc=False) as f:
        yield _w(f, allow_extra_fields, fname)
class _w:
    def __init__(self, f, allow_extra_fields, fname):
        self._f = f
        self._allow_extra_fields = allow_extra_fields
        self._fname = fname
    def write(self, variant):
        if not hasattr(self, '_writer'):
            fields = []
            for field in conf.parse.fields:
                if field in variant: fields.append(field)
            extra_fields = list(set(variant.keys()) - set(fields))
            if extra_fields:
                if not self._allow_extra_fields:
                    raise Exception("ERROR: found unexpected fields {!r} among the expected fields {!r} while writing {!r}.".format(
                                    extra_fields, fields, self._fname))
                fields += extra_fields
            self._writer = csv.DictWriter(self._f, fieldnames=fields, dialect='pheweb-internal-dialect')
            self._writer.writeheader()
        self._writer.writerow(variant)
    def write_all(self, variants):
        for v in variants:
            self.write(v)

def write_json(*, filename=None, data=None, indent=None, sort_keys=False):
    assert filename is not None and data is not None
    part_file = _get_part_file(filename)
    with AtomicSaver(filename, text_mode=True, part_file=part_file, overwrite_part=True, rm_part_on_exc=False) as f:
        json.dump(data, f, indent=indent, sort_keys=sort_keys)
