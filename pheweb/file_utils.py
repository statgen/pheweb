
from .utils import PheWebError, get_phenolist, chrom_order
from .conf_utils import conf

import io
import os
import csv
from contextlib import contextmanager
import json
import gzip
import datetime
from boltons.fileutils import AtomicSaver, mkdir_p
import pysam
import itertools


def get_generated_path(*path_parts):
    return os.path.join(conf.data_dir, 'generated-by-pheweb', *path_parts)

def get_cacheable_file_location(default_relative_dir, basename):
    if conf.cache:
        return os.path.join(conf.cache, basename)
    mkdir_p(get_generated_path(default_relative_dir))
    return get_generated_path(default_relative_dir, basename)

dbsnp_version = '150'
genes_version = '27'

common_filepaths = {
    'phenolist': os.path.join(conf.data_dir, 'pheno-list.json'),
    'genes': get_cacheable_file_location('sites/genes', 'genes-{}.bed'.format(genes_version)),
    'gene-aliases-trie': get_cacheable_file_location('sites/genes', 'gene_aliases.marisa_trie'), # TODO: add dbSNP version number
    'rsids': get_cacheable_file_location('sites/dbSNP', 'rsids-{}.vcf.gz'.format(dbsnp_version)),
    'unanno': get_generated_path('sites/sites-unannotated.tsv'),
    'sites-rsids': get_generated_path('sites/sites-rsids.tsv'),
    'sites': get_generated_path('sites/sites.tsv'),
    'best-phenos-by-gene': get_generated_path('best-phenos-by-gene.json'),
    'cpra-to-rsids-trie': get_generated_path('sites/cpra_to_rsids_trie.marisa'),
    'rsid-to-cpra-trie': get_generated_path('sites/rsid_to_cpra_trie.marisa'),
    'matrix': get_generated_path('matrix.tsv.gz'),
    'top-hits': get_generated_path('top_hits.json'),
    'top-hits-1k': get_generated_path('top_hits_1k.json'),
    'top-hits-tsv': get_generated_path('top_hits.tsv'),
    'top-loci': get_generated_path('top_loci.json'),
    'top-loci-tsv': get_generated_path('top_loci.tsv'),
    'phenotypes_summary': get_generated_path('phenotypes.json'),
    'parsed':    (lambda phenocode: get_generated_path('parsed', phenocode)),
    'pheno':     (lambda phenocode: get_generated_path('pheno', phenocode)),
    'pheno_gz':  (lambda phenocode: get_generated_path('pheno_gz', '{}.gz'.format(phenocode) if phenocode else '')),
    'manhattan': (lambda phenocode: get_generated_path('manhattan', '{}.json'.format(phenocode) if phenocode else '')),
    'qq':        (lambda phenocode: get_generated_path('qq', '{}.json'.format(phenocode) if phenocode else '')),
}

# TODO: make a standard function for getting file names that checks that they exist.
#       if the file doesn't exist, it prints an error message telling the user how to make that file.


def make_basedir(path):
    mkdir_p(os.path.dirname(path))

def get_tmp_path(arg):
    if arg.startswith(get_generated_path()):
        mkdir_p(get_generated_path('tmp'))
        tmp_basename = arg[len(get_generated_path()):].lstrip(os.path.sep).replace(os.path.sep, '-')
        return get_generated_path('tmp', tmp_basename)
    elif arg.startswith(os.path.sep):
        return arg + '.tmp'
    else:
        mkdir_p(get_generated_path('tmp'))
        return get_generated_path('tmp', arg)

def get_dated_tmp_path(prefix):
    assert '/' not in prefix, prefix
    time_str = datetime.datetime.isoformat(datetime.datetime.now()).replace(':', '-')
    return get_tmp_path(prefix + '-' + time_str)


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
def VariantFileReader(filepath, only_per_variant_fields=False):
    '''
    Reads variants (as dictionaries) from an internal file.  Iterable.  Exposes `.fields`.

        with VariantFileReader('a.tsv') as reader:
            print(list(reader.values()))
    '''
    with open(filepath, 'rt') as f:
        reader = csv.reader(f, dialect='pheweb-internal-dialect')
        fields = next(reader)
        for field in fields:
            assert field in conf.parse.per_variant_fields or field in conf.parse.per_assoc_fields, field
        if only_per_variant_fields:
            yield _vfr_only_per_variant_fields(fields, reader)
        else:
            yield _vfr(fields, reader)
