
from ..utils import chrom_order, chrom_order_list, chrom_aliases, PheWebError
from .. import parse_utils
from .. import conf
from ..file_utils import read_maybe_gzip
from .load_utils import get_maf

import itertools
import re
import boltons.iterutils


class PhenoReader:
    '''
    Reads variants (in order) and other info for a phenotype.
    It only returns variants that have a pvalue.
    If `minimum_maf` is defined, variants that don't meet that threshold (via MAF, AF, or AC/NS) are dropped.
    '''

    def __init__(self, pheno, minimum_maf=0):
        self._pheno = pheno
        self._minimum_maf = minimum_maf or 0
        self.fields, self.filepaths = self._get_fields_and_filepaths(pheno['assoc_files'])

    def get_variants(self):
        yield from self._order_refalt_lexicographically(
            itertools.chain.from_iterable(
                AssocFileReader(filepath, self._pheno).get_variants(minimum_maf=self._minimum_maf) for filepath in self.filepaths))

    def get_info(self):
        infos = [AssocFileReader(filepath, self._pheno).get_info() for filepath in self.filepaths]
        for info in infos[1:]:
            if info != infos[0]:
                raise PheWebError(
                    "The pheno info parsed from some lines disagrees.\n" +
                    "- for the pheno {}\n".format(self._pheno['phenocode']) +
                    "- parsed from one line:\n    {}\n".format(infos[0]) +
                    "- parsed another line:\n    {}\n".format(info))
        return infos[0]

    def _order_refalt_lexicographically(self, variants):
        # Also assert that chrom and pos are in order
        cp_groups = itertools.groupby(variants, key=lambda v:(v['chrom'], v['pos']))
        prev_chrom_index, prev_pos = -1, -1
        for cp, tied_variants in cp_groups:
            chrom_index = self._get_chrom_index(cp[0])
            if chrom_index < prev_chrom_index:
                raise PheWebError(
                    "The chromosomes in your file appear to be in the wrong order.\n" +
                    "The required order is: {!r}\n".format(chrom_order_list) +
                    "But in your file, the chromosome {!r} came after the chromosome {!r}\n".format(
                        cp[0], chrom_order_list[prev_chrom_index]))
            if chrom_index == prev_chrom_index and cp[1] < prev_pos:
                raise PheWebError(
                    "The positions in your file appear to be in the wrong order.\n" +
                    "In your file, the position {!r} came after the position {!r} on chromsome {!r}\n".format(
                        cp[1], prev_pos, cp[0]))
            prev_chrom_index, prev_pos = chrom_index, cp[1]
            for v in sorted(tied_variants, key=lambda v:(v['ref'], v['alt'])):
                yield v

    def _get_fields_and_filepaths(self, filepaths):
        # also sets `self._fields`
        assoc_files = [{'filepath': filepath} for filepath in filepaths]
        for assoc_file in assoc_files:
            ar = AssocFileReader(assoc_file['filepath'], self._pheno)
            v = next(ar.get_variants())
            assoc_file['chrom'], assoc_file['pos'] = v['chrom'], v['pos']
            assoc_file['fields'] = list(v)
        assert boltons.iterutils.same(af['fields'] for af in assoc_files)
        assoc_files = sorted(assoc_files, key=self._variant_chrpos_order_key)
        return (
            assoc_files[0]['fields'],
            [assoc_file['filepath'] for assoc_file in assoc_files]
        )

    @staticmethod
    def _variant_chrpos_order_key(v):
        return (PhenoReader._get_chrom_index(v['chrom']), v['pos'])
    @staticmethod
    def _get_chrom_index(chrom):
        try:
            return chrom_order[chrom]
        except KeyError:
            raise PheWebError(
                "It looks like one of your variants has the chromosome {!r}, but PheWeb doesn't handle that chromosome.\n".format(chrom) +
                "I bet you could fix it by running code like this on each of your input files:\n" +
                "zless my-input-file.tsv | perl -nale 'print if $. == 1 or m{^(1?[0-9]|2[0-2]|X|Y|MT?)\t}' | gzip > my-replacement-input-file.tsv.gz\n")


