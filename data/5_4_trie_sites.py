#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

import os.path

activate_this = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../venv/bin/activate_this.py')
execfile(activate_this, dict(__file__=activate_this))

import marisa_trie
import gzip

data_dir = '/var/pheweb_data/'

def parse_line(line):
    chrom, pos, ref, alt, rsid = line.rstrip('\n').split('\t')
    # Keys in marisa_trie must be unicode. Values in BytesTrie must be bytes.
    return (u'{}-{}-{}-{}'.format(chrom, pos, ref, alt), rsid)

with gzip.open(data_dir + '/phewas_maf_gte_1e-2_ncases_gte_20_sites_rsids.vcf.gz') as f:
    lines = [parse_line(line) for line in f]
print('done loading.')

sites_rsids_trie = marisa_trie.BytesTrie(lines, order=marisa_trie.LABEL_ORDER)
out_filename = data_dir + '/sites_rsids_trie.marisa'
sites_rsids_trie.save(out_filename)
print('done with chrom-pos-ref-alt -> rsid trie at ' + out_filename)

# for chrom_pos_ref_alt, rsids in lines:
#     if ',' in rsids:
#         print(rsids)

reversed_lines = ((rsid.decode('ascii'), chrom_pos_ref_alt.encode('ascii')) for (chrom_pos_ref_alt, rsids) in lines for rsid in rsids.split(','))
rsids_sites_trie = marisa_trie.BytesTrie(reversed_lines, order=marisa_trie.LABEL_ORDER)
out_filename = data_dir + '/rsids_sites_trie.marisa'
rsids_sites_trie.save(out_filename)
print('done with rsid -> chrom-pos-ref-alt trie at ' + out_filename)
