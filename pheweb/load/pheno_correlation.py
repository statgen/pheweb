"""
Display (and eventually generate) a set of correlated phenotypes as generated from an external pipeline

This information will be shown on phenotype summary pages. This is an OPTIONAL feature-
    if information is not available, it will usually skip this step without failure.
"""
import logging
import os

from ..conf_utils import conf
from ..file_utils import common_filepaths
from ..utils import get_phenolist, PheWebError
from .. import weetabix


logger = logging.getLogger(__name__)


def run(argv):
    """Wrap this feature in a command line flag"""
    if argv and argv[0] == '-h':
        print('Generate phenotype correlations data for use in pheweb plots')
        exit(1)

    raw_correl_fn = common_filepaths['correlations-raw']
    annotated_correl_fn = common_filepaths['correlations']

    if not os.path.isfile(raw_correl_fn):
        logger.info('No "pheno-correlations.txt" file was found; processing step cannot be completed.')
        if conf.show_correlations:
            # This is an optional feature, so don't fail unless config file specifies to do so
            raise PheWebError(
                'You have requested phenotype correlations, but the required input file could not be found: {}'.format(
                    raw_correl_fn
                )
            )
        return
    main(raw_correl_fn, annotated_correl_fn)


def annotate_trait_descriptions(in_fn, out_fn, phenolist_path=None):
    """
    Annotate a phenotype correlation file with an additional "Trait2Label" description (where possible)
    FIXME: This makes simplistic assumptions about file format/contents, and performs no validation
    """
    # Initial file format spec (per SarahGT) is a tab-delimited format:
    #   Trait1  Trait2  rg  SE  Z  P-value  Method

    pheno_labels = {pheno['phenocode']: pheno.get('phenostring', pheno['phenocode'])
                    for pheno in get_phenolist(filepath=phenolist_path)}

    with open(in_fn, 'r') as inp_f, open(out_fn, 'w') as out_f:

        headers = inp_f.readline().strip()
        out_f.write(headers + '\tTrait2Label\n')

        for line in inp_f:
            line = line.strip()
            trait1_code, trait2_code, _ = line.split('\t', maxsplit=2)
            if trait2_code not in pheno_labels:
                logger.warning('Correlation file specifies an unknown phenocode; value will be skipped: "{}"'.format(
                    trait2_code))
                continue

            out_f.write(line + '\t{}\n'.format(pheno_labels[trait2_code]))


def main(raw_filename, annotated_filename, phenolist_path=None):
    """Process a correlations file in the format required for display"""
    annotate_trait_descriptions(raw_filename, annotated_filename, phenolist_path=phenolist_path)
    weetabix.make_byte_index(annotated_filename, 1, skip_lines=1, delimiter='\t')
