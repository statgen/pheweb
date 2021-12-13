# -*- coding: utf-8 -*-

"""
Command line flags.

Setup for command line flags, and
helper methods.
"""

import argparse
from typing import Dict, Set, Optional

# CONSTANTS

OUTPUT_COLUMN_CHROMOSOME = "#chrom"
OUTPUT_DESCRIPTION_CHROMOSOME = "chromosome"

OUTPUT_COLUMN_POSITION = "pos"
OUTPUT_DESCRIPTION_POSITION = "position"

OUTPUT_COLUMN_REFERENCE = "ref"
OUTPUT_DESCRIPTION_REFERENCE = "reference"

OUTPUT_COLUMN_ALTERNATIVE = "alt"
OUTPUT_DESCRIPTION_ALTERNATIVE = "alternative"

OUTPUT_COLUMN_P_VALUE = "pval"
OUTPUT_DESCRIPTION_P_VALUE = "p-value"

OUTPUT_COLUMN_M_LOG_P_VALUE = "mlogp"
OUTPUT_DESCRIPTION_M_LOG_P = "m log p-value"

OUTPUT_COLUMN_BETA = "beta"
OUTPUT_DESCRIPTION_BETA = "beta"

OUTPUT_COLUMN_SE_BETA = "sebeta"
OUTPUT_DESCRIPTION_SE_BETA = "sebeta"


DEFAULT_EXCLUDE = ""
DEFAULT_RENAME = ""
DEFAULT_IN_FILE = "-"
DEFAULT_OUT_FILE = "-"

# FLAGS
FLAG_CHROMOSOME = "--chrom"
FLAG_POSITION = "--pos"
FLAG_REFERENCE = "--ref"
FLAG_ALTERNATIVE = "--alt"
FLAG_P_VALUE = "--pval"
FLAG_M_LOG_P_VALUE = "--mlogp"
FLAG_BETA = "--beta"
FLAG_SE_BETA = "--se_beta"
FLAG_EXCLUDE = "--exclude"
FLAG_RENAME = "--rename"
FLAG_OUT_FILE = "--out-file"


# METHODS
def add_chromosome_flag(parser: argparse.ArgumentParser) -> None:
    """
    Add chromosome flag.

    Add the chromosome flag to the supplied
    parser.

    @param parser: parse to add to
    @return: None
    """
    parser.add_argument(
        FLAG_CHROMOSOME,
        dest="chromosome",
        default=OUTPUT_COLUMN_CHROMOSOME,
        action="store",
        type=str,
        help=f"name of chromosome column defaults to '{OUTPUT_COLUMN_CHROMOSOME}'",
    )


def add_position_flag(parser: argparse.ArgumentParser) -> None:
    """
    Add position flag.

    Add the position flag to the supplied parser.

    @param parser: parse to add to
    @return: None
    """
    parser.add_argument(
        FLAG_POSITION,
        dest="position",
        default=OUTPUT_COLUMN_POSITION,
        action="store",
        type=str,
        help=f"name of position column defaults to '{OUTPUT_COLUMN_POSITION}'",
    )


def add_reference_flag(parser: argparse.ArgumentParser) -> None:
    """
    Add reference flag.

    Add the reference flag to the supplied parser.

    @param parser: parse to add to
    @return: None
    """
    parser.add_argument(
        FLAG_REFERENCE,
        dest="reference",
        default=OUTPUT_COLUMN_REFERENCE,
        action="store",
        type=str,
        help=f"name of reference column defaults to '{OUTPUT_COLUMN_REFERENCE}'",
    )


def add_alternate_flag(parser: argparse.ArgumentParser) -> None:
    """
    Add alternate flag.

    Add the alternate flag to the supplied parser.

    @param parser: parse to add to
    @return: None
    """
    parser.add_argument(
        FLAG_ALTERNATIVE,
        dest="alternative",
        default=OUTPUT_COLUMN_ALTERNATIVE,
        action="store",
        type=str,
        help=f"name of alternate column defaults to '{OUTPUT_COLUMN_ALTERNATIVE}'",
    )


def add_p_value_flag(parser: argparse.ArgumentParser) -> None:
    """
    Add p-value flag.

    Add the p-value flag to the supplied parser.

    @param parser: parse to add to
    @return: None
    """
    parser.add_argument(
        FLAG_P_VALUE,
        dest="p_value",
        default=OUTPUT_COLUMN_P_VALUE,
        action="store",
        type=str,
        help=f"name of p-value column  defaults to '{OUTPUT_COLUMN_P_VALUE}'",
    )


