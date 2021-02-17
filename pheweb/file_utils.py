
from .utils import PheWebError, get_phenolist, chrom_order
from . import conf
from . import parse_utils

import io
import os
import csv
from contextlib import contextmanager
import json
import gzip
import datetime
from boltons.fileutils import AtomicSaver, mkdir_p
import pysam
import itertools, random
from pathlib import Path
from typing import List, Callable, Dict, Union, Iterator, Optional, Any


def get_generated_path(*path_parts:str) -> str:
    path = os.path.join(conf.get_data_dir(), 'generated-by-pheweb', *path_parts)
    make_basedir(path)
    return path

dbsnp_version = '154'
genes_version = '37'

def get_filepath(kind:str, *, must_exist:bool = True) -> str:
    if kind not in _single_filepaths: raise Exception("Unknown kind of filepath: {}".format(repr(kind)))
    filepath: str = _single_filepaths[kind]()
    if must_exist and not os.path.exists(filepath):
        raise PheWebError("Filepath {} of kind {} was requested but doesn't exist".format(filepath, kind))
    return filepath
_single_filepaths: Dict[str,Callable[[],str]] = {
    # in data_dir:
    'correlations-raw': (lambda: os.path.join(conf.get_data_dir(), 'pheno-correlations.txt')),
    'phenolist': (lambda: os.path.join(conf.get_data_dir(), 'pheno-list.json')),
    # depend on hg_build_number, dbsnp_version, genes_version:
    'rsids': (lambda: get_generated_path('resources/rsids-v{}-hg{}.tsv.gz'.format(dbsnp_version, conf.get_hg_build_number()))),
    'rsids-hg19': (lambda: get_generated_path('resources/rsids-v{}-hg19.tsv.gz'.format(dbsnp_version))),
    'rsids-hg38': (lambda: get_generated_path('resources/rsids-v{}-hg38.tsv.gz'.format(dbsnp_version))),
    'genes': (lambda: get_generated_path('resources/genes-v{}-hg{}.bed'.format(genes_version, conf.get_hg_build_number()))),
    'genes-hg19': (lambda: get_generated_path('resources/genes-v{}-hg19.bed'.format(genes_version))),
    'genes-hg38': (lambda: get_generated_path('resources/genes-v{}-hg38.bed'.format(genes_version))),
    'gene-aliases-sqlite3': (lambda: get_generated_path('resources/gene_aliases-v{}.sqlite3'.format(genes_version))),
    # simple:
    'unanno': (lambda: get_generated_path('sites/sites-unannotated.tsv')),
    'sites-rsids': (lambda: get_generated_path('sites/sites-rsids.tsv')),
    'sites': (lambda: get_generated_path('sites/sites.tsv')),
    'best-phenos-by-gene-sqlite3': (lambda: get_generated_path('best-phenos-by-gene.sqlite3')),
    'best-phenos-by-gene-old-json': (lambda: get_generated_path('best-phenos-by-gene.json')),
    'correlations': (lambda: get_generated_path('pheno-correlations.txt')),
    'cpras-rsids-sqlite3': (lambda: get_generated_path('sites/cpras-rsids.sqlite3')),
    'matrix': (lambda: get_generated_path('matrix.tsv.gz')),
    'top-hits': (lambda: get_generated_path('top_hits.json')),
    'top-hits-1k': (lambda: get_generated_path('top_hits_1k.json')),
    'top-hits-tsv': (lambda: get_generated_path('top_hits.tsv')),
    'top-loci': (lambda: get_generated_path('top_loci.json')),
    'top-loci-tsv': (lambda: get_generated_path('top_loci.tsv')),
    'phenotypes_summary': (lambda: get_generated_path('phenotypes.json')),
    'phenotypes_summary_tsv': (lambda: get_generated_path('phenotypes.tsv')),
    # directories for pheno filepaths:
    'parsed': (lambda: get_generated_path('parsed')),
    'pheno_gz': (lambda: get_generated_path('pheno_gz')),
    'best_of_pheno': (lambda: get_generated_path('best_of_pheno')),
    'manhattan': (lambda: get_generated_path('manhattan')),
    'qq': (lambda: get_generated_path('qq')),
}

def get_pheno_filepath(kind:str, phenocode:str, *, must_exist:bool = True) -> str:
    if kind not in _pheno_filepaths: raise Exception("Unknown kind of filepath: {}".format(repr(kind)))
    filepath:str = _pheno_filepaths[kind](phenocode)
    if must_exist and not os.path.exists(filepath):
        raise PheWebError("Pheno filepath {} of kind {} for phenocode {} was requested but doesn't exist".format(filepath, kind, phenocode))
    return filepath
