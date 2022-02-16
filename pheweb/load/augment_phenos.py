#!/usr/bin/env python3
import click
from pheweb.utils import PheWebError
from pheweb.file_utils import VariantFileReader, VariantFileWriter, common_filepaths, with_chrom_idx
from pheweb.load.load_utils import parallelize_per_pheno

def run(argv):

    parallelize_per_pheno(
        get_input_filepaths = lambda pheno: [common_filepaths['parsed'](pheno['phenocode']), sites_filepath],
        get_output_filepaths = lambda pheno: common_filepaths['pheno'](pheno['phenocode']),
        convert = convert_phenotype,
        cmd = 'augment-pheno',
    )

@click.group()
def cli():
    pass

@cli.command()
@click.argument('phenotype')
def convert_phenotype(pheno):
    sites_filepath = common_filepaths['sites']
    input_filepath = common_filepaths['parsed'](pheno['phenocode'])
    output_filepath = common_filepaths['pheno'](pheno['phenocode'])
    convert_files(sites_filepath, input_filepath, output_filepath)

@cli.command()
@click.argument('sites-filepath', type=click.Path(exists=True))
@click.argument('input-filepath', type=click.Path(exists=True))
@click.argument('output-filepath')
def convert_files(sites_filepath, input_filepath, output_filepath):
    with VariantFileReader(sites_filepath) as sites_reader, \
         VariantFileReader(input_filepath) as pheno_reader, \
         VariantFileWriter(output_filepath, allow_extra_fields=True) as writer:
        sites_variants = with_chrom_idx(iter(sites_reader))
        pheno_variants = with_chrom_idx(iter(pheno_reader))

        def write_variant(writer_sites_variant, writer_pheno_variant):
            writer_sites_variant.update(writer_pheno_variant)
            writer.write(writer_sites_variant)

        try: pheno_variant = next(pheno_variants)
        except StopIteration:
            raise PheWebError(f"It appears that the phenotype {pheno['phenocode']} has no variants.")
        try: sites_variant = next(sites_variants)
        except StopIteration:
            raise PheWebError(f"It appears that your sites file (at {sites_filepath}) has no variants.")

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
    '''1 means v1 is bigger.
       2 means v2 is bigger.
       0 means tie.'''
    if v1['chrom_idx'] == v2['chrom_idx']:
        if v1['pos'] == v2['pos']:
            if v1['ref'] == v2['ref']:
                if v1['alt'] == v2['alt']:
                    return 0
                return 1 if v1['alt'] > v2['alt'] else 2
            return 1 if v1['ref'] > v2['ref'] else 2
        return 1 if v1['pos'] > v2['pos'] else 2
    return 1 if v1['chrom_idx'] > v2['chrom_idx'] else 2

if __name__ == '__main__':
    cli()
