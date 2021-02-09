
from ..utils import PheWebError
from ..file_utils import VariantFileReader, VariantFileWriter, get_filepath, get_pheno_filepath, with_chrom_idx, get_tmp_path, convert_VariantFile_to_IndexedVariantFile
from .load_utils import parallelize_per_pheno, get_phenos_subset, get_phenolist

import argparse, os
from typing import List,Dict,Any

def run(argv:List[str]) -> None:
    parser = argparse.ArgumentParser(description="annotate each phenotype by pulling in information from the combined sites file")
    parser.add_argument('--phenos', help="Can be like '4,5,6,12' or '4-6,12' to run on only the phenos at those positions (0-indexed) in pheno-list.json (and only if they need to run)")
    args = parser.parse_args(argv)

    phenos = get_phenos_subset(args.phenos) if args.phenos else get_phenolist()

    parallelize_per_pheno(
        get_input_filepaths = lambda pheno: get_pheno_filepath('parsed', pheno['phenocode']),
        get_output_filepaths = lambda pheno: get_pheno_filepath('pheno_gz_tbi', pheno['phenocode'], must_exist=False),  # Check that tbi exists
        convert = convert,
        cmd = 'augment-pheno',
        phenos = phenos,
    )

def convert(pheno:Dict[str,Any]) -> None:

    parsed_filepath = get_pheno_filepath('parsed', pheno['phenocode'])
    sites_filepath = get_filepath('sites')
    out_filepath = get_pheno_filepath('pheno_gz', pheno['phenocode'], must_exist=False)
    pheno_unzipped_filepath = get_tmp_path(out_filepath)


    with VariantFileReader(sites_filepath) as sites_reader, \
         VariantFileReader(get_pheno_filepath('parsed', pheno['phenocode'])) as pheno_reader, \
         VariantFileWriter(pheno_unzipped_filepath, use_gzip=False) as writer:
        sites_variants = with_chrom_idx(iter(sites_reader))
        pheno_variants = with_chrom_idx(iter(pheno_reader))

        def write_variant(sites_variant:Dict[str,Any], pheno_variant:Dict[str,Any]) -> None:
            sites_variant.update(pheno_variant)
            del sites_variant['chrom_idx']
            writer.write(sites_variant)

        try: pheno_variant = next(pheno_variants)
        except StopIteration: raise PheWebError("It appears that the phenotype {!r} has no variants.".format(pheno['phenocode']))
        try: sites_variant = next(sites_variants)
        except StopIteration: raise PheWebError("It appears that your sites file (at {!r}) has no variants.".format(sites_filepath))
        while True:
            cmp = _which_variant_is_bigger(pheno_variant, sites_variant)
            # There's three possibilities:
            # + pheno variant is bigger --> advance sites variant.
            # + sites variant is bigger --> something broke.
            # + they're equal --> output, and then advance both. (pheno first and sites second)
            # If pheno runs out of variants, we're done.
            # If sites runs out of variants, something broke.
            if cmp == 1:
                try: sites_variant = next(sites_variants)
                except StopIteration: raise PheWebError("sites.tsv ({}) ran out of variants while {} still had {}".format(sites_filepath, parsed_filepath, pheno_variant))
            elif cmp == 2:
                raise PheWebError(("The pheno file {} contained variant {} which was missing from the sites file {}."
                                   "To avoid needless reloading, PheWeb doesn't check the modification timestamp on sites.tsv, so you might need to rebuild it manually using `pheweb sites && pheweb add-rsids && pheweb add-genes").format(parsed_filepath, pheno_variant, sites_filepath))
            else: # equal
                write_variant(sites_variant, pheno_variant)
                try: pheno_variant = next(pheno_variants)
                except StopIteration: break
                try: sites_variant = next(sites_variants)
                except StopIteration: raise PheWebError("sites.tsv ({}) ran out of variants while {} still had {}".format(sites_filepath, parsed_filepath, pheno_variant))

    convert_VariantFile_to_IndexedVariantFile(pheno_unzipped_filepath, out_filepath)
    os.unlink(pheno_unzipped_filepath)


def _which_variant_is_bigger(v1:Dict[str,Any], v2:Dict[str,Any]) -> int:
    '''1 means v1 is bigger.  2 means v2 is bigger. 0 means tie.'''
    if v1['chrom_idx'] == v2['chrom_idx']:
        if v1['pos'] == v2['pos']:
            if v1['ref'] == v2['ref']:
                if v1['alt'] == v2['alt']:
                    return 0
                return 1 if v1['alt'] > v2['alt'] else 2
            return 1 if v1['ref'] > v2['ref'] else 2
        return 1 if v1['pos'] > v2['pos'] else 2
    return 1 if v1['chrom_idx'] > v2['chrom_idx'] else 2
