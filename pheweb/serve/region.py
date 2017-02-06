

from .. import utils
conf = utils.conf

import pysam
import os

# TODO: also get beta, sebeta, etc
def get_rows(phenocode, chrom, pos_start, pos_end):
    infile = os.path.join(conf.data_dir, 'augmented_pheno_gz', '{}.gz'.format(phenocode))
    tabix_file = pysam.TabixFile(infile)
    tabix_iter = tabix_file.fetch(chrom, pos_start-1, pos_end+1, parser = pysam.asTuple())

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
