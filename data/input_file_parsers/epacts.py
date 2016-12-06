#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

# Load config
import os.path
import imp
my_dir = os.path.dirname(os.path.abspath(__file__))
conf = imp.load_source('conf', os.path.join(my_dir, '../../config.config'))

utils = imp.load_source('utils', os.path.join(my_dir, '../../utils.py'))

import csv
import gzip
import itertools


legitimate_null_values = ['.', 'NA']

def nullable_float(string):
    try:
        return float(string)
    except ValueError:
        assert string in legitimate_null_values, string
        return '.'

possible_fields = {
    'chrom': {
        'aliases': ['#CHROM', 'CHROM'],
        'type': str,
    },
    'pos': {
        'aliases': ['BEG', 'BEGIN'],
        'type': int,
    },
    'maf': {
        'aliases': ['MAF'],
        'type': float,
    },
    'pval': {
        'aliases': ['PVALUE'],
        'type': nullable_float,
    },
    'beta': {
        'aliases': ['BETA'],
        'type': nullable_float,
    },
    'sebeta': {
        'aliases': ['SEBETA'],
        'type': nullable_float,
    }
}
required_fields = ['chrom', 'pos', 'ref', 'alt', 'maf', 'pval']

def get_fieldnames_and_variants(pheno, minimum_maf=None):
    assoc_files = _get_assoc_files_in_order(pheno)
    fieldnames, variants = _combine_fieldnames_variants_pairs(_get_fieldnames_and_variants(fname, minimum_maf=minimum_maf) for fname in assoc_files)
    sorted_variants = _order_ref_alt_lexicographically(variants)
    return (fieldnames, sorted_variants)

def _variant_order_key(v):
    try:
        return (utils.chrom_order[v['chrom']], v['pos'])
    except ValueError:
        print("Failed to understand the relative position of variant {!r}, probably because we don't recognize the chromosome".format(v))
def _get_assoc_files_in_order(pheno):
    assoc_files = [{'fname': fname} for fname in pheno['assoc_files']]
    for assoc_file in assoc_files:
        fieldnames, variants = _get_fieldnames_and_variants(assoc_file['fname'])
        v = next(variants)
        assoc_file['chrom'], assoc_file['pos'] = v['chrom'], v['pos']
    assoc_files = sorted(assoc_files, key=_variant_order_key)
    return [assoc_file['fname'] for assoc_file in assoc_files]


def _order_ref_alt_lexicographically(variants):
    # Also assert that chrom and pos are in order
    cp_groups = itertools.groupby(variants, key=lambda v:(v['chrom'], v['pos']))
    prev_chrom_index, prev_pos = -1, -1
    for cp, tied_variants in cp_groups:
        chrom_index = utils.chrom_order[cp[0]]
        if chrom_index < prev_chrom_index:
            print("The chromosomes in your file appear to be in the wrong order.")
            print("The required order is: {!r}".format(utils.chrom_order_list))
            print("But in your file, the chromosome {!r} came after the chromosome {!r}".format(
                cp[0], utils.chrom_order_list[prev_chrom_index]))
            exit(1)
        if chrom_index == prev_chrom_index and cp[1] < prev_pos:
            print("The positions in your file appear to be in the wrong order.")
            print("In your file, the position {!r} came after the position {!r} on chromsome {!r}".format(
                cp[1], prev_pos, cp[0]))
            exit(1)
        for v in sorted(tied_variants, key=lambda v:(v['ref'], v['alt'])):
            yield v

def _tuplify_headed_iterator(headed_iterator):
    header = next(headed_iterator)
    return (header, headed_iterator)

def _combine_fieldnames_variants_pairs(list_of_fielname_variants_pairs):
    # return is in (fieldnames, variants) form
    rv = _headed_combine_fieldnames_variants_pairs(list_of_fielname_variants_pairs)
    fieldnames = next(rv)
    return (fieldnames, rv)
def _headed_combine_fieldnames_variants_pairs(list_of_fielname_variants_pairs):
    # return is in itertools.chain([fieldnames], variants) form
    constant_fieldnames = None
    for fieldnames, variants in list_of_fielname_variants_pairs:
        if constant_fieldnames is None:
            assert fieldnames is not None
            constant_fieldnames = fieldnames
            yield constant_fieldnames
        else:
            if constant_fieldnames != fieldnames:
                utils.die("ERROR 34234 for {!r} and {!r}".format(constant_fieldnames, fieldnames))
        for v in variants:
            yield v

