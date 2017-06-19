
from ..utils import get_gene_tuples
from ..file_utils import common_filepaths

import os
import re
import requests
import csv
import marisa_trie


def run(argv):

    if not os.path.exists(common_filepaths['genes']):
        print('Downloading genes')
        from . import download_genes
        download_genes.run([])

    aliases_filepath = common_filepaths['gene-aliases-trie']
    if not os.path.exists(aliases_filepath):
        print('gene aliases will be stored at {!r}'.format(aliases_filepath))

        aliases_for_ensg = {ensg: (canonical_symbol, []) for _, _, _, canonical_symbol, ensg in get_gene_tuples(include_ensg=True)}
        print('num canonical gene names:', len(aliases_for_ensg))
        canonical_symbols = set(v[0].upper() for v in aliases_for_ensg.values())
        for cs in canonical_symbols: assert cs and all(l.isalnum() or l in '-._' for l in cs), cs

        r = requests.get('http://www.genenames.org/cgi-bin/download?col=gd_app_sym&col=gd_prev_sym&col=gd_aliases&col=gd_pub_ensembl_id&status=Approved&status=Entry+Withdrawn&status_opt=2&where=&order_by=gd_app_sym_sort&format=text&limit=&hgnc_dbtag=on&submit=submit')
        r.raise_for_status()

        for row in csv.DictReader(r.content.decode().split('\n'), delimiter='\t'):
            ensg = row['Ensembl Gene ID']
            if not ensg: continue
            assert re.match(r'^ENSG[R0-9\.]+$', ensg)
            if ensg not in aliases_for_ensg: continue

            aliases = set(aliases_for_ensg[ensg][1])
            aliases.add(row['Approved Symbol'])
            aliases.update(filter(None, row['Previous Symbols'].split(', ')))
            aliases.update(filter(None, row['Synonyms'].split(', ')))
            aliases = set(s.upper() for s in aliases if all(l.isalnum() or l in '-._' for l in s))
            aliases = set(s for s in aliases if s not in canonical_symbols)
            aliases_for_ensg[ensg] = (aliases_for_ensg[ensg][0], aliases)

        # rv maps `alias` -> `canonical_symbol,...`
        mapping = {}
        for ensg, (canonical_symbol, aliases) in aliases_for_ensg.items():
            mapping[canonical_symbol.upper()] = canonical_symbol
            for alias in aliases:
                if alias in mapping:
                    mapping[alias] = '{},{}'.format(mapping[alias], canonical_symbol)
                else:
                    mapping[alias] = canonical_symbol
        for k in mapping:
            assert re.match(r'^[-A-Z0-9\._]+$', k), repr(k)
        mapping = [(a, cs.encode('ascii')) for a,cs in mapping.items()]
        aliases_trie = marisa_trie.BytesTrie(mapping)
        aliases_trie.save(aliases_filepath)

    else:
        print('gene aliases are at {!r}'.format(aliases_filepath))
