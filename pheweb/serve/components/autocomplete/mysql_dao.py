from ....file_utils import get_filepath
from ...server_utils import parse_variant
from .dao import AutocompleterDAO, QUERY_LIMIT
from flask import url_for
from pathlib import Path
import urllib.parse
import itertools
import re
import copy
import sqlite3
from typing import List,Dict,Any,Optional,Iterator
from pheweb.serve.data_access.db_util import MysqlDAO
from contextlib import closing
import pymysql

import logging
logger = logging.getLogger(__name__)
logger.addHandler(logging.NullHandler())
logger.setLevel(logging.DEBUG)

class AutocompleterMYSQLDAO(AutocompleterDAO, MysqlDAO):
    def __init__(self,
                 phenos,
                 authentication_file : str,
                 limit : int = QUERY_LIMIT):
        logger.info(f"autocomplete:'AutocompleterMYSQLDAO'")
        super(AutocompleterDAO, self).__init__(authentication_file)
        self._limit = limit
        self._phenos = copy.deepcopy(phenos())
        self._preprocess_phenos()

        self._autocompleters = [
            self._autocomplete_rsid,  # Check rsid first, because it only runs if query.startswith('rs')
            self._autocomplete_variant,  # Check variant next, because it only runs if query starts with a chrom alias.
            self._autocomplete_phenocode,
            self._autocomplete_gene,
        ]
        if any('phenostring' in pheno for pheno in self._phenos.values()):
            self._autocompleters.append(self._autocomplete_phenostring)

    def autocomplete(self, query:str) -> List[Dict[str,str]]:
        query = query.strip()
        result = []
        for autocompleter in self._autocompleters:
            result = list(itertools.islice(autocompleter(query), 0, self._limit))
            if result: break
        return result

    def get_best_completion(self, query:str) -> Optional[Dict[str,str]]:
        # TODO: self.autocomplete() only returns the first 10 for each autocompleter.  Look at more?
        suggestions = self.autocomplete(query)
        if not suggestions:
            return None
        query_tokens = query.strip().lower().split()
        return max(suggestions, key=lambda sugg: self._get_suggestion_quality(query_tokens, sugg['display']))
    
    def _get_suggestion_quality(self, query_tokens:List[str], display:str) -> float:
        suggestion_tokens = display.lower().split()
        intersection_tokens = set(query_tokens).intersection(suggestion_tokens)
        return len(intersection_tokens) / len(suggestion_tokens)


    _process_string_non_word_regex = re.compile(r"(?ui)[^\w\.]") # Most of the time we want to include periods in words
    @classmethod
    def _process_string(cls, string:str) -> str:
        # Cleaning inspired by <https://github.com/seatgeek/fuzzywuzzy/blob/6353e2/fuzzywuzzy/utils.py#L69>
        return ' ' + cls._process_string_non_word_regex.sub(' ', string).lower().strip()

    def _preprocess_phenos(self) -> None:
        for phenocode, pheno in self._phenos.items():
            pheno['--spaced--phenocode'] = self._process_string(phenocode)
            if 'phenostring' in pheno:
                pheno['--spaced--phenostring'] = self._process_string(pheno['phenostring'])


    def _autocomplete_variant(self, query:str) -> Iterator[Dict[str,str]]:
        # chrom-pos-ref-alt format
        query = query.replace(',', '')
        chrom, pos, ref, alt = parse_variant(query, default_chrom_pos = False)
        
        if chrom is not None:
            key = '-'.join(str(e) for e in [chrom,pos,ref,alt] if e is not None)
            like = f'{key}%'
            with closing(self.get_connection()) as conn:
                with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                    sql = """
                    SELECT cpra,rsid 
                    FROM cpras_rsids 
                    WHERE cpra LIKE %s
                    ORDER BY cpra
                    LIMIT %s
                    """
                    parameters = [f'{key}%',  self._limit]
                    cursor.execute(sql, parameters)
                    cpra_rsid_pairs = cursor.fetchall()
                    if cpra_rsid_pairs:
                        for cpra, rows in itertools.groupby(cpra_rsid_pairs, key=lambda row:row['cpra']):
                            rowlist = list(rows)
                            cpra_display = cpra.replace('-', ':', 1)
                            if len(rowlist) == 1 and rowlist[0]['rsid'] is None:
                                display = cpra_display
                            else:
                                display = '{} ({})'.format(cpra_display, ','.join(row['rsid'] for row in rowlist))
                            yield {
                                'variant' : cpra,
                                'display' : display
                            }

    def _autocomplete_rsid(self, query:str) -> Iterator[Dict[str,str]]:
        key = query.lower()
        if query.startswith('rs') and len(query) < 4:
            with closing(self.get_connection()) as conn:
                for suffix_length in [0,1,2]:
                    for suffix in (''.join(digits) for digits in itertools.product('0123456789', repeat=suffix_length)):
                        with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                            sql = """
                            SELECT cpra,rsid 
                            FROM cpras_rsids 
                            WHERE rsid=%s
                            """
                            parameters = [f'{key}{suffix}']
                            cursor.execute(sql, parameters)
                            rows = cursor.fetchall()
                            for row in rows:
                                rsid, cpra = row['rsid'], row['cpra']
                                cpra_display = cpra.replace('-', ':', 1)
                                yield {
                                    'variant' : cpra_display,
                                    'display': '{} ({})'.format(rsid, cpra_display),
                                }
        elif query.startswith('rs'):
            with closing(self.get_connection()) as conn:
                with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                    sql = """
                    SELECT cpra,rsid 
                    FROM cpras_rsids 
                    WHERE rsid LIKE %s
                    ORDER BY length(rsid),rsid DESC 
                    LIMIT  %s
                    """
                    parameters = [f'{key}%', self._limit]
                    cursor.execute(sql, parameters)
                    rows = cursor.fetchall()
                    for row in rows:
                        rsid, cpra = row['rsid'], row['cpra']
                        cpra_display = cpra.replace('-', ':', 1)
                        yield {
                            'variant' : cpra_display,
                            'display': '{} ({})'.format(rsid, cpra_display),
                        }
                        
    def _autocomplete_phenocode(self, query:str) -> Iterator[Dict[str,str]]:
        query = self._process_string(query)
        for phenocode, pheno in self._phenos.items():
            if query in pheno['--spaced--phenocode']:
                yield {
                    'pheno' : phenocode,
                    'display' : "{} ({})".format(phenocode, pheno['phenostring']) if 'phenostring' in pheno else phenocode, # TODO: truncate phenostring intelligently
                }

    def _autocomplete_phenostring(self, query:str) -> Iterator[Dict[str,str]]:
        query = self._process_string(query)
        for phenocode, pheno in self._phenos.items():
            if query in pheno['--spaced--phenostring']:
                yield {
                    'pheno' : phenocode,
                    'display' : "{} ({})".format(pheno['phenostring'], phenocode),
                }

    def _autocomplete_gene(self, query:str) -> Iterator[Dict[str,str]]:
        key = query.upper()
        if len(key) >= 2:
            with closing(self.get_connection()) as conn:
                with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                    sql = """
                    SELECT gene_alias, canonicals_comma 
                    FROM gene_aliases 
                    WHERE gene_alias LIKE %s
                    ORDER BY LENGTH(gene_alias),gene_alias
                    LIMIT %s
                    """
                    parameters = [f'{key}%', self._limit]
                    cursor.execute(sql, parameters)
                    alias_canonicals_pairs = cursor.fetchall()
                    for row in alias_canonicals_pairs:
                        alias, canonical_symbols = row['gene_alias'], row['canonicals_comma'].split(',')
                        if len(canonical_symbols) > 1:
                            yield {
                                'gene' : canonical_symbols[0],
                                'display': '{} (alias for {})'.format(alias, ' and '.join(canonical_symbols)),
                            }
                        elif canonical_symbols[0] == alias:
                            yield {
                                'gene' : canonical_symbols[0],
                                "display" : canonical_symbols[0],
                            }
                        else:
                            yield {
                                'gene' : canonical_symbols[0],
                                'display' : '{} (alias for {})'.format(alias, canonical_symbols[0]),
                            }

