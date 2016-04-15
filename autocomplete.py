from __future__ import print_function, division, absolute_import

import itertools
import re
import marisa_trie

from utils import parse_variant

def get_autocompletion(query, phenos):
    return get_variant_autocompletion(query) or \
        get_phewas_code_autocompletion(query, phenos) or \
        get_phewas_string_autocompletion(query, phenos)


sites_trie = marisa_trie.Trie().load('/var/pheweb_data/sites_trie.marisa')

def get_variant_autocompletion(query):
    # chrom-pos-ref-alt format
    chrom, pos, ref, alt = parse_variant(query, default_chrom_pos = False)
    if chrom is not None:
        key = '-'.join(str(e) for e in [chrom,pos,ref,alt] if e is not None)
        key = key.decode('ascii')
        suggestions = list(itertools.islice(sites_trie.iterkeys(key), 0, 10))
        suggestions = [s.replace('-', ':', 1) for s in suggestions]
        suggestions = [{
            "value": sugg,
            "display": sugg,
            "url": "/variant/{}".format(sugg)
        } for sugg in suggestions]
        if suggestions:
            return suggestions

def get_phewas_code_autocompletion(query, phenos):
    # Try phewas_code
    if re.match('^\s*[0-9]', query):
        suggestions = []
        for phewas_code, pheno in phenos.iteritems():
            if phewas_code.startswith(query):
                suggestions.append({
                    "value": phewas_code,
                    "display": "{} ({})".format(phewas_code, pheno['phewas_string']), # TODO: truncate phewas_string intelligently
                    "url": "/pheno/{}".format(phewas_code),
                })
                if len(suggestions) == 10: break
        if suggestions:
            return suggestions

def get_phewas_string_autocompletion(query, phenos):
    # Try phewas_string
    if re.match('^\s*[a-zA-Z]', query):
        suggestions = []
        for phewas_code, pheno in phenos.iteritems():
            if query.title() in pheno['phewas_string'].title():
                suggestions.append({
                    "value": phewas_code,
                    "display": "{} ({})".format(pheno['phewas_string'], phewas_code),
                    "url": "/pheno/{}".format(phewas_code),
                })
                if len(suggestions) == 10: break
        if suggestions:
            return suggestions

def get_best_completion(query, phenos):
    # TODO: get_autocompletion only returns the first 10, so this will be a little broken.  Look at more.
    suggestions = get_autocompletion(query, phenos)
    if suggestions:
        for suggestion in suggestions:
            suggestion['match_quality'] = len(set(query.lower().split()).intersection(suggestion['display'].lower().split())) / len(suggestion['display'].split())
        return max(suggestions, key=lambda sugg: sugg['match_quality'])
