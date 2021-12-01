import math

from flask import url_for, Response, redirect

from ..file_utils import MatrixReader, IndexedVariantFileReader, get_filepath

import random
import re
import itertools
import json
from typing import Optional,Dict,List,Any


class _Get_Pheno_Region:
    @staticmethod
    def _rename(d:dict, oldkey, newkey):
        d[newkey] = d[oldkey]
        del d[oldkey]

    @staticmethod
    def _dataframify(list_of_dicts:List[Dict[Any,Any]]) -> Dict[Any,list]:
        '''converts [{a:1,b:2}, {a:11,b:12}] -> {a:[1,11], b:[2,12]}'''
        keys = set(itertools.chain.from_iterable(list_of_dicts))
        dataframe: Dict[Any,list] = {k:[] for k in keys}
        for d in list_of_dicts:
            for k,v in d.items():
                dataframe[k].append(v)
        return dataframe

    @staticmethod
    def get_pheno_region(phenocode:str, chrom:str, pos_start:int, pos_end:int) -> dict:
        variants = []
        with IndexedVariantFileReader(phenocode) as reader:
            for v in reader.get_region(chrom, pos_start, pos_end+1):
                v['id'] = '{chrom}:{pos}_{ref}/{alt}'.format(**v)
                # TODO: change JS to make these unnecessary
                v['end'] = v['pos']
                _Get_Pheno_Region._rename(v, 'chrom', 'chr')
                _Get_Pheno_Region._rename(v, 'pos', 'position')
                _Get_Pheno_Region._rename(v, 'rsids', 'rsid')
                # TODO: Old PheWeb sends "pvalue", but new LocusZoom is trying to encourage use of log_pvalue (more resistant to underflow for really significant hits)
                #  We will send both fields for now, but should consolidate this in future.
                _Get_Pheno_Region._rename(v, 'pval', 'pvalue')
                v['log_pvalue'] = -math.log10(v['pvalue'])
                variants.append(v)

        df = _Get_Pheno_Region._dataframify(variants)

        return {
            'data': df,
            'lastpage': None,
        }
get_pheno_region = _Get_Pheno_Region.get_pheno_region


class _ParseVariant:
    chrom_regex = re.compile(r'(?:[cC][hH][rR])?([0-9XYMT]+)')
    chrom_pos_regex = re.compile(chrom_regex.pattern + r'[-_:/ ]([0-9]+)')
    chrom_pos_ref_alt_regex = re.compile(chrom_pos_regex.pattern + r'[-_:/ ]([-AaTtCcGg\.]+)[-_:/ ]([-AaTtCcGg\.]+)')
    def parse_variant(self, query, default_chrom_pos=True):
        match = self.chrom_pos_ref_alt_regex.match(query) or self.chrom_pos_regex.match(query) or self.chrom_regex.match(query)
        g = match.groups() if match else ()

        if default_chrom_pos:
            if len(g) == 0: g += ('1',)
            if len(g) == 1: g += (0,)
        if len(g) >= 2: g = (g[0], int(g[1])) + tuple([bases.upper() for bases in g[2:]])
        return g + tuple(itertools.repeat(None, 4-len(g)))
parse_variant = _ParseVariant().parse_variant

class _GetVariant:
    def get_variant(self, query:str) -> Optional[Dict[str,Any]]:
        chrom, pos, ref, alt = parse_variant(query)
        assert None not in [chrom, pos, ref, alt]
        if not hasattr(self, '_matrix_reader'):
            self._matrix_reader = MatrixReader()
        with self._matrix_reader.context() as mr:
            v = mr.get_variant(chrom, pos, ref, alt)
        if v is None: return None
        v['phenos'] = list(v['phenos'].values())
        v['variant_name'] = '{} : {:,} {} / {}'.format(chrom, pos, ref, alt)
        return v
get_variant = _GetVariant().get_variant




def get_random_page() -> Optional[str]:
    with open(get_filepath('top-hits-1k')) as f:
        hits = json.load(f)
    if not hits:
        return None
    hits_to_choose_from = [hit for hit in hits if hit['pval'] < 5e-8]
    if len(hits_to_choose_from) < 10:
        hits_to_choose_from = hits[:10]
    hit = random.choice(hits_to_choose_from)
    r = random.random()
    if r < 0.4:
        return url_for('.pheno_page', phenocode=hit['phenocode'])
    elif r < 0.8:
        return url_for('.variant_page', query='{chrom}-{pos}-{ref}-{alt}'.format(**hit))
    else:
        offset = int(50e3)
        return url_for('.region_page',
                       phenocode=hit['phenocode'],
                       region='{}:{}-{}'.format(hit['chrom'], hit['pos']-offset, hit['pos']+offset))
    # TODO: check if this hit is inside a gene. if so, include that page.

def relative_redirect(url:str) -> Response:
    # `flask.redirect(url)` turns relative URLs into absolute.
    # But modern browsers allow relative location header.
    # And I want relative to avoid thinking about http/https and hostname.
    # Only a few places in pheweb need absolute URLs (eg, auth), and everywhere else can just use relative.
    return redirect(url, Response=RelativeResponse)
class RelativeResponse(Response):
    autocorrect_location_header = False
