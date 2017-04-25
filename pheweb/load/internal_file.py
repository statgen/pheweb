
from .. import utils
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
def VariantFileWriter(fname):
    '''
    Writes variants (represented by dictionaries) to an internal file.

        with VariantFileWriter(conf.data_dir+'/a.tsv') as writer:
            writer.write({'chrom': '2', 'pos': 47, ...})
    '''
    part_file = _get_part_file(fname)
    with AtomicSaver(fname, text_mode=True, part_file=part_file, overwrite_part=True, rm_part_on_exc=False) as f:
        yield _w(f)
class _w:
    def __init__(self, f):
        self._f = f
    def write(self, variant):
        if not hasattr(self, '_writer'):
            fields = []
            for field in itertools.chain(conf.parse.per_variant_fields, conf.parse.per_assoc_fields):
                if field in variant: fields.append(field)
            self._writer = csv.DictWriter(self._f, fieldnames=fields, dialect='pheweb-internal-dialect')
            self._writer.writeheader()
        else:
            self._writer.writerow(variant)
    def write_all(self, variants):
        for v in variants:
            self.write(v)

# @contextlib.contextmanager
# def RowFileWriter(fname):
#     '''
#     Writes variants (represented by tuples/dicts) to an internal file.
#
#         with RowFileWriter(conf.data_dir+'/a.tsv') as writer:
#             writer.write(['chrom', 'pos', 'ref', 'alt'])
#             writer.write(['2', 432, 'A', 'G'])
#     '''
#     part_file = _get_part_file(fname)
#     with AtomicSaver(fname, text_mode=True, part_file=part_file, overwrite_part=True, rm_part_on_exc=False) as f:
#         yield _w2(f)
# class _w2:
#     def __init__(self, f):
#         self._writer = csv.writer(f, dialect='pheweb-internal-dialect')
#     def write(self, row):
#         self._writer.writerow(row)
#     def write_all(self, rows):
#         for row in rows:
#             self.write(row)

def write_json(fname, data):
    part_file = _get_part_file(fname)
    with AtomicSaver(fname, text_mode=True, part_file=part_file, overwrite_part=True, rm_part_on_exc=False) as f:
        json.dump(f, data)