class _vfr:
    def __init__(self, fields, reader):
        self.fields = fields
        self._reader = reader
    def __iter__(self):
        return self._get_variants()
    def _get_variants(self):
        parsers = [conf.parse.fields[field]['_read'] for field in self.fields]
        for unparsed_variant in self._reader:
            assert len(unparsed_variant) == len(self.fields), (unparsed_variant, self.fields)
            variant = {field: parser(value) for parser,field,value in zip(parsers, self.fields, unparsed_variant)}
            yield variant
class _vfr_only_per_variant_fields:
    def __init__(self, fields, reader):
        self._all_fields = fields
        self._extractors = [(conf.parse.fields[field]['_read'], field, colidx) for colidx,field in enumerate(fields) if field in conf.parse.per_variant_fields]
        self.fields = [e[1] for e in self._extractors]
        self._reader = reader
    def __iter__(self):
        return self._get_variants()
    def _get_variants(self):
        for unparsed_variant in self._reader:
            assert len(unparsed_variant) == len(self._all_fields), (unparsed_variant, self._all_fields)
            variant = {field: parser(unparsed_variant[colidx]) for parser,field,colidx in self._extractors}
            yield variant


@contextmanager
def IndexedVariantFileReader(phenocode):
    filepath = common_filepaths['pheno_gz'](phenocode)

    with read_gzip(filepath) as f:
        reader = csv.reader(f, dialect='pheweb-internal-dialect')
        colnames = next(reader)
    if colnames[0].startswith('#'): # previous version of PheWeb commented the header line
        colnames[0] = colnames[0][1:]
    for field in colnames:
        assert field in conf.parse.per_variant_fields or field in conf.parse.per_assoc_fields, (field)
    colidxs = {field: colnum for colnum, field in enumerate(colnames)}

    with pysam.TabixFile(filepath, parser=None) as tabix_file:
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
            except Exception as exc:
                raise PheWebError('ERROR: Failed to parse the value {!r} for field {!r} in file {!r}'.format(val, field, self._tabix_file.filename)) from exc
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
        except Exception as exc:
            raise PheWebError('ERROR when fetching {}-{}-{} from {}'.format(chrom, start-1, end-1, self._tabix_file.filename)) from exc
        reader = csv.reader(tabix_iter, dialect='pheweb-internal-dialect')
        for variant_row in reader:
            yield self._parse_variant_row(variant_row)

    def get_variant(self, chrom, pos, ref, alt):
        x = self.get_region(chrom, pos, pos+1)
        for variant in x:
            if variant['pos'] != pos:
                # print('WARNING: while looking for variant {}-{}-{}-{}, saw {!r}'.format(chrom, pos, ref, alt, variant))
                continue
            if variant['ref'] == ref and variant['alt'] == alt and variant:
                return variant
        return None


class MatrixReader:
    _filepath = get_generated_path('matrix.tsv.gz')

    def __init__(self):
        phenos = get_phenolist()
        phenocodes = [pheno['phenocode'] for pheno in phenos]
        self._info_for_pheno = {
            pheno['phenocode']: {k: v for k,v in pheno.items() if k != 'assoc_files'}
            for pheno in phenos
        }

        with read_gzip(self._filepath) as f:
            reader = csv.reader(f, dialect='pheweb-internal-dialect')
            colnames = next(reader)
        assert colnames[0].startswith('#'), colnames
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
        with pysam.TabixFile(self._filepath, parser=None) as tabix_file:
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
        except Exception as exc:
            error_message = 'ERROR: Failed to parse the value {!r} for field {!r}'.format(val, field)
            if phenocode is not None: error_message += ' and phenocode {!r}'.format(phenocode)
            raise PheWebError(error_message) from exc

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


