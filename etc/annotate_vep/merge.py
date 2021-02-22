#!/usr/bin/env python3

from pathlib import Path
import gzip, itertools, csv, sys

import pheweb
from pheweb.file_utils import VariantFileReader, read_maybe_gzip


sites_filepath = Path(sys.argv[1])
vep_filepath = Path(sys.argv[2])
out_filepath = Path(sys.argv[3])

def sites_reader():
    with VariantFileReader(sites_filepath) as vfr:
        variants = iter(vfr)
        first_variant = next(variants)
        assert sorted(first_variant.keys()) == sorted(['chrom', 'pos', 'ref', 'alt', 'rsids', 'nearest_genes']), first_variant
        yield from itertools.chain([first_variant], variants)

def vep_reader():
    with read_maybe_gzip(vep_filepath) as sites_f:
        reader = csv.DictReader((line.lstrip('#') for line in sites_f if not line.startswith('##')), delimiter='\t')
        first_row = next(reader)
        required_cols = {'Uploaded_variation', 'Consequence'}
        missing_cols = required_cols - first_row.keys()
        if missing_cols:
            raise Exception(f'missing_cols={missing_cols} first_row={first_row}')
        for row in itertools.chain([first_row], reader):
            chrom, pos, ref, alt = row['Uploaded_variation'].split(':')
            pos = int(pos)
            yield {'chrom':chrom, 'pos':pos, 'ref':ref, 'alt':alt, 'consequence':row['Consequence']}


with gzip.open(out_filepath,'wt') as out_f:
    writer = csv.DictWriter(out_f, 'chrom pos ref alt rsids nearest_genes consequence'.split(), delimiter="\t")
    writer.writeheader()

    for site_v, vep_v in itertools.zip_longest(sites_reader(), vep_reader(), fillvalue={}):
        # sites_filepath and vep_filepath must have a perfect one-to-one match!
        assert all(site_v[k] == vep_v[k] for k in 'chrom pos ref alt'.split()), (site_v, vep_v)
        writer.writerow({**site_v, **vep_v})
