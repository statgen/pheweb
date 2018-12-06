
from ..utils import get_gene_tuples
from ..file_utils import common_filepaths

import os, re, json
import urllib.request
import marisa_trie

def get_genenamesorg_ensg_aliases_map(ensgs_to_consider):
    ensgs_to_consider = set(ensgs_to_consider)
    r = urllib.request.urlopen('ftp://ftp.ebi.ac.uk/pub/databases/genenames/new/json/non_alt_loci_set.json')
    ensg_to_aliases = {}
    for row in json.load(r)['response']['docs']:
        try:
            if not row.get('ensembl_gene_id',None) or row['ensembl_gene_id'] not in ensgs_to_consider: continue
            assert re.match(r'^ENSG[R0-9\.]+$', row['ensembl_gene_id']), row
            aliases = [row['symbol']] + row.get('prev_symbol',[]) + row.get('alias_symbol',[])
            aliases = [alias for alias in aliases if alias != '']
            aliases = [alias for alias in aliases if re.match(r'^[-\._a-zA-Z0-9]+$', alias)]
            # for alias in aliases: assert re.match(r'^[-\._a-zA-Z0-9]+$', alias), (alias, [ord(c) for c in alias], row)
            ensg_to_aliases[row['ensembl_gene_id']] = aliases
        except:
            raise PheWebException('Cannot handle genenames row: {}'.format(row))
    return ensg_to_aliases

def get_gene_aliases():
    # NOTE: "canonical" refers to the canonical symbol for a gene
    genes = [{'canonical': canonical, 'ensg':ensg} for _,_,_,canonical,ensg in get_gene_tuples(include_ensg=True)]
    assert len({g['ensg'] for g in genes}) == len(genes)
    assert len({g['canonical'] for g in genes}) == len(genes)
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