_pheno_filepaths: Dict[str,Callable[[str],str]] = {
    'parsed': (lambda phenocode: get_generated_path('parsed', phenocode)),
    'pheno_gz': (lambda phenocode: get_generated_path('pheno_gz', '{}.gz'.format(phenocode))),
    'pheno_gz_tbi': (lambda phenocode: get_generated_path('pheno_gz', '{}.gz.tbi'.format(phenocode))),
    'best_of_pheno': (lambda phenocode: get_generated_path('best_of_pheno', phenocode)),
    'manhattan': (lambda phenocode: get_generated_path('manhattan', '{}.json'.format(phenocode))),
    'qq': (lambda phenocode: get_generated_path('qq', '{}.json'.format(phenocode))),
}


def make_basedir(path:Union[str,Path]) -> None:
    mkdir_p(os.path.dirname(path))

def get_tmp_path(arg:Union[Path,str]) -> str:
    if isinstance(arg, Path): arg = str(arg)
    if arg.startswith(get_generated_path()):
        mkdir_p(get_generated_path('tmp'))
        tmp_basename = arg[len(get_generated_path()):].lstrip(os.path.sep).replace(os.path.sep, '-')
        ret = get_generated_path('tmp', tmp_basename)
    elif arg.startswith(os.path.sep):
        ret = arg + '.tmp'
    else:
        mkdir_p(get_generated_path('tmp'))
        ret = get_generated_path('tmp', arg)
    assert ret != arg, (ret, arg)
    while os.path.exists(ret):
        ret = '{}/{}-{}'.format(os.path.dirname(ret), random.choice('123456789'), os.path.basename(ret))
    return ret

def get_dated_tmp_path(prefix:str) -> str:
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
def VariantFileReader(filepath:Union[str,Path], only_per_variant_fields:bool = False):
    '''
    Reads variants (as dictionaries) from an internal file.  Iterable.  Exposes `.fields`.

        with VariantFileReader('a.tsv') as reader:
            print(reader.fields)
            for variant in reader:
                print(variant)
    '''
    with read_maybe_gzip(filepath) as f:
        reader:Iterator[List[str]] = csv.reader(f, dialect='pheweb-internal-dialect')
        try: fields = next(reader)
        except StopIteration: raise PheWebError("It looks like the file {} is empty".format(filepath))
        if fields[0].startswith('#'): # This won't happen in normal use but it's convenient for temporary internal re-routing
            fields[0] = fields[0][1:]
        for field in fields:
            assert field in parse_utils.per_variant_fields or field in parse_utils.per_assoc_fields, field
        if only_per_variant_fields:
            yield _vfr_only_per_variant_fields(fields, reader)
        else:
            yield _vfr(fields, reader)
class _vfr:
    def __init__(self, fields:List[str], reader:Iterator[List[str]]):
        self.fields = fields
        self._reader = reader
    def __iter__(self) -> Iterator[Dict[str,Any]]:
        return self._get_variants()
    def _get_variants(self) -> Iterator[Dict[str,Any]]:
        parsers: List[Callable[[str],Any]] = [parse_utils.reader_for_field[field] for field in self.fields]
        for unparsed_variant in self._reader:
            assert len(unparsed_variant) == len(self.fields), (unparsed_variant, self.fields)
            variant = {field: parser(value) for parser,field,value in zip(parsers, self.fields, unparsed_variant)}
            yield variant
class _vfr_only_per_variant_fields:
    def __init__(self, fields:List[str], reader:Iterator[List[str]]):
        self._all_fields = fields
        self._extractors = [(parse_utils.reader_for_field[field], field, colidx) for colidx,field in enumerate(fields) if field in parse_utils.per_variant_fields]
        self.fields = [e[1] for e in self._extractors]
        self._reader = reader
    def __iter__(self) -> Iterator[Dict[str,Any]]:
        return self._get_variants()
    def _get_variants(self) -> Iterator[Dict[str,Any]]:
        for unparsed_variant in self._reader:
            assert len(unparsed_variant) == len(self._all_fields), (unparsed_variant, self._all_fields)
            variant = {field: parser(unparsed_variant[colidx]) for parser,field,colidx in self._extractors}
            yield variant


@contextmanager
def IndexedVariantFileReader(phenocode:str):
    filepath = get_pheno_filepath('pheno_gz', phenocode)
    with read_gzip(filepath) as f:
        reader:Iterator[List[str]] = csv.reader(f, dialect='pheweb-internal-dialect')
        fields = next(reader)
    if fields[0].startswith('#'): # previous version of PheWeb commented the header line
        fields[0] = fields[0][1:]
    for field in fields:
        assert field in parse_utils.per_variant_fields or field in parse_utils.per_assoc_fields, field
    colidxs = {field: idx for idx, field in enumerate(fields)}
    with pysam.TabixFile(filepath, parser=None) as tabix_file:
        yield _ivfr(tabix_file, colidxs)
