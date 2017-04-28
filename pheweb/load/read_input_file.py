
from ..utils import conf, chrom_order, chrom_order_list, die, approx_equal
from .load_utils import open_maybe_gzip, get_maf

import itertools
import re
import boltons.iterutils




class PhenoReader:
    '''
    Reads variants (in order) and other info for a phenotype.
    It only returns variants that have a pvalue.
    If `only_cpra`, it only returns the fields [chrom pos ref alt].
    If `minimum_maf` is defined, variants that don't meet that threshold (via MAF, AF, or AC/NS) are dropped.
    '''

    def __init__(self, pheno, minimum_maf=None, keep_chrom_idx=False, only_cpra=False):
        self._pheno = pheno
        self._only_cpra = only_cpra
        self._minimum_maf = minimum_maf
        self._keep_chrom_idx = keep_chrom_idx
        self.fields, self.fnames = self._get_fields_and_fnames(pheno['assoc_files'])

    def get_variants(self):
        yield from self._order_refalt_lexicographically(
            itertools.chain.from_iterable(
                AssocFileReader(fname, self._pheno).get_variants(only_cpra=self._only_cpra) for fname in self.fnames))

    def get_info(self):
        infos = [AssocFileReader(fname, self._pheno).get_info() for fname in self.fnames]
        assert boltons.iterutils.same(infos)
        return infos[0]

    def _order_refalt_lexicographically(self, variants):
        # Also assert that chrom and pos are in order
        cp_groups = itertools.groupby(variants, key=lambda v:(v['chrom'], v['pos']))
        prev_chrom_index, prev_pos = -1, -1
        for cp, tied_variants in cp_groups:
            chrom_index = self._get_chrom_index(cp[0])
            if chrom_index < prev_chrom_index:
                print("The chromosomes in your file appear to be in the wrong order.")
                print("The required order is: {!r}".format(chrom_order_list))
                print("But in your file, the chromosome {!r} came after the chromosome {!r}".format(
                    cp[0], chrom_order_list[prev_chrom_index]))
                raise Exception()
            if chrom_index == prev_chrom_index and cp[1] < prev_pos:
                print("The positions in your file appear to be in the wrong order.")
                print("In your file, the position {!r} came after the position {!r} on chromsome {!r}".format(
                    cp[1], prev_pos, cp[0]))
                raise Exception()
            prev_chrom_index, prev_pos = chrom_index, cp[1]
            for v in sorted(tied_variants, key=lambda v:(v['ref'], v['alt'])):
                if self._keep_chrom_idx:
                    v['chrom_idx'] = chrom_index
                yield v

    def _get_fields_and_fnames(self, fnames):
        # also sets `self._fields`
        assoc_files = [{'fname': fname} for fname in fnames]
        for assoc_file in assoc_files:
            ar = AssocFileReader(assoc_file['fname'], self._pheno)
            v = next(ar.get_variants(only_cpra=self._only_cpra))
            assoc_file['chrom'], assoc_file['pos'] = v['chrom'], v['pos']
            assoc_file['fields'] = list(v)
        assert boltons.iterutils.same(af['fields'] for af in assoc_files)
        assoc_files = sorted(assoc_files, key=self._variant_chrpos_order_key)
        return (
            assoc_files[0]['fields'],
            [assoc_file['fname'] for assoc_file in assoc_files]
        )

    @staticmethod
    def _variant_chrpos_order_key(v):
        return (PhenoReader._get_chrom_index(v['chrom']), v['pos'])
    @staticmethod
    def _get_chrom_index(chrom):
        try:
            return chrom_order[chrom]
        except KeyError:
            print("\nIt looks like one of your variants has the chromosome {!r}, but PheWeb doesn't handle that chromosome.".format(chrom))
            print("I bet you could fix it by running code like this on each of your input files:")
            print("zless my-input-file.tsv | perl -nale 'print if $. == 1 or m{^(1?[0-9]|2[0-2]|X|Y|MT?)\t}' | gzip > my-replacement-input-file.tsv.gz\n")
            raise Exception()