def with_chrom_idx(variants):
    for v in variants:
        v['chrom_idx'] = chrom_order[v['chrom']]
        yield v


@contextmanager
def read_gzip(filepath):
    # handles buffering # TODO: profile whether this is fast.
    with gzip.open(filepath, 'rb') as f: # leave in binary mode (default), let TextIOWrapper decode
        with io.BufferedReader(f, buffer_size=2**18) as g: # 256KB buffer
            with io.TextIOWrapper(g) as h: # bytes -> unicode
                yield h

@contextmanager
def read_maybe_gzip(filepath):
    is_gzip = False
    with open(filepath, 'rb', buffering=0) as f: # no need for buffers
        if f.read(3) == b'\x1f\x8b\x08':
            is_gzip = True
    if is_gzip:
        with read_gzip(filepath) as f:
            yield f
    else:
        with open(filepath, 'rt', buffering=2**18) as f: # 256KB buffer
            yield f



## Writers

@contextmanager
def VariantFileWriter(filepath, allow_extra_fields=False):
    '''
    Writes variants (represented by dictionaries) to an internal file.

        with VariantFileWriter('a.tsv') as writer:
            writer.write({'chrom': '2', 'pos': 47, ...})

    Each variant/association/hit/loci written must have a subset of the keys of the first one.
    '''
    part_file = get_tmp_path(filepath)
    make_basedir(filepath)
    with AtomicSaver(filepath, text_mode=True, part_file=part_file, overwrite_part=True, rm_part_on_exc=False) as f:
        yield _vfw(f, allow_extra_fields, filepath)
class _vfw:
    def __init__(self, f, allow_extra_fields, filepath):
        self._f = f
        self._allow_extra_fields = allow_extra_fields
        self._filepath = filepath
    def write(self, variant):
        if not hasattr(self, '_writer'):
            fields = []
            for field in conf.parse.fields:
                if field in variant: fields.append(field)
            extra_fields = list(set(variant.keys()) - set(fields))
            if extra_fields:
                if not self._allow_extra_fields:
                    raise PheWebError("ERROR: found unexpected fields {!r} among the expected fields {!r} while writing {!r}.".format(
                                    extra_fields, fields, self._filepath))
                fields += extra_fields
            self._writer = csv.DictWriter(self._f, fieldnames=fields, dialect='pheweb-internal-dialect')
            self._writer.writeheader()
        self._writer.writerow(variant)
    def write_all(self, variants):
        for v in variants:
            self.write(v)

def write_heterogenous_variantfile(filepath, assocs):
    '''inject all necessary keys into the first association so that the writer will be made correctly'''
    assocs[0] = {field:assocs[0].get(field,'') for field in set(itertools.chain.from_iterable(assocs))}
    with VariantFileWriter(filepath, allow_extra_fields=True) as vfw:
        vfw.write_all(assocs)

def convert_VariantFile_to_IndexedVariantFile(vf_path, ivf_path):
    make_basedir(ivf_path)
    tmp_path = get_tmp_path(ivf_path)
    pysam.tabix_compress(vf_path, tmp_path, force=True)
    os.rename(tmp_path, ivf_path)

    pysam.tabix_index(
        filename=ivf_path, force=True,
        seq_col=0, start_col=1, end_col=1, # note: `pysam.tabix_index` calls the first column `0`, but cmdline `tabix` calls it `1`.
        line_skip=1, # skip header
    )


def write_json(*, filepath=None, data=None, indent=None, sort_keys=False):
    assert filepath is not None and data is not None, filepath
    part_file = get_tmp_path(filepath)
    make_basedir(filepath)
    with AtomicSaver(filepath, text_mode=True, part_file=part_file, overwrite_part=True, rm_part_on_exc=False) as f:
        json.dump(data, f, indent=indent, sort_keys=sort_keys)
