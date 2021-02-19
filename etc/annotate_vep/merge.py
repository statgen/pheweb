#!/usr/bin/env python3
if __name__ == '__main__': import kpa.dev_utils; kpa.dev_utils.run(__file__)

from pathlib import Path
import gzip, itertools, csv, sys
import more_itertools

# If pheweb isn't installed globally, either use this line or change the #! to point to venv/bin/python3 .
sys.path.append('/data/pheweb/pheweb-installs/pheweb1.3/pheweb/')

import pheweb
from pheweb.file_utils import VariantFileReader, read_maybe_gzip

sites_filepath = Path('generated-by-pheweb/sites/sites.tsv')
vep_filepath = Path('out-raw-vep.tsv')
out_filepath = Path('sites-vep.tsv')

def sites_reader():
    with VariantFileReader(sites_filepath) as vfr:
        variants = more_itertools.peekable(iter(vfr))
        first_variant = variants.peek()
        assert sorted(first_variant.keys()) == sorted(['chrom', 'pos', 'ref', 'alt', 'rsids', 'nearest_genes']), first_variant
        yield from variants

def vep_reader():
    with read_maybe_gzip(vep_filepath) as sites_f:
        reader = csv.DictReader((line.lstrip('#') for line in sites_f if not line.startswith('##')), delimiter='\t')
        first_row = next(reader)
        required_cols = {'Uploaded_variation', 'Consequence'}
        if (missing_cols := required_cols - first_row.keys()):
            raise Exception(f'{missing_cols=} {first_row=}')
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
