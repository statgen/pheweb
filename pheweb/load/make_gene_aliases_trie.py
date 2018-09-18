
from ..utils import get_gene_tuples
from ..file_utils import common_filepaths

import os
import re
import requests
import marisa_trie

def get_genenamesorg_ensg_aliases_map(ensgs_to_consider):
    ensgs_to_consider = set(ensgs_to_consider)
    r = requests.get('http://www.genenames.org/cgi-bin/download?col=gd_app_sym&col=gd_prev_sym&col=gd_aliases&col=gd_pub_ensembl_id&status=Approved&status=Entry+Withdrawn&status_opt=2&where=&order_by=gd_app_sym_sort&format=text&limit=&hgnc_dbtag=on&submit=submit')
    r.raise_for_status()
    ensg_to_aliases = {}
    for row in _parse_rows(r.content.decode('utf-8').split('\n')):
        if not row['ensg'] or row['ensg'] not in ensgs_to_consider: continue
        assert re.match(r'^ENSG[R0-9\.]+$', row['ensg']), row
        aliases = [row['approved_symbol']] + row['previous_symbols'] + row['synonyms']
        aliases = [alias for alias in aliases if alias != '']
        aliases = [alias for alias in aliases if re.match(r'^[-\._a-zA-Z0-9]+$', alias)]
        # for alias in aliases: assert re.match(r'^[-\._a-zA-Z0-9]+$', alias), (alias, [ord(c) for c in alias], row)
        ensg_to_aliases[row['ensg']] = aliases
    return ensg_to_aliases
def _parse_rows(lines):
    assert lines[0].split('\t') == ['Approved Symbol','Previous Symbols','Synonyms','Ensembl Gene ID']
    rows = (line.split('\t') for line in lines[1:] if line)
    for row in rows:
        try: yield {'approved_symbol': row[0], 'previous_symbols':row[1].split(', '), 'synonyms': row[2].split(', '), 'ensg': row[3]}
        except Exception: raise Exception(repr(row))

def get_gene_aliases():
    # NOTE: "canonical" refers to the canonical symbol for a gene
    genes = [{'canonical': canonical, 'ensg':ensg} for _,_,_,canonical,ensg in get_gene_tuples(include_ensg=True)]
    assert len({g['ensg'] for g in genes}) == len([g['ensg'] for g in genes])
    assert len({g['canonical'] for g in genes}) == len([g['canonical'] for g in genes])
    for g in genes:
        assert re.match(r'^ENSGR?[0-9]+(?:\.[0-9]+_[0-9]+(?:_PAR_[XY])?)?$', g['ensg']), g
        #assert re.match(r'^[-\._a-zA-Z0-9]+$', g['canonical']), (g['canonical'], [ord(c) for c in g['canonical']], g)
    print('num canonical gene names: {}'.format(len(genes)))

    canonicals_upper = {g['canonical'].upper() for g in genes}
    ensg_to_canonical = {g['ensg']: g['canonical'] for g in genes}
    ensg_to_aliases = get_genenamesorg_ensg_aliases_map(g['ensg'] for g in genes)
    canonical_to_aliases = {ensg_to_canonical[ensg]: ensg_to_aliases.get(ensg, []) for ensg in ensg_to_canonical.keys()}
    for canonical, aliases in canonical_to_aliases.items():
        aliases = [alias for alias in aliases if alias.upper() not in canonicals_upper]
        aliases.append(canonical.upper())
        aliases = list(set(aliases))
        canonical_to_aliases[canonical] = aliases

    alias_to_canonicals = {}
    for canonical, aliases in canonical_to_aliases.items():
        for alias in aliases:
            alias_to_canonicals.setdefault(alias, []).append(canonical)
    alias_to_canonicals = {alias: ','.join(canonicals) for alias,canonicals in alias_to_canonicals.items()}

    return alias_to_canonicals

def run(argv):

    if '-h' in argv or '--help' in argv:
        print('Make a trie of all gene names for easy searching.')
        exit(1)


    if not os.path.exists(common_filepaths['genes']):
        print('Downloading genes')
        from . import download_genes
        download_genes.run([])

    aliases_filepath = common_filepaths['gene-aliases-trie']
    if not os.path.exists(aliases_filepath):
        print('gene aliases will be stored at {!r}'.format(aliases_filepath))
        mapping = get_gene_aliases()
        mapping = [(a, cs.encode('ascii')) for a,cs in mapping.items()]
        aliases_trie = marisa_trie.BytesTrie(mapping)
        aliases_trie.save(aliases_filepath)

    else:
        print('gene aliases are at {!r}'.format(aliases_filepath))
