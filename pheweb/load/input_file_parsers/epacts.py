



from ... import utils
conf = utils.conf

import csv
import itertools
import functools

legitimate_null_values = ['.', 'NA']

def nullable_int(string):
    try:
        return int(string)
    except ValueError:
        assert string in legitimate_null_values, string
        return '.'

def nullable_float(string):
    try:
        return float(string)
    except ValueError:
        assert string in legitimate_null_values, string
        return '.'

def nullable_float_3sigfigs(string):
    try:
        x = float(string)
    except ValueError:
        assert string in legitimate_null_values, string
        return '.'
    return utils.round_sig(x, 3)

def float_3sigfigs(string):
    x = float(string)
    return utils.round_sig(x, 3)

possible_fields = {
    'chrom': {
        'aliases': ['#CHROM'],
        'type': str,
    },
    'pos': {
        'aliases': ['BEG', 'BEGIN'],
        'type': int,
    },
    'ref': {
        'aliases': ['reference'],
        'type': str,
    },
    'alt': {
        'aliases': ['alternate'],
        'type': str,
    },
    'maf': {
        'aliases': [],
        'type': float_3sigfigs,
    },
    'pval': {
        'aliases': ['PVALUE'],
        'type': nullable_float_3sigfigs,
    },
    'beta': {
        'aliases': [],
        'type': nullable_float_3sigfigs,
    },
    'sebeta': {
        'aliases': [],
        'type': nullable_float_3sigfigs,
    }
}
required_fields = ['chrom', 'pos', 'ref', 'alt', 'maf', 'pval']

possible_info_fields = {
    'num_cases': {
        'aliases': ['NS.CASE', 'N_cases'],
        'type': nullable_int,
    },
    'num_controls': {
        'aliases': ['NS.CTRL', 'N_controls'],
        'type': nullable_int,
    },
    'num_samples': {
        'aliases': ['NS', 'N'],
        'type': nullable_int,
    },
}

# make all aliases lowercase.
for fieldname, value in possible_fields.items():
    value['aliases'] = [fieldname.lower()] + [alias.lower() for alias in value['aliases']]
for fieldname, value in possible_info_fields.items():
    value['aliases'] = [fieldname.lower()] + [alias.lower() for alias in value['aliases']]


def exit(*args, **kwargs):
    # It seems like exit(1) just hangs when used in multiprocessing, unlike raise, which kills all processes.
    # So I'm hackishly overriding it.  Gross.  Py3 will probably fix this issue.
    raise Exception('')


def get_fieldnames_and_variants(pheno, minimum_maf=None, keep_chrom_idx=False):
    assoc_files = _get_assoc_files_in_order(pheno)
    fieldnames, variants = _combine_fieldnames_variants_pairs(_get_fieldnames_and_variants(fname, minimum_maf=minimum_maf) for fname in assoc_files)
    sorted_variants = _order_ref_alt_lexicographically(variants, keep_chrom_idx=keep_chrom_idx)
    return (fieldnames, sorted_variants)

def _variant_order_key(v):
    return (_get_chrom_index(v['chrom']), v['pos'])
def _get_chrom_index(chrom):
    try:
        return utils.chrom_order[chrom]
    except KeyError:
        print("\nIt looks like one of your variants has the chromosome {!r}, but PheWeb doesn't handle that chromosome.".format(chrom))
        print("I bet you could fix it by running code like this on each of your input files:")
        print("zless my-input-file.tsv | perl -nale 'print if $. == 1 or m{^(1?[0-9]|2[0-2]|X|Y|MT?)\t}' | gzip > my-replacement-input-file.tsv.gz\n")
        exit()
def _get_assoc_files_in_order(pheno):
    assoc_files = [{'fname': fname} for fname in pheno['assoc_files']]
    for assoc_file in assoc_files:
        fieldnames, variants = _get_fieldnames_and_variants(assoc_file['fname'])
        v = next(variants)
        assoc_file['chrom'], assoc_file['pos'] = v['chrom'], v['pos']
    assoc_files = sorted(assoc_files, key=_variant_order_key)
    return [assoc_file['fname'] for assoc_file in assoc_files]

def _order_ref_alt_lexicographically(variants, keep_chrom_idx=False):
    # Also assert that chrom and pos are in order
    cp_groups = itertools.groupby(variants, key=lambda v:(v['chrom'], v['pos']))
    prev_chrom_index, prev_pos = -1, -1
    for cp, tied_variants in cp_groups:
        chrom_index = _get_chrom_index(cp[0])
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
            if keep_chrom_idx:
                v['chrom_idx'] = chrom_index
            yield v

def _tuplify_headed_iterator(f):
    @functools.wraps(f)
    def f2(*args, **kwargs):
        it = f(*args, **kwargs)
        header = next(it)
        return (header, it)
    return f2

