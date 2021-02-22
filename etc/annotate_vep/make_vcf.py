#!/usr/bin/env python3

from pathlib import Path
import gzip, sys

in_filepath = Path(sys.argv[1])
out_filepath = Path(sys.argv[2])

with gzip.open(in_filepath, 'rt') as in_f, gzip.open(out_filepath,'wt') as out_f:
    def write(line:str): out_f.write(line); out_f.write('\n')

    write('##fileformat=VCFv4.1')
    write('##reference=http://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/GRCh38_reference_genome/GRCh38_full_analysis_set_plus_decoy_hla.fa')
    write('\t'.join('#CHROM POS ID REF ALT INFO'.split()))

    header = next(in_f).rstrip('\n')
    assert header.split('\t') == ['chrom', 'pos', 'ref', 'alt', 'rsids', 'nearest_genes']

    for idx,line in enumerate(in_f):
        chrom,pos,ref,alt,rsids,nearest_genes = line.rstrip('\n').split('\t')
        variant_id = f'{chrom}:{pos}:{ref}:{alt}'
        write('\t'.join([chrom, pos, variant_id, ref, alt, f'nearest_genes={nearest_genes}']))
