"""
Display (and eventually generate) a set of correlated phenotypes as generated from an external pipeline

This information will be shown on phenotype summary pages. This is an OPTIONAL feature-
    if information is not available, it will usually skip this step without failure.
"""
import logging
import os
from boltons.fileutils import AtomicSaver
from typing import List,Optional

from .. import conf
from ..file_utils import get_filepath, get_tmp_path
from ..utils import get_phenolist, PheWebError
from .. import weetabix


logger = logging.getLogger(__name__)


def run(argv:List[str]) -> None:
    """Wrap this feature in a command line flag"""
    if argv and argv[0] == '-h':
        print('Generate phenotype correlations data for use in pheweb plots')
        exit(1)

    raw_correl_filepath = get_filepath('correlations-raw', must_exist=False)
    annotated_correl_filepath = get_filepath('correlations', must_exist=False)

    if not os.path.isfile(raw_correl_filepath):
        logger.info('No "pheno-correlations.txt" file was found; processing step cannot be completed.')
        if conf.should_show_correlations():
            # This is an optional feature, so don't fail unless config file specifies to do so
            raise PheWebError(
                'You have requested phenotype correlations, but the required input file could not be found: {}'.format(
                    raw_correl_filepath
                )
            )
        return
    main(raw_correl_filepath, annotated_correl_filepath)


def main(raw_filepath:str, annotated_filepath:str, phenolist_path:Optional[str] = None) -> None:
    """Process a correlations file in the format required for display"""
    symmetric_filepath = get_tmp_path('pheno-correlations-symmetric.tsv')
    make_symmetric(raw_filepath, symmetric_filepath)
    annotate_trait_descriptions(symmetric_filepath, annotated_filepath, phenolist_path=phenolist_path)
    weetabix.make_byte_index(annotated_filepath, 1, skip_lines=1, delimiter='\t')


def make_symmetric(in_filepath:str, out_filepath:str) -> None:
    '''
    The output of pheweb-rg-pipeline includes the line
        traitA traitB 0.4 0.1 2 1e-3 ldsc
    but it omits the line
        traitB traitA 0.4 0.1 2 1e-3 ldsc
    so this function adds that second line for the symmetric position in the correlation matrix.
    If the file already has both directions for some or all pairs of traits, that's okay.
    '''
    expected_colnames = ['Trait1','Trait2','rg','SE','Z','P-value','Method']
    trait_pairs_seen = set()
    with open(in_filepath) as in_f:
        header = next(in_f)
        assert header.rstrip().split('\t') == expected_colnames
        correlations = []
        for line in in_f:
            trait1, trait2, rest_of_line = line.split('\t', maxsplit=2)
            trait_pairs_seen.add((trait1, trait2))
            correlations.append((trait1, trait2, rest_of_line))

    for trait1, trait2, rest_of_line in correlations:
        if (trait2, trait1) not in trait_pairs_seen:
            correlations.append((trait2, trait1, rest_of_line))

    correlations.sort()

    with AtomicSaver(out_filepath, text_mode=True, part_file=get_tmp_path(out_filepath), overwrite_part=True) as out_f:
        out_f.write(header)
        for trait1, trait2, rest_of_line in correlations:
            out_f.write(trait1 + '\t' + trait2 + '\t' + rest_of_line)


def annotate_trait_descriptions(in_filepath:str, out_filepath:str, phenolist_path:Optional[str] = None) -> None:
    """
    Annotate a phenotype correlation file with an additional "Trait2Label" description (where possible)
    FIXME: This makes simplistic assumptions about file format/contents, and performs no validation
    """
    # Initial file format spec (per SarahGT) is a tab-delimited format:
    #   Trait1  Trait2  rg  SE  Z  P-value  Method

    pheno_labels = {pheno['phenocode']: pheno.get('phenostring', pheno['phenocode'])
                    for pheno in get_phenolist(filepath=phenolist_path)}

    with open(in_filepath, 'r') as in_f, AtomicSaver(out_filepath, text_mode=True, part_file=get_tmp_path(out_filepath), overwrite_part=True) as out_f:

        headers = in_f.readline().strip()
        out_f.write(headers + '\tTrait2Label\n')

        for line in in_f:
            line = line.strip()
            trait1_code, trait2_code, _ = line.split('\t', maxsplit=2)
            if trait2_code not in pheno_labels:
                logger.warning('Correlation file specifies an unknown phenocode; value will be skipped: "{}"'.format(
                    trait2_code))
                continue

            out_f.write(line + '\t{}\n'.format(pheno_labels[trait2_code]))
