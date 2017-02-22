

'''
This script annotates `cpra.tsv` with rsids (comma-separated) from `sites/dbSNP/rsids.vcf.gz`.  It prints output to `cpra_rsids.tsv`.

It relies on both being ordered like [1-22,X,Y,MT] and having positions sorted.

Notes:

`sites/cpra.tsv` can have multi-allelic positions.
`sites/dbSNP/rsids.vcf.gz` can have multi-allelic variants and multiple rsids for the same chr-pos-ref-alt.

In `sites/dbSNP/rsids.vcf.gz`, sometimes `alt` contains `N`, which matches any nucleotide I think.

We read one full position at a time.  When we have a position-match, we find all rsids that match a variant.
'''

# TODO:
# - Do we need to left-normalize all indels?



from .. import utils
conf = utils.conf

import os
import gzip
import csv
import itertools



rsids_filename = utils.get_cacheable_file_location(os.path.join(conf.data_dir, 'sites', 'dbSNP'), 'rsids-147.vcf.gz')
cpra_filename = conf.data_dir + "/sites/cpra.tsv"
out_filename = conf.data_dir + "/sites/cpra_rsids.tsv"

def mod_time(fname): return os.stat(fname).st_mtime

def get_rsid_reader(rsids_f):
    # TODO: add assertions about ordering?
    for line in rsids_f:
        if not line.startswith('##'):
            if line.startswith('#'):
                assert line.rstrip('\n').split('\t') == '#CHROM POS ID REF ALT QUAL FILTER INFO'.split()
            else:
                fields = line.rstrip('\n').split('\t')
                chrom, pos, rsid, ref, alt_group = fields[0], int(fields[1]), fields[2], fields[3], fields[4]
                assert rsid.startswith('rs')
                # Sometimes the reference contains `N`, and that's okay.
                assert all(base in 'ATCGN' for base in ref), repr(ref)
                for alt in alt_group.split(','):
                    # Alt can be a comma-separated list
                    assert all(base in 'ATCGN' for base in alt), repr(alt)
                    yield {'chrom':chrom, 'pos':int(pos), 'ref':ref, 'alt':alt, 'rsid':rsid}

def get_cpra_reader(cpra_f):
    '''Returns a reader which returns a list of all cpras at the next chrom-pos.'''
    cpra_reader = csv.DictReader(cpra_f, delimiter='\t')
    for cpra in cpra_reader:
        yield {
            'chrom': cpra['chrom'],
            'pos': int(cpra['pos']),
            'ref': cpra['ref'],
            'alt': cpra['alt'],
        }

def get_one_chr_pos_at_a_time(iterator):
    '''Turns
    [{'chr':'1', 'pos':123, 'ref':'A', 'alt':'T'},{'chr':'1', 'pos':123, 'ref':'A', 'alt':'GC'},{'chr':'1', 'pos':128, 'ref':'A', 'alt':'T'},...]
    into:
    [ [{'chr':'1', 'pos':123, 'ref':'A', 'alt':'T'},{'chr':'1', 'pos':123, 'ref':'A', 'alt':'GC'}] , [{'chr':'1', 'pos':128, 'ref':'A', 'alt':'T'}] ,...]
    where variants with the same position are in a list.
    '''
    for k, g in itertools.groupby(iterator, key=lambda cpra: (cpra['chrom'], cpra['pos'])):
        yield list(g)

def are_match(seq1, seq2):
    if seq1 == seq2: return True
    if len(seq1) == len(seq2) and 'N' in seq1 or 'N' in seq2:
        return all(b1 == b2 or b1 == 'N' or b2 == 'N' for b1, b2 in zip(seq1, seq2))
    return False


rsids_chrom_order = [str(i) for i in range(1,22+1)] + ['X', 'Y', 'MT']
rsids_chrom_order = {chrom: index for index,chrom in enumerate(rsids_chrom_order)}

def run(argv):

    if os.path.exists(out_filename) and max(mod_time(cpra_filename), mod_time(rsids_filename)) <= mod_time(out_filename):
        print('rsid annotation is up-to-date!')
        return

    with open(cpra_filename, 'rt') as cpra_f, \
         gzip.open(rsids_filename, 'rt') as rsids_f, \
         open(out_filename, 'wt') as out_f:

        rsid_group_reader = get_one_chr_pos_at_a_time(get_rsid_reader(rsids_f))
        cp_group_reader = get_one_chr_pos_at_a_time(get_cpra_reader(cpra_f))

        cpra_largest_index_in_rsids_chrom_order = -1
        rsid_group = next(rsid_group_reader)
        for cp_group in cp_group_reader:
            if cp_group[0]['chrom'] not in rsids_chrom_order:
                print("Your input has a chromosome {!r}, which we don't have rsids for.".format(cp_group[0]['chrom']))
                print("That wouldn't be a big problem, but I'm using the rsid chromosome order for sanity-checking.")
                print("So you're going to have to remove this message and fix some stuff related to rsids_chrom_order")
                raise Exception()
            if rsids_chrom_order[cp_group[0]['chrom']] < cpra_largest_index_in_rsids_chrom_order:
                print("Your chromosomes are in the wrong order!  See `rsids_chrom_order` in this file for the right order.")
                raise Exception()
            cpra_largest_index_in_rsids_chrom_order = rsids_chrom_order[cp_group[0]['chrom']]

            # Advance rsid_group until it is up to/past cp_group
            while True:
                if rsid_group[0]['chrom'] == cp_group[0]['chrom']:
                    rsid_is_not_behind = rsid_group[0]['pos'] >= cp_group[0]['pos']
                else:
                    rsid_is_not_behind = rsids_chrom_order[rsid_group[0]['chrom']] >= rsids_chrom_order[cp_group[0]['chrom']]
                if rsid_is_not_behind:
                    break
                else:
                    try:
                        rsid_group = next(rsid_group_reader)
                    except StopIteration:
                        break

            if rsid_group[0]['chrom'] == cp_group[0]['chrom'] and rsid_group[0]['pos'] == cp_group[0]['pos']:
                # Woohoo a match!
                for cpra in cp_group:
                    rsids = (rsid['rsid'] for rsid in rsid_group if cpra['ref'] == rsid['ref'] and are_match(cpra['alt'], rsid['alt']))
                    print('{chrom}\t{pos}\t{ref}\t{alt}\t{0}'.format(','.join(rsids), **cpra), file=out_f)
            else:
                # No match, just print each cpra with an empty `rsids` column
                for cpra in cp_group:
                    print('{chrom}\t{pos}\t{ref}\t{alt}\t'.format(**cpra), file=out_f)