def add_m_log_p_value_flag(parser: argparse.ArgumentParser) -> None:
    """
    Add log_m p-value flag.

    Add the log_m p-value flag to the supplied parser.

    @param parser: parse to add to
    @return: None
    """
    parser.add_argument(
        FLAG_M_LOG_P_VALUE,
        dest="m_log_p_value",
        default=OUTPUT_COLUMN_M_LOG_P_VALUE,
        action="store",
        type=str,
        help=f"name of m-logp column defaults to '{OUTPUT_COLUMN_M_LOG_P_VALUE}'",
    )


def add_beta_value_flag(parser: argparse.ArgumentParser) -> None:
    """
    Add beta flag.

    Add the beta flag to the supplied parser.

    @param parser: parse to add to
    @return: None
    """
    parser.add_argument(
        FLAG_BETA,
        dest="beta",
        default=OUTPUT_COLUMN_BETA,
        action="store",
        type=str,
        help=f"name of beta columns column defaults to '{OUTPUT_COLUMN_BETA}'",
    )


def add_se_beta_value_flag(parser: argparse.ArgumentParser) -> None:
    """
    Add se beta flag.

    Add the se beta flag to the supplied parser.

    @param parser: parse to add to
    @return: None
    """
    parser.add_argument(
        FLAG_SE_BETA,
        dest="se_beta",
        default=OUTPUT_COLUMN_SE_BETA,
        action="store",
        type=str,
        help="name of se beta columns column",
    )


def add_exclude_value_flag(parser: argparse.ArgumentParser) -> None:
    """
    Add exclude flag.

    Add the exclude flag to the supplied parser.

    @param parser: parse to add to
    @return: None
    """
    parser.add_argument(
        FLAG_EXCLUDE,
        dest="exclude",
        default=DEFAULT_EXCLUDE,
        action="store",
        type=str,
        help="rename fields format is field_1,... ",
    )


def add_rename_value_flag(parser: argparse.ArgumentParser) -> None:
    """
    Add rename flag.

    Add rename flag to the supplied parser.

    @param parser: parse to add to
    @return: None
    """
    parser.add_argument(
        FLAG_RENAME,
        dest="rename",
        default=DEFAULT_RENAME,
        action="store",
        type=str,
        help="rename fields format is old_name:new_name,... ",
    )


def add_out_file_value_flag(parser: argparse.ArgumentParser) -> None:
    """
    Add out file flag.

    Add out file flag to the supplied parser.

    @param parser: parse to add to
    @return: None
    """
    parser.add_argument(
        FLAG_OUT_FILE,
        dest="out_file",
        default=DEFAULT_OUT_FILE,
        action="store",
        type=str,
        help=f"out file, defaults to stdout '{DEFAULT_OUT_FILE}'",
    )


def add_in_file_value_flag(parser: argparse.ArgumentParser) -> None:
    """
    Add in file flag.

    Add in file flag to the supplied parser.

    @param parser: parse to add to
    @return: None
    """
    parser.add_argument(
        "in_file",
        nargs="?",
        default=DEFAULT_IN_FILE,
        help=f"in_file to be formatted, defaults to '{DEFAULT_IN_FILE}'",
    )


def parse_exclude_args(exclude: str) -> Set[str]:
    """
    Parse exclude args.

    Parse exclude args from a comma separated list of fields to a set.

    @param exclude: comma separated list
    @return: set containing fields to exclude
    """
    exclude_set: Set[str] = set()
    if exclude:
        exclude_set.update(exclude.split(","))
    return exclude_set


def parse_rename_args(rename: Optional[str]) -> Dict[str, str]:
    """
    Parse rename args.

    Parse rename args taking a comma separated list of:

    OLD_NAME:NEW_NAME,...

    Method raises an exception if string is malformed.

    @param rename: comma separated list name mapping
    @return: dictionary containing the mapping
    """
    rename_map: Dict[str, str] = {}
    if rename is not None and rename:
        for columns in rename.split(","):
            if ":" in columns:
                old_name, new_name = columns.split(":")
                rename_map[old_name] = new_name
            else:
                raise ValueError(f'could not find separator ":" in "{columns}"')
    return rename_map
