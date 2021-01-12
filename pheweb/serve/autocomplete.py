
from ..file_utils import common_filepaths
from .server_utils import parse_variant

from flask import url_for

import itertools
import re
import copy
import sqlite3

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

        self._cpras_rsids_sqlite3 = sqlite3.connect(common_filepaths['cpras-rsids-sqlite3']())
        self._cpras_rsids_sqlite3.row_factory = sqlite3.Row
        self._gene_aliases_sqlite3 = sqlite3.connect(common_filepaths['gene-aliases-sqlite3']())
        self._gene_aliases_sqlite3.row_factory = sqlite3.Row

        self._autocompleters = [
            self._autocomplete_variant,
            self._autocomplete_rsid,
            self._autocomplete_phenocode,
            self._autocomplete_gene,
        ]
        if any('phenostring' in pheno for pheno in self._phenos.values()):
            self._autocompleters.append(self._autocomplete_phenostring)

    def autocomplete(self, query):
        query = query.strip()
        result = []
        for autocompleter in self._autocompleters:
            result = list(itertools.islice(autocompleter(query), 0, 10))
            if result: break
        return result

    def get_best_completion(self, query):
        # TODO: self.autocomplete() only returns the first 10 for each autocompleter.  Look at more?
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
        for phenocode, pheno in self._phenos.items():
            pheno['--spaced--phenocode'] = self._process_string(phenocode)
            if 'phenostring' in pheno:
                pheno['--spaced--phenostring'] = self._process_string(pheno['phenostring'])


    def _autocomplete_variant(self, query):
        # chrom-pos-ref-alt format
        query = query.replace(',', '')
        chrom, pos, ref, alt = parse_variant(query, default_chrom_pos = False)
        if chrom is not None:
            key = '-'.join(str(e) for e in [chrom,pos,ref,alt] if e is not None)

            # In Python's sort, chr1:23-A-T comes before chr1:23-A-TG, so this should always put exact matches first.
            cpra_rsid_pairs = list(self._cpras_rsids_sqlite3.execute(
                'SELECT cpra,rsid FROM cpras_rsids WHERE cpra LIKE ? ORDER BY ROWID LIMIT 100',  # Input was sorted by cpra, so ROWID will sort by cpra
                (key+'%',)
            ))
            if cpra_rsid_pairs:
                for cpra, rows in itertools.groupby(cpra_rsid_pairs, key=lambda row:row['cpra']):
                    rowlist = list(rows)
                    cpra_display = cpra.replace('-', ':', 1)
                    if len(rowlist) == 1 and rowlist[0]['rsid'] is None:
                        display = cpra_display
                    else:
                        display = '{} ({})'.format(cpra_display, ','.join(row['rsid'] for row in rowlist))
                    yield {
                        "value": cpra_display,
                        "display": display,
                        "url": url_for('.variant_page', query=cpra_display),
                    }

    def _autocomplete_rsid(self, query):
        query = query.lower()
        if query.startswith('rs'):
            key = query

            rsid_cpra_pairs = list(self._cpras_rsids_sqlite3.execute(
                'SELECT cpra,rsid FROM cpras_rsids WHERE rsid LIKE ? ORDER BY LENGTH(rsid),rsid LIMIT 100',
                (key+'%',)
            ))
            for row in rsid_cpra_pairs:
                rsid, cpra = row['rsid'], row['cpra']
                cpra_display = cpra.replace('-', ':', 1)
                yield {
                    "value": cpra_display,
                    "display": '{} ({})'.format(rsid, cpra_display),
                    'url': url_for('.variant_page', query=cpra_display),
                }

    def _autocomplete_phenocode(self, query):
        query = self._process_string(query)
        for phenocode, pheno in self._phenos.items():
            if query in pheno['--spaced--phenocode']:
                yield {
                    "value": phenocode,
                    "display": "{} ({})".format(phenocode, pheno['phenostring']) if 'phenostring' in pheno else phenocode, # TODO: truncate phenostring intelligently
                    "url": url_for('.pheno_page', phenocode=phenocode),
                }

    def _autocomplete_phenostring(self, query):
        query = self._process_string(query)
        for phenocode, pheno in self._phenos.items():
            if query in pheno['--spaced--phenostring']:
                yield {
                    "value": phenocode,
                    "display": "{} ({})".format(pheno['phenostring'], phenocode),
                    "url": url_for('.pheno_page', phenocode=phenocode),
                }

    def _autocomplete_gene(self, query):
        key = query.upper()
        if len(key) >= 2:

            alias_canonicals_pairs = list(self._gene_aliases_sqlite3.execute(
                'SELECT alias,canonicals_comma FROM gene_aliases WHERE alias LIKE ? ORDER BY LENGTH(alias),alias LIMIT 10',
                (key+'%',)
            ))
            for row in alias_canonicals_pairs:
                alias, canonical_symbols = row['alias'], row['canonicals_comma'].split(',')
                if len(canonical_symbols) > 1:
                    yield {
                        'value': canonical_symbols[0],
                        'display': '{} (alias for {})'.format(alias, ' and '.join(canonical_symbols)),
                        'url': url_for('.gene_page', genename=canonical_symbols[0]),
                    }
                elif canonical_symbols[0] == alias:
                    yield {
                        "value": canonical_symbols[0],
                        "display": canonical_symbols[0],
                        "url": url_for('.gene_page', genename=canonical_symbols[0]),
                    }
                else:
                    yield {
                        "value": canonical_symbols[0],
                        "display": '{} (alias for {})'.format(alias, canonical_symbols[0]),
                        "url": url_for('.gene_page', genename=canonical_symbols[0]),
                    }