class _ivfr:
    def __init__(self, _tabix_file:pysam.TabixFile, _colidxs:Dict[str,int]):
        self._tabix_file=_tabix_file
        self._colidxs=_colidxs

    def _parse_variant_row(self, variant_row:List[str]) -> Dict[str,Any]:
        variant = {}
        for field in self._colidxs:
            val = variant_row[self._colidxs[field]]
            parser = parse_utils.reader_for_field[field]
            try:
                variant[field] = parser(val)
            except Exception as exc:
                raise PheWebError('ERROR: Failed to parse the value {!r} for field {!r} in file {!r}'.format(val, field, self._tabix_file.filename)) from exc
        return variant

    def get_region(self, chrom:str, start:int, end:int) -> Iterator[Dict[str,Any]]:
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
        reader:Iterator[List[str]] = csv.reader(tabix_iter, dialect='pheweb-internal-dialect')
        for variant_row in reader:
            yield self._parse_variant_row(variant_row)

    def get_variant(self, chrom:str, pos:int, ref:str, alt:int) -> Optional[Dict[str,Any]]:
        x = self.get_region(chrom, pos, pos+1)
        for variant in x:
            if variant['pos'] != pos:
                # print('WARNING: while looking for variant {}-{}-{}-{}, saw {!r}'.format(chrom, pos, ref, alt, variant))
                continue
            if variant['ref'] == ref and variant['alt'] == alt and variant:
                return variant
        return None


class MatrixReader:
    def __init__(self):
        self._filepath = get_generated_path('matrix.tsv.gz')

        phenos:List[Dict[str,Any]] = get_phenolist()
        phenocodes:List[str] = [pheno['phenocode'] for pheno in phenos]
        self._info_for_pheno = {
            pheno['phenocode']: {k: v for k,v in pheno.items() if k != 'assoc_files'}
            for pheno in phenos
        }

        with read_gzip(self._filepath) as f:
            reader = csv.reader(f, dialect='pheweb-internal-dialect')
            colnames = next(reader)
        assert colnames[0].startswith('#'), colnames
        colnames[0] = colnames[0][1:]

        self._colidxs:Dict[str,int] = {} # maps field -> column_index
        self._colidxs_for_pheno:Dict[str,Dict[str,int]] = {} # maps phenocode -> field -> column_index
        for colnum, colname in enumerate(colnames):
            if '@' in colname:
                x = colname.split('@')
                assert len(x) == 2, x
                field, phenocode = x
                assert field in parse_utils.fields, field
                assert phenocode in phenocodes, phenocode
                self._colidxs_for_pheno.setdefault(phenocode, {})[field] = colnum
            else:
                field = colname
                assert field in parse_utils.fields, (field)
                self._colidxs[field] = colnum

    def get_phenocodes(self) -> List[str]:
        return list(self._colidxs_for_pheno)

    @contextmanager
    def context(self):
        with pysam.TabixFile(self._filepath, parser=None) as tabix_file:
            yield _mr(tabix_file, self._colidxs, self._colidxs_for_pheno, self._info_for_pheno)
class _mr(_ivfr):
    def __init__(self, _tabix_file:pysam.TabixFile, _colidxs:Dict[str,int], _colidxs_for_pheno:Dict[str,Dict[str,int]], _info_for_pheno:Dict[str,Dict[str,Any]]):
        self._tabix_file=_tabix_file
        self._colidxs=_colidxs
        self._colidxs_for_pheno=_colidxs_for_pheno
        self._info_for_pheno=_info_for_pheno

    def _parse_field(self, variant_row:List[str], field:str, phenocode:Optional[str] = None) -> Any:
        colidx = self._colidxs[field] if phenocode is None else self._colidxs_for_pheno[phenocode][field]
        val = variant_row[colidx]
        parser = parse_utils.reader_for_field[field]
        try:
            return parser(val)  # type: ignore
        except Exception as exc:
            error_message = 'ERROR: Failed to parse the value {!r} for field {!r}'.format(val, field)
            if phenocode is not None: error_message += ' and phenocode {!r}'.format(phenocode)
            raise PheWebError(error_message) from exc

    def _parse_variant_row(self, variant_row:List[str]) -> Dict[str,Any]:
        variant:Dict[str,Any] = {'phenos': {}}
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


def with_chrom_idx(variants:Iterator[Dict[str,Any]]) -> Iterator[Dict[str,Any]]:
    for v in variants:
        v['chrom_idx'] = chrom_order[v['chrom']]
        yield v


