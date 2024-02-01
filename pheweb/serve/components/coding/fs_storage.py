# -*- coding: utf-8 -*-
"""
FS storage implementation of coding data storage.

Unit test coverage for fs storage.
"""
from typing import Callable
import threading
import timeit
import json
import tiledb as td
import numpy as np
import pandas as pd
import logging as lg
import gzip
from collections import defaultdict as dd
from pheweb.serve.components.coding.exceptions import NotFoundException
from pheweb.serve.components.coding.variant import Variant
import json
from collections import defaultdict as dd
import logging
logger = logging.getLogger(__name__)
logger.addHandler(logging.NullHandler())
logger.setLevel(logging.DEBUG)
import gzip
import functools
import typing
from dataclasses import dataclass

import pandas as pd
from smart_open import open as smart_open

from pheweb.serve.components.coding.model import CodingDAO # , CodingData


@functools.lru_cache()
def fetch_coding_data(coding_data_path: str):# -> CodingData:
    """
    Fetch coding data.

    :param coding_data_path: coding data path
    :return: coding data
    """
    with smart_open(coding_data_path, "rb") as file:
        data_frame = pd.read_csv(file, encoding="utf8", sep="\t").fillna("NA")
        # replace all . values with NA
        data_frame = data_frame.replace(r"^\.$", "NA", regex=True)
        # find minimun p-value for each variant
        data_frame["is_top"] = 0
        data_frame.loc[
            data_frame.groupby("variant")["pval"].idxmin(axis=0), "is_top"
        ] = 1
        data = CodingData(
            columns=data_frame.columns.tolist(),
            data=data_frame.to_dict(orient="records"),
        )
        return data


@functools.lru_cache()
def read_path(path: str) -> typing.Optional[bytes]:
    """
    Read path.

    Given a path return the bytes
    associated with the path.

    :param path: path to fetch
    :return: bytes or None
    """
    try:
        with smart_open(path, "rb") as file:
            result = file.read()
    except FileNotFoundError:
        result = None
    return result


def normalize_variant(variant: str) -> str:
    """
    Normalize variant.

    Reformat variant replace colons as separators
    to underscore.

    chromosome:position:reference:alternative
    to
    chromosome_position_reference_alternative

    :param variant: string representation of variant
    :return: reformatted variant
    """
    cpra = variant.split(":")
    cpra[0] = "X" if cpra[0] == "23" else cpra[0]
    return "_".join(cpra)


def format_path(plot_root: str, path_format: str) -> Callable[[str],str]:
    """
    Format path.

    Convert representation of variant to
    a path.

    :param plot_root: root path can be url
    :param variant: variant
    :return: path of variant resource
    """
    return lambda variant : path_format.format(plot_root=plot_root, variant=variant)

def fetch_cluster_plot(variant: str, variant_to_path: Callable[[str],str]) -> typing.Optional[bytes]:
    """
    Fetch cluster plot.

    :param plot_root: root (directory) of plots
    :param variant: variant
    :return: plot if there is one
    """
    variant = normalize_variant(variant)
    path = variant_to_path(variant)
    return read_path(path)