class AssocFileReader:
    '''Has no concern for ordering, only in charge of parsing one associations file.'''
    # TODO: use `pandas.read_csv(src_filename, usecols=[...], converters={...}, iterator=True, verbose=True, na_values='.', sep=None)
    #   - first without `usecols`, to parse the column names, and then a second time with `usecols`.

    def __init__(self, fname, pheno):
        self.fname = fname
        self._pheno = pheno

    def get_variants(self, minimum_maf=None, only_cpra=False):

        fields_to_check = {fieldname: fieldval for fieldname,fieldval in itertools.chain(conf.parse.per_variant_fields.items(), conf.parse.per_assoc_fields.items()) if fieldval['from_assoc_files']}
        if only_cpra:
            fields_to_check = {k:v for k,v in fields_to_check.items() if k in ['chrom', 'pos', 'ref', 'alt', 'pval']}

        with open_maybe_gzip(self.fname, 'rt') as f:

            colnames = [colname.strip('"\' ').lower() for colname in next(f).rstrip('\n\r').split('\t')]
            colidx_for_field = self._parse_header(colnames, fields_to_check)
            # Special case for `MARKER_ID`
            if 'marker_id' not in colnames:
                marker_id_col = None
            else:
                marker_id_col = colnames.index('marker_id')
                colidx_for_field['ref'] = None # This is just to mark that we have 'ref', but it doesn't come from a column.
                colidx_for_field['alt'] = None
                # TODO: this sort of provides a mapping for chrom and pos, but those are usually doubled anyways.
                # TODO: maybe we should allow multiple columns to map to each key, and then just assert that they all agree.
            self._assert_all_fields_mapped(colnames, fields_to_check, colidx_for_field)

            for line in f:
                values = line.rstrip('\n\r').split('\t')
                variant = self._parse_variant(values, colnames, colidx_for_field)

                if variant['pval'] == '': continue
                if only_cpra:
                    del variant['pval']

                if 'maf' in variant and 'af' in variant:
                    af = variant['af']
                    maf2 = af if af<0.5 else 1 - af
                    if not approx_equal(maf2, variant['maf']):
                        print("You have both AF ({!r}) and MAF ({!r}), but they're different.".format(af, variant['maf']))

                if minimum_maf is not None:
                    maf = get_maf(variant, self._pheno)
                    if maf < minimum_maf:
                        continue

                if marker_id_col is not None:
                    chrom2, pos2, variant['ref'], variant['alt'] = AssocFileReader.parse_marker_id(values[marker_id_col])
                    assert variant['chrom'] == chrom2, (values, variant, chrom2)
                    assert variant['pos'] == pos2, (values, variant, pos2)

                yield variant

    def get_info(self):
        infos = self._get_infos()
        first_info = next(infos)
        for info in infos:
            if info != first_info:
                die("The pheno info parsed from some lines disagrees.\n" +
                          "- in the file {}".format(self.fname) +
                          "- parsed from first line:\n    {}".format(first_info) +
                          "- parsed from a later line:\n    {}".format(info))
        return first_info

    def _get_infos(self, limit=1000):
        # return the per-pheno info for each of the first `limit` variants
        fields_to_check = conf.parse.per_pheno_fields
        with open_maybe_gzip(self.fname, 'rt') as f:
            colnames = [colname.strip('"\' ').lower() for colname in next(f).rstrip('\n\r').split('\t')]
            colidx_for_field = self._parse_header(colnames, fields_to_check)
            self._assert_all_fields_mapped(colnames, fields_to_check, colidx_for_field)
            for linenum, line in enumerate(itertools.islice(f, 0, limit)):
                values = line.rstrip('\n\r').split('\t')
                variant = self._parse_variant(values, colnames, colidx_for_field)
                # Check that num_cases + num_controls == num_samples
                if all(key in variant for key in ['num_cases', 'num_controls', 'num_samples']):
                    if variant['num_cases'] + variant['num_controls'] != variant['num_samples']:
                        die("The number of cases and controls don't add up to the number of samples on one line in one of your association files.\n" +
                            "- the filename: {!r}\n".format(self.fname) +
                            "- the line number: {}".format(linenum+1) +
                            "- parsed line: [{!r}]\n".format(line))
                    del variant['num_samples'] # don't need it.
                yield variant


    def _parse_variant(self, values, colnames, colidx_for_field):
        # `values`: [str]

        if len(values) != len(colnames):
            print("ERROR: A line has {!r} values, but we expected {!r}.".format(len(values), len(colnames)))
            repr_values = repr(values)
            if len(repr_values) > 5000: repr_values = repr_values[:200] + ' ... ' + repr_values[-200:] # sometimes we get VERY long strings of nulls.
            print("- The line: {}".format(repr_values))
            print("- The header: {!r}".format(colnames))
            print("- In file: {!r}".format(self.fname))
            raise Exception()

        variant = {}
        for field, colidx in colidx_for_field.items():
            if colidx is not None:
                parse = conf.parse.fields[field]['_parse']
                value = values[colidx]
                try:
                    variant[field] = parse(value)
                except Exception as exc:
                    raise Exception("failed on field {!r} attempting to convert value {!r} to type {!r} with constraints {!r} in {!r} on line with values {!r}".format(
                        field, values[colidx], conf.parse.fields[field]['type'], conf.parse.fields[field], self.fname, values)) from exc

        return variant

    def _parse_header(self, colnames, possible_fields):
        colidx_for_field = {} # which column (by number, not name) holds the value for the field (the key)

        for field in possible_fields:
            for field_alias in possible_fields[field]['aliases']:
                if field_alias in colnames:
                    # Check that we haven't already mapped this field to a header column.
                    if field in colidx_for_field:
                        print("Wait, what?  We found two different ways of mapping the field {!r} to the columns {!r}.".format(field, colnames))
                        print("For reference, the field {!r} can come from columns by any of these aliases: {!r}.".format(
                            field, possible_fields[field]['aliases']))
                        print("File:", self.fname)
                        raise Exception()
                    colidx_for_field[field] = colnames.index(field_alias)
        return colidx_for_field

    def _assert_all_fields_mapped(self, colnames, possible_fields, colidx_for_field):
        required_fields = [field for field in possible_fields if possible_fields[field].get('required', False)]
        missing_required_fields = [field for field in required_fields if field not in colidx_for_field]
        if missing_required_fields:
            print("Some required fields weren't successfully mapped to the columns of an input file.")
            print("The file is {!r}.".format(self.fname))
            print("The fields that were required but not present are: {!r}".format(missing_required_fields))
            print("Their accepted aliases are:")
            for field in missing_required_fields:
                print("- {}: {!r}".format(field, possible_fields[field]['aliases']))
            print("Here are all the columns that WERE present: {!r}".format(colnames))
            raise Exception()

    @staticmethod
    def parse_marker_id(marker_id):
        match = AssocFileReader.parse_marker_id_regex.match(marker_id)
        if match is None:
            raise Exception("ERROR: MARKER_ID didn't match our MARKER_ID pattern: {!r}".format(marker_id))
        chrom, pos, ref, alt = match.groups()
        return chrom, int(pos), ref, alt
    parse_marker_id_regex = re.compile(r'([^:]+):([0-9]+)_([-ATCG\.]+)/([-ATCG\.]+)')
