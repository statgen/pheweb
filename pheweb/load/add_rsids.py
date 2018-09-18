

'''
This script annotates `sites/sites-unannotated.tsv` with rsids (comma-separated) from `sites/dbSNP/rsids.vcf.gz`.  It prints output to `sites-rsids.tsv`.

It relies on both being ordered like [1-22,X,Y,MT] and having positions sorted.

Notes:

`sites/sites-unannotated.tsv` can have multi-allelic positions.
`sites/dbSNP/rsids.vcf.gz` can have multi-allelic variants and multiple rsids for the same chr-pos-ref-alt.

In `sites/dbSNP/rsids.vcf.gz`, sometimes `alt` contains `N`, which matches any nucleotide I think.

We read one full position at a time.  When we have a position-match, we find all rsids that match a variant.
'''

# TODO: do we need to left-normalize all indels?
# TODO: rename `cpra` to something else to reflect that it can also contain other per-variant fields


from ..utils import chrom_order, chrom_order_list, chrom_aliases, PheWebError
from ..file_utils import VariantFileReader, VariantFileWriter, common_filepaths, read_maybe_gzip

import os
import itertools

in_filepath = common_filepaths['unanno']
out_filepath = common_filepaths['sites-rsids']
rsids_filepath = common_filepaths['rsids']

def mod_time(filepath): return os.stat(filepath).st_mtime

def get_rsid_reader(rsids_f):
    prev_chrom_idx = -1
    prev_pos = -1
    for line in rsids_f:
        if not line.startswith('##'):
            if line.startswith('#'):
                assert line.rstrip('\r\n').split('\t') == '#CHROM POS ID REF ALT QUAL FILTER INFO'.split(), repr(line)
            else:
                fields = line.rstrip('\r\n').split('\t')
                if len(fields) != 5:
                    raise PheWebError('Line has wrong number of fields: {!r} - {!r}'.format(line, fields))
                chrom, pos, rsid, ref, alt_group = fields[0], int(fields[1]), fields[2], fields[3], fields[4]
                if chrom not in chrom_order:
                    try:
                        chrom = chrom_aliases[chrom]
                    except KeyError:
                        raise PheWebError((
                            'The rsids file, {!r}, contains the unknown chromsome {!r}.\n' +
                            'The recognized chromosomes are: {!r}.\n' +
                            'Recognized aliases are: {!r}.\n').format(
                                rsids_filepath, chrom, list(chrom_order.keys()), list(chrom_aliases.keys())))
                chrom_idx = chrom_order[chrom]
                if prev_chrom_idx > chrom_idx:
                    raise PheWebError((
                        'The rsids file, {!r}, contains chromosomes in the wrong order.' +
                        'The order should be: {!r}' +
                        'but instead {} came before {}').format(
                            rsids_filepath, chrom_order_list, chrom_order_list[prev_chrom_idx], chrom_order_list[chrom_idx]))
                if prev_chrom_idx == chrom_idx and prev_pos > pos:
                    raise PheWebError('The rsids file, {!r}, on chromosome {!r}, has position {} before {}.'.format(
                        rsids_filepath, chrom_order_list[chrom_idx], prev_pos, pos))
                assert rsid.startswith('rs')
                # Sometimes the reference contains `N`, and that's okay.
                assert all(base in 'ATCGN' for base in ref), (chrom, pos, ref, alt_group)
                for alt in alt_group.split(','):
                    # Alt can be a comma-separated list
                    if alt == '.': continue # TODO: I don't understand what this means or why it happens.  Probably it should match any alt.
                    assert all(base in 'ATCGN' for base in alt), (chrom, pos, ref, alt)
                    yield {'chrom':chrom, 'pos':int(pos), 'ref':ref, 'alt':alt, 'rsid':rsid}


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
    '''Compares nucleotide sequences.  Eg, "A" == "A", "A" == "N", "A" != "AN".'''
    if seq1 == seq2: return True
    if len(seq1) == len(seq2) and 'N' in seq1 or 'N' in seq2:
        return all(b1 == b2 or b1 == 'N' or b2 == 'N' for b1, b2 in zip(seq1, seq2))
    return False


def run(argv):

    if '-h' in argv or '--help' in argv:
        print('Annotate the sites file with rsids. Download the relevant version of dbSNP if not already present.')
        exit(1)

    if not os.path.exists(rsids_filepath):
        print('Downloading rsids from dbSNP')
        from . import download_rsids
        download_rsids.run([])

    if os.path.exists(out_filepath) and max(mod_time(in_filepath), mod_time(rsids_filepath)) <= mod_time(out_filepath):
        print('rsid annotation is up-to-date!')
        return

    with VariantFileReader(in_filepath) as in_reader, \
         read_maybe_gzip(rsids_filepath) as rsids_f, \
         VariantFileWriter(out_filepath) as writer:

        rsid_group_reader = get_one_chr_pos_at_a_time(get_rsid_reader(rsids_f))
        cp_group_reader = get_one_chr_pos_at_a_time(in_reader)

        rsid_group = next(rsid_group_reader)
        for cp_group in cp_group_reader:

            # Advance rsid_group until it is up to/past cp_group
            while True:
                if rsid_group[0]['chrom'] == cp_group[0]['chrom']:
                    rsid_is_not_behind = rsid_group[0]['pos'] >= cp_group[0]['pos']
                else:
                    rsid_is_not_behind = chrom_order[rsid_group[0]['chrom']] >= chrom_order[cp_group[0]['chrom']]
                if rsid_is_not_behind:
                    break
                else:
                    try:
                        rsid_group = next(rsid_group_reader)
                    except StopIteration:
                        break

            if rsid_group[0]['chrom'] == cp_group[0]['chrom'] and rsid_group[0]['pos'] == cp_group[0]['pos']:
                # we have rsids at this position!  will they match on ref/alt?
                for cpra in cp_group:
                    rsids = [rsid['rsid'] for rsid in rsid_group if cpra['ref'] == rsid['ref'] and are_match(cpra['alt'], rsid['alt'])]
                    # if len(rsids) > 1:
                    #     print('WARNING: the variant {chrom}-{pos}-{ref}-{alt} has multiple rsids: {rsids}'.format(**cpra, rsids=rsids))
                    cpra['rsids'] = ','.join(rsids)
                    writer.write(cpra)
            else:
                # No match, just print each cpra with an empty `rsids` column
                for cpra in cp_group:
                    cpra['rsids'] = ''
                    writer.write(cpra)