@_tuplify_headed_iterator
def _combine_fieldnames_variants_pairs(list_of_fieldname_variants_pairs):
    # return is in itertools.chain([fieldnames], variants) form but _tuplify_headed_iterator() transforms it to (fieldnames, variants)
    constant_fieldnames, variants = next(list_of_fieldname_variants_pairs)
    yield constant_fieldnames
    for v in variants: yield v
    for fieldnames, variants in list_of_fieldname_variants_pairs:
        if constant_fieldnames != fieldnames:
            utils.die("ERROR 34234 for {!r} and {!r}".format(constant_fieldnames, fieldnames))
        for v in variants:
            yield v

@_tuplify_headed_iterator
def _get_fieldnames_and_variants(src_filename, minimum_maf=None):
    # return is in itertools.chain([fieldnames], variants) form but _tuplify_headed_iterator() transforms it to (fieldnames, variants)
    with utils.open_maybe_gzip(src_filename, 'rt') as f:
        # TODO: use `pandas.read_csv(src_filename, usecols=[...], converters={...}, iterator=True, verbose=True, na_values='.', sep=None)
        #   - first without `usecols`, to parse the column names, and then a second time with `usecols`.

        colname_mapping = {} # Map from a key like 'chrom' to an index # TODO rename to colname_index

        # Note: we're making all fieldnames lowercase, so we'll have to refer to them as lowercase everywhere after here.
        header_fields = [field.strip('"\' ').lower() for field in next(f).rstrip('\n\r').split('\t')]

        # Special case for `MARKER_ID`
        if 'marker_id' in header_fields:
            MARKER_ID_COL = header_fields.index('marker_id')
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
                        print("For reference, the key {!r} has these aliases: {!r}.".format(
                            fieldname, possible_fields[fieldname]['aliases']))
                        exit(1)
                    colname_mapping[fieldname] = header_fields.index(fieldname_alias)

        if not all(fieldname in colname_mapping for fieldname in required_fields):
            unmapped_required_fieldnames = [fieldname for fieldname in required_fields if fieldname not in colname_mapping]
            print("Some required fieldnames weren't successfully mapped to the columns of an input file.")
            print("The keys that were required but not present are: {!r}".format(unmapped_required_fieldnames))
            print("Their accepted aliases are:")
            for fieldname in unmapped_required_fieldnames:
                print("- {}: {!r}".format(fieldname, possible_fields[fieldname]['aliases']))
            print("Here are all the keys that WERE present: {!r}".format(header_fields))
            exit(1)

        optional_fields = list(set(colname_mapping) - set(required_fields))
        fieldnames = required_fields + optional_fields
        yield fieldnames

        for line in f:
            fields = line.rstrip('\n\r').split('\t')
            if len(fields) != len(header_fields):
                print("ERROR: A line has {!r} fields, but we expected {!r}.".format(len(fields), len(header_fields)))
                repr_fields = repr(fields)
                if len(repr_fields) > 5000: repr_fields = repr_fields[:200] + ' ... ' + repr_fields[-200:] # sometimes we get VERY long strings of nulls.
                print("- The line: {}".format(repr_fields))
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
    lines_metadata_infos = _get_lines_metadata_infos(pheno)
    first_line, first_line_metadata, first_info = next(lines_metadata_infos)
    for line, line_metadata, info in lines_metadata_infos:
        if info != first_info:
            utils.die("The pheno info parsed from some lines disagrees.\n" +
                      "- on line {line_num} of file {filename!r}, parsed:\n".format(**first_line_metadata) +
                      "    {}".format(first_line) +
                      "- on line {line_num} of file {filename!r}, parsed:\n".format(**line_metadata) +
                      "    {}".format(line))
    return first_info

def _get_lines_metadata_infos(pheno):
    for filename in pheno['assoc_files']:
        with utils.open_maybe_gzip(filename, 'rt') as f:
            reader = csv.DictReader(f, delimiter='\t')
            for i, line in enumerate(itertools.islice(reader, 0, 100)):
                metadata = {'line_num':i, 'filename':filename}
                yield (line, metadata, _get_pheno_info_from_line(line, metadata))

def _get_pheno_info_from_line(line, line_metadata):
    ret = {}
    for fieldname in possible_info_fields:
        for fieldname_alias in possible_info_fields[fieldname]['aliases']:
            if fieldname_alias in line:
                if fieldname in ret:
                    print('Error: two columns in {!r} both map to the key {!r}.'.format(list(line.keys()), fieldname))
                    exit(1)
                ret[fieldname] = possible_info_fields['type'](line[fieldname_alias])
    if all(key in ret for key in ['num_cases', 'num_controls', 'num_samples']):
        if ret['num_cases'] + ret['num_controls'] != ret['num_samples']:
            utils.die("The number of cases and controls don't add up to the number of samples on one line in one of your association files.\n" +
                      "- the filename: {!r}\n".format(line_metadata['filename']) +
                      "- the line number: {}".format(line_metadata['line_num']+1) +
                      "- parsed line: [{!r}]\n".format(line))
        del ret['num_samples'] # don't need it.
    return ret
