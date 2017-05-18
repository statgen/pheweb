
from . import utils
conf = utils.conf

import os
import csv
from contextlib import contextmanager
import json
import gzip
from boltons.fileutils import AtomicSaver, mkdir_p
import pysam


def get_generated_path(*path_parts):
    return os.path.join(conf.data_dir, 'generated-by-pheweb', *path_parts)

def make_basedir(path):
    mkdir_p(os.path.dirname(path))

def get_tmp_path(fname):
    if fname.startswith(get_generated_path()):
        mkdir_p(get_generated_path('tmp'))
        tmp_basename = fname[len(get_generated_path()):].lstrip(os.path.sep).replace(os.path.sep, '-')
        return get_generated_path('tmp', tmp_basename)
    elif fname.startswith(os.path.sep):
        return fname + '.tmp'
    else: raise Exception(fname)


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

@contextmanager
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
        yield _vfr(fields, reader, chrom_idx=chrom_idx)
class _vfr:
    def __init__(self, fields, reader, chrom_idx):
        self.fields = fields
        self._reader = reader
        self._chrom_idx = chrom_idx
    def __iter__(self):
        return self._get_variants()
    def _get_variants(self):
        parsers = [conf.parse.fields[field]['_read'] for field in self.fields]
        for unparsed_variant in self._reader:
            assert len(unparsed_variant) == len(self.fields)
            variant = {field: parser(value) for parser,field,value in zip(parsers, self.fields, unparsed_variant)}
            if self._chrom_idx:
                variant['chrom_idx'] = utils.chrom_order[variant['chrom']]
            yield variant

@contextmanager
def IndexedVariantFileReader(phenocode):
    fname = get_generated_path('augmented_pheno_gz', '{}.gz'.format(phenocode))

    with gzip.open(fname, 'rt') as f:
        reader = csv.reader(f, dialect='pheweb-internal-dialect')
        colnames = next(reader)
    assert colnames[0].startswith('#')
    colnames[0] = colnames[0][1:]
    for field in colnames:
        assert field in conf.parse.per_variant_fields or field in conf.parse.per_assoc_fields, (field)
    colidxs = {field: colnum for colnum, field in enumerate(colnames)}

    with pysam.TabixFile(fname, parser=None) as tabix_file:
        yield _ivfr(tabix_file, colidxs)
class _ivfr:
    def __init__(self, _tabix_file, _colidxs):
        self._tabix_file=_tabix_file
        self._colidxs=_colidxs

    def _parse_variant_row(self, variant_row):
        variant = {}
        for field in self._colidxs:
            val = variant_row[self._colidxs[field]]
            parser = conf.parse.fields[field]['_read']
            try:
                variant[field] = parser(val)
            except:
                print('ERROR: Failed to parse the value {!r} for field {!r} in file {!r}'.format(val, field, self._tabix_file.filename))
                raise
        return variant

    def get_region(self, chrom, start, end):
        '''
        includes `start`, does not include `end`
        return is like [{
              'chrom': 'X', 'pos': 43254, ...,
            }, ...]
        '''
        if start < 1: start = 1
        if start >= end: return []
        if chrom not in self._tabix_file.contigs: return []

        # I do not understand why I need to use `pos-1`.
        # The pysam docs talk about being zero-based or one-based. Is this what they're referring to?
        # Doesn't make much sense to me.  There must be a reason that I don't understand.
        try:
            tabix_iter = self._tabix_file.fetch(chrom, start-1, end-1, parser=None)
        except:
            print('ERROR when fetching {}-{}-{} from {}'.format(chrom, start-1, end-1, self._tabix_file.filename))
            raise
        reader = csv.reader(tabix_iter, dialect='pheweb-internal-dialect')
        for variant_row in reader:
            yield self._parse_variant_row(variant_row)

    def get_variant(self, chrom, pos, ref, alt):
        x = self.get_region(chrom, pos, pos+1)
        for variant in x:
            if variant['pos'] != pos:
                print('WARNING: while looking for variant {}-{}-{}-{}, saw {!r}'.format(
                    chrom, pos, ref, alt, variant))
                continue
            if variant['ref'] == ref and variant['alt'] == alt and variant:
                return variant
        return None


