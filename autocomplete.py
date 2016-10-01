from __future__ import print_function, division, absolute_import

# Load config
import os.path
import imp
my_dir = os.path.dirname(os.path.abspath(__file__))
conf = imp.load_source('conf', os.path.join(my_dir, 'config.config'))

import itertools
import re
import marisa_trie
import copy

from utils import parse_variant

# TODO: sort suggestions better.
# - It's good that hitting enter sends you to the thing with the highest token-ratio.
# - But it's not good that that's not the first thing in the autocomplete suggestions.
# - Solution:
#     - for rsid and variant, the list should be sorted first by length.
#     - for stringy things, the list should be sorted by token-match-ratio.  That's gonna suck to implement in javascript.
#         - Could we send token-sort-ratio along and tell typeaheadjs to sort on it? No, b/c the query changes.
#         - but, stringy things should just be in a streamtable anyways.

class Autocompleter(object):
    def __init__(self, phenos):
        self._phenos = copy.deepcopy(phenos)
        self._preprocess_phenos()

        self._cpra_to_rsids_trie = marisa_trie.BytesTrie().load(conf.data_dir + '/sites/cpra_to_rsids_trie.marisa')
        self._rsid_to_cpra_trie = marisa_trie.BytesTrie().load(conf.data_dir + '/sites/rsid_to_cpra_trie.marisa')

        self._autocompleters = [
            self._autocomplete_variant,
            self._autocomplete_rsid,
            self._autocomplete_phewas_code,
        ]
        if any('phewas_string' in pheno for pheno in self._phenos.itervalues()):
            self._autocompleters.append(self._autocomplete_phewas_string)
        if any('icd9s' in pheno for pheno in self._phenos.itervalues()):
            self._autocompleters.extend([
                self._autocomplete_icd9_code,
                self._autocomplete_icd9_string,
            ])

    def autocomplete(self, query):
        query = query.strip()
        result = []
        for autocompleter in self._autocompleters:
            result = list(itertools.islice(autocompleter(query), 0, 10))
            if result: break
        return result

    def get_best_completion(self, query):
        # TODO: get_autocompletion only returns the first 10, so this will be a little broken.  Look at more.
        suggestions = self.autocomplete(query)
        if not suggestions:
            return None
        query_tokens = query.strip().lower().split()
        for suggestion in suggestions:
            suggestion_tokens = suggestion['display'].lower().split()
            intersection_tokens = set(query_tokens).intersection(suggestion_tokens)
            suggestion['match_quality'] = len(intersection_tokens) / len(suggestion_tokens)
        return max(suggestions, key=lambda sugg: sugg['match_quality'])


    _process_string_non_word_regex = re.compile(r"(?ui)[^\w\.]") # Most of the time we want to include periods in words
    @classmethod
    def _process_string(cls, string):
        # Cleaning inspired by <https://github.com/seatgeek/fuzzywuzzy/blob/6353e2/fuzzywuzzy/utils.py#L69>
        return ' ' + cls._process_string_non_word_regex.sub(' ', string).lower().strip()

    def _preprocess_phenos(self):
        for phewas_code, pheno in self._phenos.iteritems():
            pheno['--spaced--phewas_code'] = self._process_string(phewas_code)
            if 'phewas_string' in pheno:
                pheno['--spaced--phewas_string'] = self._process_string(pheno['phewas_string'])
            if 'icd9s' in pheno:
                for icd9 in pheno['icd9s']:
                    icd9['--spaced--icd9_string'] = self._process_string(icd9['icd9_string'])


    def _autocomplete_variant(self, query):
        # chrom-pos-ref-alt format
        query = query.replace(',', '')
        chrom, pos, ref, alt = parse_variant(query, default_chrom_pos = False)
        if chrom is not None:
            key = '-'.join(str(e) for e in [chrom,pos,ref,alt] if e is not None)
            key = key.decode('ascii')
            for cpra, rsids in self._cpra_to_rsids_trie.iteritems(key):
                cpra = cpra.replace('-', ':', 1)
                yield {
                    "value": cpra,
                    "display": '{} ({})'.format(cpra, rsids) if rsids else cpra,
                    "url": "/variant/{}".format(cpra)
                }

    def _autocomplete_rsid(self, query):
        query = query.lower()
        if query.startswith('rs'):
            key = query.decode('ascii')

            # In Trie.iteritems, "rs100" comes before "rs1".
            # So, rsid_to_cpra_trie.iteritems("rs7412")[-1] is "rs7412".
            # That's unfortunate, and I don't know how to fix it.
            # I wish we could get a real lexicographic order, where shorter strings come first, but I don't see how.
            # Even better would be to the 10 shortest children of the current string.
            # Here's an attempt at being a little better.

            rsids_to_check = [key] + [u"{}{}".format(key, i) for i in range(10)]
            for rsid in rsids_to_check:
                cpra = self._rsid_to_cpra_trie.get(rsid)
                if cpra is not None:
                    cpra = cpra[0]
                    cpra = cpra.replace('-', ':', 1)
                    yield {
                        "value": cpra,
                        "display": '{} ({})'.format(rsid, cpra),
                        "url": "/variant/{}".format(cpra)
                    }

            for rsid, cpra in self._rsid_to_cpra_trie.iteritems(key):
                cpra = cpra.replace('-', ':', 1)
                yield {
                    "value": cpra,
                    "display": '{} ({})'.format(rsid, cpra),
                    "url": "/variant/{}".format(cpra)
                }

    def _autocomplete_phewas_code(self, query):
        query = self._process_string(query)
        for phewas_code, pheno in self._phenos.iteritems():
            if query in pheno['--spaced--phewas_code']:
                yield {
                    "value": phewas_code,
                    "display": "{} ({})".format(phewas_code, pheno['phewas_string']) if 'phewas_string' in pheno else phewas_code, # TODO: truncate phewas_string intelligently
                    "url": "/pheno/{}".format(phewas_code),
                }

    def _autocomplete_phewas_string(self, query):
        query = self._process_string(query)
        for phewas_code, pheno in self._phenos.iteritems():
            if query in pheno['--spaced--phewas_string']:
                yield {
                    "value": phewas_code,
                    "display": "{} ({})".format(pheno['phewas_string'], phewas_code),
                    "url": "/pheno/{}".format(phewas_code),
                }

    _regex_get_icd9_code_autocompletion = re.compile('^\s*[0-9]')
    def _autocomplete_icd9_code(self, query):
        if self._regex_get_icd9_code_autocompletion.match(query):
            for phewas_code, pheno in self._phenos.iteritems():
                for icd9 in pheno['icd9s']:
                    if icd9['icd9_code'].startswith(query):
                        yield {
                            "value": phewas_code,
                            "display": "{} (icd9 code; phewas code: {}; icd9_string: {})".format(icd9['icd9_code'], phewas_code, icd9['icd9_string']),
                            "url": "/pheno/{}".format(phewas_code),
                        }

    _regex_get_icd9_string_autocompletion = re.compile('^\s*[a-zA-Z]')
    def _autocomplete_icd9_string(self, query):
        query = self._process_string(query)
        if self._regex_get_icd9_string_autocompletion.match(query):
            for phewas_code, pheno in self._phenos.iteritems():
                for icd9 in pheno.get('icd9s', []):
                    if query in icd9['--spaced--icd9_string']:
                        yield {
                            "value": phewas_code,
                            "display": "{} (icd9 string; icd9 code: {}; phewas code: {})".format(icd9['icd9_string'], icd9['icd9_code'], phewas_code),
                            "url": "/pheno/{}".format(phewas_code),
                        }