class AssocFileReader:
    '''Has no concern for ordering, only in charge of parsing one associations file.'''
    # TODO: use `pandas.read_csv(src_filepath, usecols=[...], converters={...}, iterator=True, verbose=True, na_values='.', sep=None)
    #   - first without `usecols`, to parse the column names, and then a second time with `usecols`.

    def __init__(self, filepath, pheno):
        self.filepath = filepath
        self._pheno = pheno


    def get_variants(self, minimum_maf=0, use_per_pheno_fields=False):
        if use_per_pheno_fields:
            fieldnames_to_check = [fieldname for fieldname,fieldval in parse_utils.per_pheno_fields.items() if fieldval['from_assoc_files']]
        else:
            fieldnames_to_check = [fieldname for fieldname,fieldval in itertools.chain(parse_utils.per_variant_fields.items(), parse_utils.per_assoc_fields.items()) if fieldval['from_assoc_files']]

        with read_maybe_gzip(self.filepath) as f:

            try:
                header_line = next(f)
            except Exception as exc:
                raise PheWebError("Failed to read from file {} - is it empty?".format(self.filepath)) from exc

            if header_line.count('\t') >= 4: delimiter = '\t'
            elif header_line.count(' ') >= 4: delimiter = ' '
            elif header_line.count(',') >= 4: delimiter = ','
            else: raise PheWebError("Cannot guess what delimiter to use to parse the header line {!r} in file {!r}".format(header_line, self.filepath))

            colnames = [colname.strip('"\' ').lower() for colname in header_line.rstrip('\n\r').split(delimiter)]
            colidx_for_field = self._parse_header(colnames, fieldnames_to_check)
            # Special case for `MARKER_ID`
            if 'marker_id' not in colnames:
                marker_id_col = None
            else:
                marker_id_col = colnames.index('marker_id')
                colidx_for_field['ref'] = None # This is just to mark that we have 'ref', but it doesn't come from a column.
                colidx_for_field['alt'] = None
                # TODO: this sort of provides a mapping for chrom and pos, but those are usually doubled anyways.
                # TODO: maybe we should allow multiple columns to map to each key, and then just assert that they all agree.
            self._assert_all_fields_mapped(colnames, fieldnames_to_check, colidx_for_field)

            if use_per_pheno_fields:
                for line in f:
                    values = line.rstrip('\n\r').split(delimiter)
                    variant = self._parse_variant(values, colnames, colidx_for_field)
                    yield variant

            else:
                for line in f:
                    values = line.rstrip('\n\r').split(delimiter)
                    variant = self._parse_variant(values, colnames, colidx_for_field)

                    if variant['pval'] == '': continue

                    maf = get_maf(variant, self._pheno) # checks for agreement
                    if maf is not None and maf < minimum_maf:
                        continue

                    if marker_id_col is not None:
                        chrom2, pos2, variant['ref'], variant['alt'] = AssocFileReader.parse_marker_id(values[marker_id_col])
                        assert variant['chrom'] == chrom2, (values, variant, chrom2)
                        assert variant['pos'] == pos2, (values, variant, pos2)

                    if variant['chrom'] in chrom_aliases:
                        variant['chrom'] = chrom_aliases[variant['chrom']]

                    yield variant

    def get_info(self):
        infos = []
        for linenum, variant in enumerate(itertools.islice(self.get_variants(use_per_pheno_fields=True), 0, 1000)):
            # Check that num_cases + num_controls == num_samples
            if all(key in variant for key in ['num_cases', 'num_controls', 'num_samples']):
                if variant['num_cases'] + variant['num_controls'] != variant['num_samples']:
                    raise PheWebError(
                        "The number of cases and controls don't add up to the number of samples on one line in one of your association files.\n" +
                        "- the filepath: {!r}\n".format(self.filepath) +
                        "- the line number: {}".format(linenum+1) +
                        "- parsed line: [{!r}]\n".format(variant))
                del variant['num_samples'] # don't need it.
            infos.append(variant)
        for info in infos[1:]:
            if info != infos[0]:
                raise PheWebError(
                    "The pheno info parsed from some lines disagrees.\n" +
                    "- in the file {}".format(self.filepath) +
                    "- parsed from first line:\n    {}".format(infos[0]) +
                    "- parsed from a later line:\n    {}".format(info))
        return infos[0]

    def _parse_variant(self, values, colnames, colidx_for_field):
        # `values`: [str]

        if len(values) != len(colnames):
            repr_values = repr(values)
            if len(repr_values) > 5000: repr_values = repr_values[:200] + ' ... ' + repr_values[-200:] # sometimes we get VERY long strings of nulls.
            raise PheWebError(
                "ERROR: A line has {!r} values, but we expected {!r}.\n".format(len(values), len(colnames)) +
                "- The line: {}\n".format(repr_values) +
                "- The header: {!r}\n".format(colnames) +
                "- In file: {!r}\n".format(self.filepath))

        variant = {}
        for field, colidx in colidx_for_field.items():
            if colidx is not None:
                parse = parse_utils.parser_for_field[field]
                value = values[colidx]
                try:
                    variant[field] = parse(value)
                except Exception as exc:
                    raise PheWebError(
                        "failed on field {!r} attempting to convert value {!r} to type {!r} with constraints {!r} in {!r} on line with values {!r}".format(
                            field, values[colidx], parse_utils.fields[field]['type'], parse_utils.fields[field], self.filepath, values)) from exc

        return variant

    def _parse_header(self, colnames, fieldnames_to_check):
        colidx_for_field = {} # which column (by number, not name) holds the value for the field (the key)
        field_aliases = conf.get_field_aliases()  # {alias: field_name}
        for colidx, colname in enumerate(colnames):
            if colname in field_aliases and field_aliases[colname] in fieldnames_to_check:
                field_name = field_aliases[colname]
                if field_name in colidx_for_field:
                    raise PheWebError(
                        "PheWeb found two different ways of mapping the field_name {!r} to the columns {!r}.\n".format(field_name, colnames) +
                        "field_aliases = {!r}.\n".format(field_aliases) +
                        "File = {}\n".format(self.filepath))
                colidx_for_field[field_name] = colidx
        return colidx_for_field

    def _assert_all_fields_mapped(self, colnames, fieldnames_to_check, colidx_for_field):
        fields = parse_utils.fields
        required_fieldnames = [fieldname for fieldname in fieldnames_to_check if fields[fieldname]['required']]
        missing_required_fieldnames = [fieldname for fieldname in required_fieldnames if fieldname not in colidx_for_field]
        if missing_required_fieldnames:
            err_message = (
                "Some required fields weren't successfully mapped to the columns of an input file.\n" +
                "The file is {!r}.\n".format(self.filepath) +
                "The fields that were required but not present are: {!r}\n".format(missing_required_fieldnames) +
                "field_aliases = {}:\n".format(conf.get_field_aliases()) +
                "Here are all the column names from that file: {!r}\n".format(colnames))
            if colidx_for_field:
                err_message += (
                    "Here are the fields that successfully mapped to columns of the file:\n" +
                    ''.join("- {}: {} (column #{})\n".format(field, colnames[colidx], colidx) for field,colidx in colidx_for_field.items())
                )
            else:
                err_message += "No fields successfully mapped.\n"
            err_message += "You need to modify your input files or set field_aliases in your `config.py`."
            raise PheWebError(err_message)


    @staticmethod
    def parse_marker_id(marker_id):
        match = AssocFileReader.parse_marker_id_regex.match(marker_id)
        if match is None:
            raise PheWebError("ERROR: MARKER_ID didn't match our MARKER_ID pattern: {!r}".format(marker_id))
        chrom, pos, ref, alt = match.groups()
        return chrom, int(pos), ref, alt
    parse_marker_id_regex = re.compile(r'([^:]+):([0-9]+)_([-ATCG\.]+)/([-ATCG\.\*]+)')
