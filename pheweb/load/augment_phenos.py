import logging
import sys
from pheweb.utils import PheWebError
from pheweb.file_utils import VariantFileReader, VariantFileWriter, common_filepaths, with_chrom_idx
from pheweb.load.load_utils import parallelize_per_pheno

root = logging.getLogger()
root.setLevel(logging.DEBUG)



def run(argv):
    sites_filepath = common_filepaths['sites']
    parallelize_per_pheno(
        get_input_filepaths = lambda pheno: [common_filepaths['parsed'](pheno['phenocode']), sites_filepath],
        get_output_filepaths = lambda pheno: common_filepaths['pheno'](pheno['phenocode']),
        convert = convert,
        cmd = 'augment-pheno',
    )

def convert(pheno):
    sites_filepath = common_filepaths['sites']
    pheno_inpath = common_filepaths['parsed'](pheno['phenocode'])
    pheno_outpath = common_filepaths['pheno'](pheno['phenocode'])
    convert_file(sites_filepath, pheno_inpath, pheno_outpath)


def convert_file(sites_filepath, in_filepath, out_filepath, ):
    logging.info(f'sites_filepath :   {sites_filepath}')
    logging.info(f'in_filepath :      {in_filepath}')
    logging.info(f'out_filepath :     {out_filepath}')
    with VariantFileReader(sites_filepath) as sites_reader, \
         VariantFileReader(in_filepath) as pheno_reader, \
         VariantFileWriter(out_filepath, allow_extra_fields=True) as writer:
        sites_variants = with_chrom_idx(iter(sites_reader))
        pheno_variants = with_chrom_idx(iter(pheno_reader))

        def write_variant(sites_variant, pheno_variant):
            sites_variant.update(pheno_variant)
            writer.write(sites_variant)

        try: pheno_variant = next(pheno_variants)
        except StopIteration: raise PheWebError("It appears that the phenotype {!r} has no variants.".format(pheno['phenocode']))
        try: sites_variant = next(sites_variants)
        except StopIteration: raise PheWebError("It appears that your sites file (at {!r}) has no variants.".format(sites_filepath))
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


USAGE = f"""
         {sys.argv[0]} <sites_filepath> <pheno_inpath> <pheno_outpath>
         sites_filepath : e.g. sites/sites.tsv
         pheno_inpath   : e.g. generated-by-pheweb/parsed/pheno
                          cat summary_file | zcat | sed '1 s/^#chrom/chrom/'
         pheno_outpath  : generated-by-pheweb/pheno/pheno
        """

if __name__ == "__main__":

    if len(sys.argv) == 4:
        [sites_filepath, pheno_inpath, pheno_outpath] = sys.argv[1:]
        convert_file(sites_filepath, pheno_inpath, pheno_outpath)
    else:
        logging.error(USAGE)