def _get_fieldnames_and_variants(*args, **kwargs):
    # return is in (fieldnames, variants) form
    return _tuplify_headed_iterator(_get_headed_variants(*args, **kwargs))
def _get_headed_variants(src_filename, minimum_maf=None):
    # return is in itertools.chain([fieldnames], variants) form
    with utils.open_maybe_gzip(src_filename) as f:
        # TODO: use `pandas.read_csv(src_filename, usecols=[...], converters={...}, iterator=True, verbose=True, na_values='.', sep=None)
        #   - first without `usecols`, to parse the column names, and then a second time with `usecols`.

        colname_mapping = {} # Map from a key like 'chrom' to an index # TODO rename to colname_index

        header_fields = [field.strip('"\' ') for field in next(f).rstrip('\n\r').split('\t')]

        # Special case for `MARKER_ID`
        if 'MARKER_ID' in header_fields:
            MARKER_ID_COL = header_fields.index('MARKER_ID')
            colname_mapping['ref'] = None # This is just to mark that we have 'ref', but it doesn't come from a column.
            colname_mapping['alt'] = None
            # TODO: this sort of provides a mapping for chrom and pos, but those are usually doubled anyways.
        else:
            MARKER_ID_COL = None

        for fieldname in possible_fields:
            for fieldname_alias in possible_fields[fieldname]['aliases']:
                if fieldname_alias in header_fields:
                    # Check that we haven't already mapped this fieldname to a header column.
                    if fieldname in colname_mapping:
                        print("Wait, what?  We found two different ways of mapping the key {!r} to the header fields {!r}.".format(fieldname, header_fields))
                        print("For reference, the key {!r} has these aliases: {!r}.".format(fieldname, fieldname_aliases))
                        exit(1)
                    colname_mapping[fieldname] = header_fields.index(fieldname_alias)

        if not all(fieldname in colname_mapping for fieldname in required_fields):
            unmapped_required_fieldnames = [fieldname for fieldname in required_fields if fieldname not in colname_mapping]
            print("Some required fieldnames weren't successfully mapped to the columns of an input file.")
            print("Those were: {!r}".format(unmapped_required_fieldnames))
            exit(1)

        optional_fields = list(set(colname_mapping) - set(required_fields))
        fieldnames = required_fields + optional_fields
        yield fieldnames

        for line in f:
            fields = line.rstrip('\n\r').split('\t')
            if len(fields) != len(header_fields):
                print("ERROR: A line has {!r} fields, but we expected {!r}.".format(len(fields), len(header_fields)))
                print("- The line: {!r}".format(fields))
                print("- The header: {!r}".format(header_fields))
                print("- In file: {!r}".format(src_filename))
                exit(1)

            v = {}
            for fieldname in colname_mapping:
                if colname_mapping[fieldname] is not None:
                    try:
                        v[fieldname] = possible_fields[fieldname]['type'](fields[colname_mapping[fieldname]])
                    except:
                        print("failed on fieldname {!r} attempting to convert value {!r} to type {!r} in {!r} on line {!r}".format(
                            fieldname, fields[colname_mapping[fieldname]], possible_fields[fieldname]['type'], src_filename, line))
                        exit(1)

            if minimum_maf is not None and v['maf'] < minimum_maf:
                continue

            if MARKER_ID_COL is not None:
                chrom2, pos2, v['ref'], v['alt'] = utils.parse_marker_id(fields[MARKER_ID_COL])
                assert v['chrom'] == chrom2, (fields, v, chrom2)
                assert v['pos'] == pos2, (fields, v, pos2)

            yield v


def get_pheno_info(pheno):
    # TODO: if it has multiple association files, read each and check that they agree
    src_filename = pheno['assoc_files'][0]
    with gzip.open(src_filename, 'rt') as f:
        reader = csv.DictReader(f, delimiter='\t')
        first_line = next(reader)
        rv = _get_pheno_info_from_line(first_line)

        # Check that some later lines agree
        for i, line in enumerate(reader):
            if i > 100: break
            assert _get_pheno_info_from_line(line) == rv
    return rv

def _get_pheno_info_from_line(line):
    rv = {}
    if 'NS.CASE' in line:
        rv['num_cases'] = int(line['NS.CASE'])
    if 'NS.CTRL' in line:
        rv['num_controls'] = int(line['NS.CTRL'])
    if 'NS' in line:
        rv['num_samples'] = int(line['NS'])
    if all(key in rv for key in ['num_cases', 'num_controls', 'num_samples']):
        assert rv['num_cases'] + rv['num_controls'] == rv['num_samples']
        del rv['num_samples'] # don't need it.
    return rv
