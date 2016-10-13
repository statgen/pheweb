from __future__ import print_function, division, absolute_import

# Load config, utils, venv
import os.path
import imp
my_dir = os.path.dirname(os.path.abspath(__file__))
utils = imp.load_source('utils', os.path.join(my_dir, 'utils.py'))
conf = utils.conf

import json
import pysam

# TODO: also get beta, sebeta, etc
def get_rows(phenocode, chrom, pos_start, pos_end):
    infile = '{}/augmented_pheno_gz/{}.gz'.format(conf.data_dir, phenocode).encode('utf-8')
    tabix_file = pysam.TabixFile(infile)
    tabix_iter = tabix_file.fetch(chrom.encode('utf-8'), pos_start-1, pos_end+1, parser = pysam.asTuple())

    rv = {
        'data': {
            'id': [], # chr:pos_ref/alt
            'chr': [],
            'position': [],
            'ref': [],
            'alt': [],
            'rsid': [],
            'maf': [],
            'pvalue': [],
        },
        'lastpage': None,
    }

    for v in tabix_iter:
        try:
            pval = float(v[7])
        except ValueError:
            continue

        chrom, pos = v[0], int(v[1])
        rv['data']['chr'].append(chrom)
        rv['data']['position'].append(pos)
        rv['data']['ref'].append(v[2])
        rv['data']['alt'].append(v[3])
        rv['data']['id'].append('{}:{}_{}/{}'.format(chrom, pos, v[2], v[3]))
        rv['data']['rsid'].append(v[4])
        rv['data']['pvalue'].append(pval)

        maf = utils.round_sig(float(v[6]), 3)
        assert 0 < maf <= 0.5
        rv['data']['maf'].append(maf)

    rv['data']['end'] = rv['data']['position']
    return rv
