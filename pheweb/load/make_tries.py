



from .. import utils
conf = utils.conf

import os

import marisa_trie

def parse_line(line):
    chrom, pos, ref, alt, rsid, genes = line.rstrip('\n').split('\t')
    # Keys in marisa_trie must be unicode. Values in BytesTrie must be bytes.
    return ('{}-{}-{}-{}'.format(chrom, pos, ref, alt), rsid.encode())


sites_fname = os.path.join(conf.data_dir, 'sites', 'sites.tsv')
cpra_to_rsids_trie_fname = os.path.join(conf.data_dir, 'sites', 'cpra_to_rsids_trie.marisa')
rsid_to_cpra_trie_fname = os.path.join(conf.data_dir, 'sites', 'rsid_to_cpra_trie.marisa')
def should_replace(fname):
    return not os.path.exists(fname) or os.stat(fname).st_mtime < os.stat(sites_fname).st_mtime

def run(argv):

    if not should_replace(cpra_to_rsids_trie_fname) and not should_replace(rsid_to_cpra_trie_fname):
        print('tries are up-to-date!')

    else:
        with open(os.path.join(conf.data_dir, 'sites', 'sites.tsv'), 'rt') as f:
            lines = [parse_line(line) for line in f]
        print('done loading.')

        cpra_to_rsids_trie = marisa_trie.BytesTrie(lines, order=marisa_trie.LABEL_ORDER)
        cpra_to_rsids_trie.save(cpra_to_rsids_trie_fname)
        print('done with cpra->rsids trie at ' + cpra_to_rsids_trie_fname)

        # TODO: What if several different chrom-pos-ref-alts have the same rsid?  Do we only get the first? Or the last?
        reversed_lines = ((rsid.decode(), cpra.encode()) for (cpra, rsids) in lines for rsid in rsids.split(b',') if rsid)
        rsid_to_cpra_trie = marisa_trie.BytesTrie(reversed_lines, order=marisa_trie.LABEL_ORDER)
        rsid_to_cpra_trie.save(rsid_to_cpra_trie_fname)
        print('done with rsid->cpra trie at ' + rsid_to_cpra_trie_fname)
