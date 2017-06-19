
from ..utils import PheWebError
from ..file_utils import VariantFileReader, VariantFileWriter, common_filepaths, with_chrom_idx
from .load_utils import parallelize_per_pheno


sites_filepath = common_filepaths['sites']

def run(argv):
    parallelize_per_pheno(
        get_input_filepaths = lambda pheno: [common_filepaths['parsed'](pheno['phenocode']), sites_filepath],
        get_output_filepaths = lambda pheno: common_filepaths['pheno'](pheno['phenocode']),
        convert = convert,
        cmd = 'augment-pheno',
    )

def convert(pheno):

    with VariantFileReader(sites_filepath) as sites_reader, \
         VariantFileReader(common_filepaths['parsed'](pheno['phenocode'])) as pheno_reader, \
         VariantFileWriter(common_filepaths['pheno'](pheno['phenocode'])) as writer:
        sites_variants = with_chrom_idx(iter(sites_reader))
        pheno_variants = with_chrom_idx(iter(pheno_reader))

        def write_variant(sites_variant, pheno_variant):
            sites_variant.update(pheno_variant)
            writer.write(sites_variant)

        try: pheno_variant = next(pheno_variants)
        except: raise PheWebError("It appears that the phenotype {!r} has no variants.".format(pheno['phenocode']))
        try: sites_variant = next(sites_variants)
        except: raise PheWebError("It appears that your sites file (at {!r}) has no variants.".format(sites_filepath))
        while True:
            cmp = _which_variant_is_bigger(pheno_variant, sites_variant)
            if cmp == 1:
                try: sites_variant = next(sites_variants)
                except StopIteration: break
            elif cmp == 2:
                try: pheno_variant = next(pheno_variants)
                except StopIteration: break
            else: # equal
                # TODO: do I need this?
                del sites_variant['chrom_idx']
                del pheno_variant['chrom_idx']
                write_variant(sites_variant, pheno_variant)
                try:
                    sites_variant = next(sites_variants)
                    pheno_variant = next(pheno_variants)
                except StopIteration: break


def _which_variant_is_bigger(v1, v2):
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