@contextmanager
def read_gzip(filepath):  # mypy doesn't like it
    # hopefully faster than `gzip.open(filepath, 'rt')` -- TODO: find out whether it is
    with gzip.GzipFile(filepath, 'rb') as f: # leave in binary mode (default), let TextIOWrapper decode
        with io.BufferedReader(f, buffer_size=2**18) as g: # 256KB buffer
            with io.TextIOWrapper(g) as h: # bytes -> unicode
                yield h

@contextmanager
def read_maybe_gzip(filepath:Union[str,Path]):
    if isinstance(filepath, Path): filepath = str(filepath)
    is_gzip = False
    with open(filepath, 'rb', buffering=0) as raw_f: # no need for buffers
        if raw_f.read(3) == b'\x1f\x8b\x08':
            is_gzip = True
    if is_gzip:
        with read_gzip(filepath) as f:
            yield f
    else:
        with open(filepath, 'rt', buffering=2**18) as f: # 256KB buffer
            yield f



## Writers

@contextmanager
def VariantFileWriter(filepath:str, allow_extra_fields:bool = False, use_gzip:bool = True):
    '''
    Writes variants (represented by dictionaries) to an internal file.

        with VariantFileWriter('a.tsv') as writer:
            writer.write({'chrom': '2', 'pos': 47, ...})

    Each variant/association/hit/loci written must have a subset of the keys of the first one.
    '''
    part_file = get_tmp_path(filepath)
    make_basedir(filepath)
    if use_gzip:
        with AtomicSaver(filepath, text_mode=False, part_file=part_file, overwrite_part=True, rm_part_on_exc=False) as f:
            with gzip.open(f, 'wt', compresslevel=2) as f_gzip:
                yield _vfw(f_gzip, allow_extra_fields, filepath)
    else:
        with AtomicSaver(filepath, text_mode=True, part_file=part_file, overwrite_part=True, rm_part_on_exc=False) as f:
            yield _vfw(f, allow_extra_fields, filepath)
class _vfw:
    def __init__(self, f, allow_extra_fields:bool, filepath:str):
        self._f = f
        self._allow_extra_fields = allow_extra_fields
        self._filepath = filepath
    def write(self, variant:Dict[str,Any]) -> None:
        if not hasattr(self, '_writer'):
            fields:List[str] = []
            for field in parse_utils.fields:
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
    def write_all(self, variants:Iterator[Dict[str,Any]]) -> None:
        for v in variants:
            self.write(v)

def write_heterogenous_variantfile(filepath:str, assocs:List[Dict[str,Any]], use_gzip:bool = True) -> None:
    '''inject all necessary keys into the first association so that the writer will be made correctly'''
    if len(assocs) == 0:
        raise PheWebError("ERROR: tried to write file {!r} but didn't supply any variants")
    assocs[0] = {field:assocs[0].get(field,'') for field in set(itertools.chain.from_iterable(assocs))}
    with VariantFileWriter(filepath, allow_extra_fields=True, use_gzip=use_gzip) as vfw:
        vfw.write_all(assocs)

def convert_VariantFile_to_IndexedVariantFile(vf_path:str, ivf_path:str) -> None:
    make_basedir(ivf_path)
    tmp_path = get_tmp_path(ivf_path)
    tmp_path = '{}/cvt-{}'.format(os.path.dirname(tmp_path), os.path.basename(tmp_path))  # Avoid using the same tmp path as augment-phenos
    pysam.tabix_compress(vf_path, tmp_path, force=True)
    os.rename(tmp_path, ivf_path)

    pysam.tabix_index(
        filename=ivf_path, force=True,
        seq_col=0, start_col=1, end_col=1, # note: `pysam.tabix_index` calls the first column `0`, but cmdline `tabix` calls it `1`.
        line_skip=1, # skip header
    )


def write_json(*, filepath:Optional[str] = None, data=None, indent:Optional[int] = None, sort_keys:bool = False) -> None:
    # Don't allow positional args, because I can never remember the order anyways
    assert filepath is not None and data is not None, filepath
    part_file = get_tmp_path(filepath)
    make_basedir(filepath)
    with AtomicSaver(filepath, text_mode=True, part_file=part_file, overwrite_part=True, rm_part_on_exc=False) as f:
        json.dump(data, f, indent=indent, sort_keys=sort_keys, default=_json_writer_default)
def _json_writer_default(obj:Any) -> Any:
    import numpy as np
    if isinstance(obj, np.float32):
        return float(obj)
    raise TypeError('Object {!r} of type {} is not JSON serializable!'.format(obj, obj.__class__.__name__))