@dataclass
class FileCodingDAO(CodingDAO):
    variant_annotation: str
    gwas_tiledb: str
    phenos: str
    top_table: str
    plot_root: str
    verbose: str = False
    path_format: str = "{plot_root}{variant}.raw.png"

    @property
    def variant_to_path(self) -> Callable[[str],str]:
        return format_path(self.plot_root, self.path_format)

    def get_cluster_plot(self, variant: str) -> typing.Optional[bytes]:
        """
        Get cluster plot.

        Given a variant return bytes of the cluster plot.

        :param variant: variant to get plot for
        :return: plot if available None otherwise
        """
        return fetch_cluster_plot(variant, self.variant_to_path)

    """
    File coding data dao.

    A file based coding data dao that returns.

    coding_data: path to coding data
    plot_root: path to root (directory) of plot files
    """

    def _init_anno(self):
        logger.info('loading up variant annotations from %s',
                self.variant_annotation)
        self.gene2region = {}
        self.index2anno = {}
        self.variant2index = {}
        with gzip.open(self.variant_annotation, 'rt') as f:
            h = {h: i for i, h in enumerate(f.readline().strip().split('\t'))}
            for line in f:
                line = line.strip().split('\t')
                gene = line[h['gene_most_severe']]
                index = int(line[h['#index']])
                if gene not in self.gene2region:
                    self.gene2region[gene] = (float('inf'), float('-inf'))
                self.gene2region[gene] = (min(self.gene2region[gene][0], index), max(
                    self.gene2region[gene][1], index))
                self.index2anno[index] = {k: self._format_value(
                    k, line[h[k]]) for k in h}
                self.variant2index[str(Variant(line[h['variant']]))] = index
        logger.info('annotations read for %d variants',
                len(self.variant2index))
        logger.info('gene-to-region mapping read for %d genes',
                len(self.gene2region))

    def _init_tiledb(self):
        self.tiledb = dd(lambda: td.open(self.gwas_tiledb, 'r'))

    def _init_phenos(self):
        self.pheno_list = json.load(open(self.phenos, 'rt'))
        self.pheno_dict = {pheno['code']: pheno for pheno in self.pheno_list}

    def _init_top_results(self):
        logger.info('loading up top results from %s',self.top_table)
        top_list = pd.read_csv(self.top_table, sep='\t')[
            ['pheno',
             'variant',
             'mlogp_add',
             'mlogp_rec',
             'mlogp_chip',
             'beta_add',
             'beta_rec',
             'beta_chip',
             'possible_explaining_signals']
             ].fillna('NA').to_dict(orient='records')
        indices = {}
        for res in top_list:
            indices[self.variant2index[res['variant']]] = True
            for key in res:
                if key == 'pheno':
                    if res[key] not in self.pheno_dict:
                        logger.info(
                            '%s is in top table but not in phenolist, using pheno code as pheno name')
                        res[key] = {'code': res[key], 'name': res[key]}
                    else:
                        res[key] = self.pheno_dict[res[key]]
                elif res[key] == 'NA':
                    res[key] = None
                elif key.startswith('mlogp_') or key.startswith('beta_'):
                    if np.isnan(res[key]):
                        res[key] = None
                    else:
                        res[key] = float(res[key])
        self._set_top_flags(top_list)
        anno = {self.index2anno[i]['variant']: self.index2anno[i] for i in indices}
        self.top_results = {
            'results': top_list,
            'anno': anno
        }
        logger.info('loaded top results for %d variants', len(top_list))

    def __post_init__(self):
        self._init_anno()
        self._init_tiledb()
        self._init_phenos()
        self._init_top_results()

    def _format_value(self, name, value):
        name = name.lower()
        if value is None or value == 'NA':
            return 'NA'
        if name == 'variant':
            return str(Variant(value))
        if name.startswith('time'):
            return round(float(value), 4)
        elif name.startswith('ac') or name.startswith('an') or name.startswith('pos'):
            return int(float(value))
        elif name.startswith('beta') or name.startswith('sebeta'):
            return round(float(value), 3)
        # use 4 instead of 3 decimals for mlogp so that
        # the actual p-value can be shown accurately to 2 significant digits
        elif name.startswith('mlogp') or name.startswith('info'):
            return round(float(value), 4)
        # 7 is fine for AF so can still represent today's GWAS scale data
        # with 2 digits scientific
        elif name.startswith('af'):
            return round(float(value), 7)
        return value
    # mwm1
    def get_variant_range(self, variant: Variant):
        try:
            index = self.variant2index[str(variant)]
            return (index, index)
        except KeyError:
            raise NotFoundException('variant not found')

    def get_gene_range(self, gene: str):
        try:
            return self.gene2region[gene.upper()]
        except KeyError:
            raise NotFoundException('gene not found')

    def _set_top_flags(self, results):
        # figure out top variant for each pheno
        # and top pheno for each variant
        pheno2top = dd(lambda: ('variant', 0))
        var2top = dd(lambda: ('pheno', 0))
        for res in results:
            code = res['pheno']['code']
            variant = res['variant']
            p_add = res['mlogp_add']
            p_chip = res['mlogp_chip']
            if p_add is not None and p_add > pheno2top[code][1]:
                pheno2top[code] = (variant, p_add)
            if p_chip is not None and p_chip > pheno2top[code][1]:
                pheno2top[code] = (variant, p_chip)
            if p_add is not None and p_add > var2top[variant][1]:
                var2top[variant] = (code, p_add)
            if p_chip is not None and p_chip > var2top[variant][1]:
                var2top[variant] = (code, p_chip)
        for res in results:
            if res['variant'] == pheno2top[res['pheno']['code']][0]:
                res['is_top_variant'] = True
            if res['pheno']['code'] == var2top[res['variant']][0]:
                res['is_top_pheno'] = True

    # TODO this is slow
    # should we do the dict-to-list conversion client side or speed it up here
    def get_results(self, index_range: tuple, gene=None):
        start_time = timeit.default_timer()
        results = self.tiledb[threading.get_ident(
        )][index_range[0]:index_range[1]+1]
        time_db = timeit.default_timer() - start_time
        # convert results from {a: [1,2], b: [3,4]} to [{a: 1, b: 3}, {a: 2, b: 4}]
        start_time = timeit.default_timer()

        # read top list for appending possible_explaining_signals to the search results
        top_list = pd.read_csv(self.top_table, sep='\t')[
            ['pheno',
             'variant',
             'possible_explaining_signals']
             ]
        top_list.index = top_list['pheno'] + '_' + top_list['variant']

        results_munged = []
        indices = {}
        for i in range(len(results['variant_index'])):
            res = {}
            keep = True
            for key in results:
                if key == 'pheno':
                    pheno_str = results[key][i].decode("utf-8")
                    if pheno_str in self.pheno_dict:
                        val = self.pheno_dict[pheno_str]
                    else:
                        keep = False
                        break
                # NaN is not valid json, replace with null
                elif np.isnan(results[key][i]):
                    val = None
                else:
                    # some time is saved here not truncating decimals
                    # but more data are sent to the client
                    # val = self._format_value(key, float(results[key][i]))
                    val = float(results[key][i])
                res[key] = val
            if not keep:
                continue
            # save some time here by not creating Variants
            res['variant'] = self.index2anno[res['variant_index']
                                             ]['variant'].replace(':', '-')
            indices[res['variant_index']] = True
            del res['variant_index']

            # add possible_explaining_signals if available
            pheno_var_id = res['pheno']['code'] + '_' + res['variant']
            if pheno_var_id in top_list.index:
                res['possible_explaining_signals'] = top_list.loc[pheno_var_id]['possible_explaining_signals']
            results_munged.append(res)

        time_munge = timeit.default_timer() - start_time
        start_time = timeit.default_timer()
        self._set_top_flags(results_munged)
        anno = {self.index2anno[i]['variant']: self.index2anno[i] for i in indices}
        # if a gene was given, filter to variants whose most severe
        # consequence is for that gene
        if gene is not None:
            anno = {k: v for k, v in anno.items(
            ) if v['gene_most_severe'].upper() == gene.upper()}
            results_munged = [
                res for res in results_munged if res['variant'] in anno]

        time_rest = timeit.default_timer() - start_time
        return {
            'results': results_munged,
            'anno': anno,
            'time': {
                'db': self._format_value('time', time_db),
                'munge': self._format_value('time', time_munge),
                'rest': self._format_value('time', time_rest),
            }
        }
