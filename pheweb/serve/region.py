

from ..file_utils import IndexedVariantFileReader

import itertools

def _rename(d, oldkey, newkey):
    d[newkey] = d[oldkey]
    del d[oldkey]

def _dataframify(list_of_dicts):
    '''converts [{a:1,b:2}, {a:11,b:12}] -> {a:[1,11], b:[2,12]}'''
    keys = set(itertools.chain.from_iterable(list_of_dicts))
    dataframe = {k:[] for k in keys}
    for d in list_of_dicts:
        for k,v in d.items():
            dataframe[k].append(v)
    return dataframe

# TODO: move this into server.api_region
def get_rows(phenocode, chrom, pos_start, pos_end):

    variants = []
    with IndexedVariantFileReader(phenocode) as reader:
        for v in reader.get_region(chrom, pos_start, pos_end+1):
            v['id'] = '{chrom}:{pos}_{ref}/{alt}'.format(**v)
            v['end'] = v['pos']
            _rename(v, 'chrom', 'chr')
            _rename(v, 'pos', 'position')
            _rename(v, 'rsids', 'rsid')
            _rename(v, 'pval', 'pvalue') # TODO: change JS to make these unnecessary
            variants.append(v)

    df = _dataframify(variants)

    return {
        'data': df,
        'lastpage': None,
    }
