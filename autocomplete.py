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
        list(itertools.islice(get_phewas_string_autocompletion(query, phenos), 0, 10)) or \
        list(itertools.islice(get_icd9_code_autocompletion(query, phenos), 0, 10)) or \
        list(itertools.islice(get_icd9_string_autocompletion(query, phenos), 0, 10))


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

        # In Trie.iteritems, "rs100" comes before "rs1".
        # So, rsids_sites_trie.iteritems("rs7412")[-1] is "rs7412".
        # That's unfortunate, and I don't know how to fix it.
        # I wish we could get a real lexicographic order, where shorter strings come first, but I don't see how.
        # Even better would be to the 10 shortest children of the current string.
        # Here's an attempt at being a little better.

        rsids_to_check = [key] + [u"{}{}".format(key, i) for i in range(10)]
        for rsid in rsids_to_check:
            chrom_pos_ref_alt = rsids_sites_trie.get(rsid)
            if chrom_pos_ref_alt is not None:
                chrom_pos_ref_alt = chrom_pos_ref_alt[0]
                chrom_pos_ref_alt = chrom_pos_ref_alt.replace('-', ':', 1)
                yield {
                    "value": chrom_pos_ref_alt,
                    "display": '{} ({})'.format(rsid, chrom_pos_ref_alt),
                    "url": "/variant/{}".format(chrom_pos_ref_alt)
                }

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

def get_icd9_code_autocompletion(query, phenos):
    # Try icd9_code
    if re.match('^\s*[0-9]', query):
        for phewas_code, pheno in phenos.iteritems():
            for icd9 in pheno['icd9s']:
                if icd9['icd9_code'].startswith(query):
                    yield {
                        "value": phewas_code,
                        "display": "{} (icd9 code; phewas code: {}; icd9_string: {})".format(icd9['icd9_code'], phewas_code, icd9['icd9_string']),
                        "url": "/pheno/{}".format(phewas_code),
                    }

def get_icd9_string_autocompletion(query, phenos):
    # Try icd9_string
    if re.match('^\s*[a-zA-Z]', query):
        for phewas_code, pheno in phenos.iteritems():
            for icd9 in pheno['icd9s']:
                if query.title() in pheno['phewas_string'].title():
                    yield {
                        "value": phewas_code,
                        "display": "{} (icd9 string; icd9 code: {}; phewas code: {})".format(icd9['icd9_string'], icd9['icd9_code'], phewas_code),
                        "url": "/pheno/{}".format(phewas_code),
                    }

def get_best_completion(query, phenos):
    # TODO: get_autocompletion only returns the first 10, so this will be a little broken.  Look at more.
    suggestions = get_autocompletion(query, phenos)
    if suggestions:
        for suggestion in suggestions:
            suggestion['match_quality'] = len(set(query.lower().split()).intersection(suggestion['display'].lower().split())) / len(suggestion['display'].split())
        return max(suggestions, key=lambda sugg: sugg['match_quality'])
