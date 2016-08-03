from __future__ import print_function, division, absolute_import

# Load config
import os.path
import imp
my_dir = os.path.dirname(os.path.abspath(__file__))
conf = imp.load_source('conf', os.path.join(my_dir, 'config.config'))

import itertools
import re
import marisa_trie

from utils import parse_variant



def get_autocompletion(query, phenos):
    query = query.strip().replace(',', '')
    result = \
        list(itertools.islice(get_variant_autocompletion(query), 0, 10)) or \
        list(itertools.islice(get_rsid_autocompletion(query), 0, 10)) or \
        list(itertools.islice(get_phewas_code_autocompletion(query, phenos), 0, 10)) or \
        list(itertools.islice(get_phewas_string_autocompletion(query, phenos), 0, 10))
    if conf.use_vanderbilt_phewas_icd9s_and_categories and not result:
        result = \
            list(itertools.islice(get_icd9_code_autocompletion(query, phenos), 0, 10)) or \
            list(itertools.islice(get_icd9_string_autocompletion(query, phenos), 0, 10))
    return result


cpra_to_rsids_trie = marisa_trie.BytesTrie().load(conf.data_dir + '/sites/cpra_to_rsids_trie.marisa')
rsid_to_cpra_trie = marisa_trie.BytesTrie().load(conf.data_dir + '/sites/rsid_to_cpra_trie.marisa')

def get_variant_autocompletion(query):
    # chrom-pos-ref-alt format
    chrom, pos, ref, alt = parse_variant(query, default_chrom_pos = False)
    if chrom is not None:
        key = '-'.join(str(e) for e in [chrom,pos,ref,alt] if e is not None)
        key = key.decode('ascii')
        for cpra, rsids in cpra_to_rsids_trie.iteritems(key):
            cpra = cpra.replace('-', ':', 1)
            yield {
                "value": cpra,
                "display": '{} ({})'.format(cpra, rsids) if rsids else cpra,
                "url": "/variant/{}".format(cpra)
            }

def get_rsid_autocompletion(query):
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
            cpra = rsid_to_cpra_trie.get(rsid)
            if cpra is not None:
                cpra = cpra[0]
                cpra = cpra.replace('-', ':', 1)
                yield {
                    "value": cpra,
                    "display": '{} ({})'.format(rsid, cpra),
                    "url": "/variant/{}".format(cpra)
                }

        for rsid, cpra in rsid_to_cpra_trie.iteritems(key):
            cpra = cpra.replace('-', ':', 1)
            yield {
                "value": cpra,
                "display": '{} ({})'.format(rsid, cpra),
                "url": "/variant/{}".format(cpra)
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