class MatrixReader:
    _fname = get_generated_path('matrix.tsv.gz')

    def __init__(self):
        phenos = utils.get_phenolist()
        phenocodes = [pheno['phenocode'] for pheno in phenos]
        self._info_for_pheno = {
            pheno['phenocode']: {k: v for k,v in pheno.items() if k != 'assoc_files'}
            for pheno in phenos
        }

        with gzip.open(self._fname, 'rt') as f:
            reader = csv.reader(f, dialect='pheweb-internal-dialect')
            colnames = next(reader)
        assert colnames[0].startswith('#')
        colnames[0] = colnames[0][1:]

        self._colidxs = {} # maps field -> column_index
        self._colidxs_for_pheno = {} # maps phenocode -> field -> column_index
        for colnum, colname in enumerate(colnames):
            if '@' in colname:
                x = colname.split('@')
                assert len(x) == 2, x
                field, phenocode = x
                assert field in conf.parse.fields, field
                assert phenocode in phenocodes, phenocode
                self._colidxs_for_pheno.setdefault(phenocode, {})[field] = colnum
            else:
                field = colname
                assert field in conf.parse.fields, (field)
                self._colidxs[field] = colnum

    def get_phenocodes(self):
        return list(self._colidxs_for_pheno)

    @contextmanager
    def context(self):
        with pysam.TabixFile(self._fname, parser=None) as tabix_file:
            yield _mr(tabix_file, self._colidxs, self._colidxs_for_pheno, self._info_for_pheno)
class _mr(_ivfr):
    def __init__(self, _tabix_file, _colidxs, _colidxs_for_pheno, _info_for_pheno):
        self._tabix_file=_tabix_file
        self._colidxs=_colidxs
        self._colidxs_for_pheno=_colidxs_for_pheno
        self._info_for_pheno=_info_for_pheno

    def _parse_field(self, variant_row, field, phenocode=None):
        colidx = self._colidxs[field] if phenocode is None else self._colidxs_for_pheno[phenocode][field]
        val = variant_row[colidx]
        parser = conf.parse.fields[field]['_read']
        try:
            return parser(val)
        except:
            print('ERROR: Failed to parse the value {!r} for field {!r}'.format(val, field) +
                  ('' if phenocode is None else ' and phenocode {!r}'.format(phenocode)))
            raise

    def _parse_variant_row(self, variant_row):
        variant = {'phenos': {}}
        for field in self._colidxs:
            variant[field] = self._parse_field(variant_row, field)
        for phenocode, fields in self._colidxs_for_pheno.items():
            if any(variant_row[self._colidxs_for_pheno[phenocode][field]] != '' for field in fields):
                p = {}
                for field in fields:
                    p[field] = self._parse_field(variant_row, field, phenocode)
                    p.update(self._info_for_pheno[phenocode])
                    variant['phenos'][phenocode] = p
        return variant




## Writers

@contextmanager
def VariantFileWriter(fname, allow_extra_fields=False):
    '''
    Writes variants (represented by dictionaries) to an internal file.

        with VariantFileWriter('a.tsv') as writer:
            writer.write({'chrom': '2', 'pos': 47, ...})
    '''
    part_file = get_tmp_path(fname)
    make_basedir(fname)
    with AtomicSaver(fname, text_mode=True, part_file=part_file, overwrite_part=True, rm_part_on_exc=False) as f:
        yield _vfw(f, allow_extra_fields, fname)
class _vfw:
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

def convert_VariantFile_to_IndexedVariantFile(vf_path, ivf_path):
    from .load.cffi._x import ffi, lib
    make_basedir(ivf_path)
    tmp_path = get_tmp_path(ivf_path)
    args = [
        ffi.new('char[]', vf_path.encode('utf8')),
        ffi.new('char[]', tmp_path.encode('utf8')),
        ffi.new('char[]', b'#'),
    ]
    lib.cffi_bgzip_file(*args)
    os.rename(tmp_path, ivf_path)

    pysam.tabix_index(
        filename=ivf_path, force=True,
        seq_col=0, start_col=1, end_col=1 # note: these are 0-based, but `/usr/bin/tabix` is 1-based
    )



def write_json(*, filename=None, data=None, indent=None, sort_keys=False):
    assert filename is not None and data is not None
    part_file = get_tmp_path(filename)
    make_basedir(filename)
    with AtomicSaver(filename, text_mode=True, part_file=part_file, overwrite_part=True, rm_part_on_exc=False) as f:
        json.dump(data, f, indent=indent, sort_keys=sort_keys)
