from __future__ import print_function, division, absolute_import

import itertools
import re
import marisa_trie

from utils import parse_variant

def get_autocompletion(query, phenos):
    query = query.strip()
    return \
        list(itertools.islice(get_variant_autocompletion(query), 0, 10)) or \
        list(itertools.islice(get_rsid_autocompletion(query), 0, 10)) or \
        list(itertools.islice(get_phewas_code_autocompletion(query, phenos), 0, 10)) or \
        list(itertools.islice(get_phewas_string_autocompletion(query, phenos), 0, 10))


sites_rsids_trie = marisa_trie.BytesTrie().load('/var/pheweb_data/sites_rsids_trie.marisa')
rsids_sites_trie = marisa_trie.BytesTrie().load('/var/pheweb_data/rsids_sites_trie.marisa')

def get_variant_autocompletion(query):
    # chrom-pos-ref-alt format
    chrom, pos, ref, alt = parse_variant(query, default_chrom_pos = False)
    if chrom is not None:
        key = '-'.join(str(e) for e in [chrom,pos,ref,alt] if e is not None)
        key = key.decode('ascii')
        for chrom_pos_ref_alt, rsids in sites_rsids_trie.iteritems(key):
            chrom_pos_ref_alt = chrom_pos_ref_alt.replace('-', ':', 1)
            yield {
                "value": chrom_pos_ref_alt,
                "display": '{} ({})'.format(chrom_pos_ref_alt, rsids) if rsids else chrom_pos_ref_alt,
                "url": "/variant/{}".format(chrom_pos_ref_alt)
            }

def get_rsid_autocompletion(query):
    if query.startswith('rs'):
        key = query.decode('ascii')
        for rsid, chrom_pos_ref_alt in rsids_sites_trie.iteritems(key):
            chrom_pos_ref_alt = chrom_pos_ref_alt.replace('-', ':', 1)
            yield {
                "value": chrom_pos_ref_alt,
                "display": '{} ({})'.format(rsid, chrom_pos_ref_alt),
                "url": "/variant/{}".format(chrom_pos_ref_alt)
            }

def get_phewas_code_autocompletion(query, phenos):
    # Try phewas_code
    if re.match('^\s*[0-9]', query):
        for phewas_code, pheno in phenos.iteritems():
            if phewas_code.startswith(query):
                yield {
                    "value": phewas_code,
                    "display": "{} ({})".format(phewas_code, pheno['phewas_string']), # TODO: truncate phewas_string intelligently
                    "url": "/pheno/{}".format(phewas_code),
                }

def get_phewas_string_autocompletion(query, phenos):
    # Try phewas_string
    if re.match('^\s*[a-zA-Z]', query):
        for phewas_code, pheno in phenos.iteritems():
            if query.title() in pheno['phewas_string'].title():
                yield {
                    "value": phewas_code,
                    "display": "{} ({})".format(pheno['phewas_string'], phewas_code),
                    "url": "/pheno/{}".format(phewas_code),
                }

# TODO: icd9

def get_best_completion(query, phenos):
    # TODO: get_autocompletion only returns the first 10, so this will be a little broken.  Look at more.
    suggestions = get_autocompletion(query, phenos)
    if suggestions:
        for suggestion in suggestions:
            suggestion['match_quality'] = len(set(query.lower().split()).intersection(suggestion['display'].lower().split())) / len(suggestion['display'].split())
        return max(suggestions, key=lambda sugg: sugg['match_quality'])
