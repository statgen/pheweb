
from ..file_utils import MatrixReader, IndexedVariantFileReader

import re
import itertools


class _Get_Pheno_Region:
    @staticmethod
    def _rename(d, oldkey, newkey):
        d[newkey] = d[oldkey]
        del d[oldkey]

    @staticmethod
    def _dataframify(list_of_dicts):
        '''converts [{a:1,b:2}, {a:11,b:12}] -> {a:[1,11], b:[2,12]}'''
        keys = set(itertools.chain.from_iterable(list_of_dicts))
        dataframe = {k:[] for k in keys}
        for d in list_of_dicts:
            for k,v in d.items():
                dataframe[k].append(v)
        return dataframe

    @staticmethod
    def get_pheno_region(phenocode, chrom, pos_start, pos_end, p_threshold=1.1):
        variants = []
        with IndexedVariantFileReader(phenocode) as reader:
            for v in reader.get_region(chrom, pos_start, pos_end+1):
                v['id'] = '{chrom}:{pos}_{ref}/{alt}'.format(**v)
                # TODO: change JS to make these unnecessary
                v['end'] = v['pos']
                _Get_Pheno_Region._rename(v, 'chrom', 'chr')
                _Get_Pheno_Region._rename(v, 'pos', 'position')
                _Get_Pheno_Region._rename(v, 'rsids', 'rsid')
                _Get_Pheno_Region._rename(v, 'pval', 'pvalue')
                if 'af_alt' in v:
                    _Get_Pheno_Region._rename(v, 'af_alt', 'maf')
                if 'af_alt_cases' in v:
                    _Get_Pheno_Region._rename(v, 'af_alt_cases', 'maf_cases')
                if 'af_alt_controls' in v:
                    _Get_Pheno_Region._rename(v, 'af_alt_controls', 'maf_controls')
                if v['pvalue'] < p_threshold:
                    variants.append(v)

        df = _Get_Pheno_Region._dataframify(variants)

        return {
            'data': df,
            'lastpage': None,
        }
get_pheno_region = _Get_Pheno_Region.get_pheno_region


__CHROMOSOME_REGEX = re.compile(r'(?:[cC][hH][rR])?([0-9XYMT]+)')
__CHROMOSOME_POS_REGEX = re.compile(__CHROMOSOME_REGEX.pattern + r'[-_:/ ]([0-9]+)')
__CHROMOSOME_POS_REF_ALT_REGEX = re.compile(__CHROMOSOME_POS_REGEX.pattern + r'[-_:/ ]([-AaTtCcGg\.]+)[-_:/ ]([-AaTtCcGg\.]+)')


def parse_variant(query, default_chrom_pos=True):
    match = __CHROMOSOME_POS_REF_ALT_REGEX.match(query) or __CHROMOSOME_POS_REGEX.match(query) or __CHROMOSOME_REGEX.match(
        query)
    g = match.groups() if match else ()

    if default_chrom_pos:
        if len(g) == 0: g += ('1',)
        if len(g) == 1: g += (0,)
    if len(g) >= 2: g = (g[0], int(g[1])) + tuple([bases.upper() for bases in g[2:]])
    return g + tuple(itertools.repeat(None, 4 - len(g)))
