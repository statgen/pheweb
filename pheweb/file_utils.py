
from . import utils
conf = utils.conf

import os
import csv
import contextlib
import json
import gzip
from boltons.fileutils import AtomicSaver
import pysam


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
        parsers = [conf.parse.fields[field]['_read'] for field in self.fields]
        for unparsed_variant in self._reader:
            assert len(unparsed_variant) == len(self.fields)
            variant = {field: parser(value) for parser,field,value in zip(parsers, self.fields, unparsed_variant)}
            if self._chrom_idx:
                variant['chrom_idx'] = utils.chrom_order[variant['chrom']]
            yield variant


class MatrixReader:
    _fname = os.path.join(conf.data_dir, 'matrix.tsv.gz')

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

    @contextlib.contextmanager
    def context(self):
        with pysam.TabixFile(self._fname, parser=None) as tabix_file: # TODO: tell tabix which line is chrom and which is pos
            yield _mr(_tabix_file=tabix_file, _colidxs=self._colidxs, _colidxs_for_pheno=self._colidxs_for_pheno, _info_for_pheno=self._info_for_pheno)
    def get_variant(self, chrom, pos, ref, alt):
        with self.context() as mr:
            return mr.get_variant(chrom, pos, ref, alt)
    def get_region(self, chrom, start, end):
        with self.context() as mr:
            return mr.get_region(chrom, start, end)

class _mr:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)

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

    def get_variant(self, chrom, pos, ref, alt):
        if chrom not in self._tabix_file.contigs: return None
        tabix_iter = self._tabix_file.fetch(chrom, pos-1, pos+1, parser=None)
        reader = csv.reader(tabix_iter, dialect='pheweb-internal-dialect')
        for variant_row in reader:
            if self._parse_field(variant_row, 'pos') != pos:
                print('WARNING: while looking for variant {}-{}-{}-{}, saw {!r}'.format(
                    chrom, pos, ref, alt, variant_row))
                continue
            if self._parse_field(variant_row, 'ref') != ref: continue
            if self._parse_field(variant_row, 'alt') != alt: continue
            return self._parse_variant_row(variant_row)
        return None # none matched

    def get_region(self, chrom, start, end):
        '''
        return is like [{
              'chrom': 'X', 'pos': 43254, ...,
              'phenos': { '<phenocode>': {'pval': 2e-4, 'ac': 32}, ... }
            }, ...]
        '''
        if chrom not in self._tabix_file.contigs:
            return []
        tabix_iter = self._tabix_file.fetch(chrom, start, end+1, parser=None)
        reader = csv.reader(tabix_iter, dialect='pheweb-internal-dialect')
        for variant_row in reader:
            yield self._parse_variant_row(variant_row)


class IndexedVariantFileReader:
    # this obsolesces get_phenos_with_colnums()
    # this will be used by:
    #  1. region.py for augmented_pheno/*
    #  2. get_variant() for matrix.tsv.gz
    #  3. gather_pvalues_for_each_gene for matrix.tsv.gz
    # how do each of those hold an instance?  should they keep their file open?
    #  - only parses the header once.
    #  - makes pysam.TabixFile on each call.
    def __init__(self, fname):
        self.fname = fname

    def __enter__(self):
        # open pysam.TabixFile
        # return a thing that has .get_variant and .get_region
        # use `parser=None` and then use csv.reader(dialect='pheweb-internal-dialect') on the line.
        pass
    def __exit__(self, *args):
        pass





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
