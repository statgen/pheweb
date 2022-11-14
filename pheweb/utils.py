# -*- coding: utf-8 -*-

"""
Utility functions.

Not all functions seem to belong here.
This file should be reorganized.

"""

import contextlib
import csv
import json
import math
import os
import sys
import urllib.parse

import boltons.mathutils
import smart_open
from scipy import stats


class PheWebError(Exception):
    """Pheweb error.

    Implies that an exception is being handled by PheWeb,
    so its message should just be printed.
    """


def round_sig(value: float, digits: int) -> float:
    """
    Round to the provided significant digits.

    @param value: value
    @param digits:  digits to round to
    @return: float
    """
    if value == 0:
        result = 0
    elif abs(value) == math.inf or math.isnan(value):
        raise ValueError("Cannot round infinity or NaN")
    else:
        log = math.log10(abs(value))
        digits_above_zero = int(math.floor(log))
        result = round(value, digits - 1 - digits_above_zero)
    return result


def approx_equal(a_value: float, b_value: float, tolerance: float = 1e-4) -> float:
    """
    Approximate equality.

    Checks if values are within a given tolerance
    of each other.

    @param a_value: a value
    @param b_value: b value
    @param tolerance:
    @return: boolean indicating values are with in given radius
    """
    return abs(a_value - b_value) <= max(abs(a_value), abs(b_value)) * tolerance


def get_phenolist():
    """
    Get phenotype list.

    @return: list of phenotypes.
    """
    # TODO: should this be memoized?
    from .file_utils import common_filepaths

    filepath = common_filepaths["phenolist"]
    try:
        with open(os.path.join(filepath), encoding="utf-8") as file:
            phenotype_list = json.load(file)
    except (FileNotFoundError, PermissionError) as exception:
        raise PheWebError(
            f"""You need a file to define your phenotypes at '{filepath}'
                For more information on how to make one, see
                <https://github.com/statgen/pheweb#3-make-a-list-of-your-phenotypes>"""
        ) from exception
    except json.JSONDecodeError:
        print(
            f"""Your file at '{filepath}' contains invalid json.
                  The error it produced was:"""
        )
        raise
    for phenotype in phenotype_list:
        phenotype["phenocode"] = urllib.parse.quote_plus(phenotype["phenocode"])
    return phenotype_list


def get_use_phenos():
    """
    Get used phenotypes.

    @return: list of phenotypes.
    """
    from .file_utils import common_filepaths

    filepath = common_filepaths["use_phenos"]
    try:
        with open(os.path.join(filepath), encoding="utf-8") as file:
            phenotype_list = [
                pheno.strip()
                for pheno in file.readlines()
                if pheno != "" and not pheno.startswith("#")
            ]
            print(f"using {str(len(phenotype_list))} phenotypes from {filepath}")
    except FileNotFoundError:
        print(f" {filepath} not found, using all phenotypes")
        phenotype_list = [pheno["phenocode"] for pheno in get_phenolist()]
    except PermissionError as error:
        raise PheWebError(f" {filepath} could not be read") from error
    return phenotype_list


def pad_gene(start, end):
    """
    Pad gene.

    @param start: start of range
    @param end: end of range
    @return: tuple representing range
    """
    # We'd like to get 100kb on each side of the gene.
    # But max-region-length is 500kb, so let's try not to exceed that.
    # Maybe this should only go down to 1 instead of 0. That's confusing,
    # let's just hope this works.
    if start < 1e5:
        if end > 5e5:
            return 0, end
        if end > 4e5:
            return 0, 5e5
        return 0, end + 1e5
    padding = boltons.mathutils.clamp(5e5 - (end - start), 0, 2e5)
    return int(start - padding // 2), int(end + padding // 2)


# CONSTANTS
def get_gene_tuples(genes_filepath=None, include_ensg=False):
    """
    Get gene tuples.

    Very unsure what this is about.

    @param include_ensg:
    @return: 4-tuple
    """
    from .file_utils import common_filepaths
    if genes_filepath is None:
        genes_filepath=common_filepaths["genes"]
    print(genes_filepath)
    with open(genes_filepath, encoding="utf-8") as file:
        for row in csv.reader(file, delimiter="\t"):
            assert row[0] in chrom_order, row[0]
            if include_ensg:
                yield row[0], int(row[1]), int(row[2]), row[3], row[4]
            else:
                yield row[0], int(row[1]), int(row[2]), row[3]


chrom_order_list = [str(i) for i in range(1, 22 + 1)] + ["X", "Y", "MT"]
chrom_order = {chromosome: index for index, chromosome in enumerate(chrom_order_list)}
chrom_order["23"] = 22
chrom_order["24"] = 23
chrom_order["25"] = 24

chrom_aliases = {"23": "X", "24": "Y", "25": "MT", "M": "MT"}
CHROMOSOME_NORMAL = {"X": "23", "Y": "24", "M": "25", "MT": "25"}


def parse_chromosome(value: str) -> int:
    """
    Parse chromosome.

    Given a string representing a chromosome return
    an integer representing the chromosome.

    This throws a value error if an invalid string is
    supplied.

    @param value: string representing chromosome
    @return: integer 1 <= x <= 25
    """
    try:
        normal = value.strip()
        normal = CHROMOSOME_NORMAL.get(normal, normal)
        chromosome_number = int(normal)

        if 1 <= chromosome_number <= 25:
            result = chromosome_number
        else:
            raise ValueError(f"invalid chromosome '{value}'")
    except ValueError as value_error:
        msg = f"invalid chromosome expected number '{value}' : {value_error}"
        raise ValueError(msg) from value_error
    return result


# Sentinel to default to if zero is
# supplied as an argument to m log p-value
M_LOG_P_SENTINEL: float = 324


def pvalue_to_mlogp(p_value: float) -> float:
    """

    Calculate the m log of a p-value.

    If zero is supplied the M_LOG_P_SENTINEL is
    returned.  This special case if p-value is
    zero as it could be a tiny number that gets
    rounded to zero the ui interprets this as
    m log p >> 324
    this is problematic and should be
    addressed.

    @param p_value: p-value to be converted
    @return: m log p-value or sentinel is zero is supplied
    """
    if p_value == 0.0:
        m_log_p_value = M_LOG_P_SENTINEL
    else:
        m_log_p_value = -math.log10(p_value)
    return m_log_p_value


def beta_to_m_log_p(beta: float, se_beta: float) -> float:
    """
    Compute m log p from betas.

    @param beta: beta values
    @param se_beta: se beta value
    @return: computed m log p-value
    """
    if se_beta == 0:
        raise ValueError(f"m log p-value value undefined {beta} {se_beta}")
    return abs((stats.norm.logsf(abs(beta) / se_beta) + math.log(2)) / math.log(10))


@contextlib.contextmanager
def file_open(filename: str, mode: str = "Ur"):
    """
    Smart open a path.

    if the path is '-' read/write stdin/stdout
    if the path ends with '.gz' use compression
    otherwise just read/write as a file, gs://
    files can be supplied.

    usage:

        with smart_open('some_file') as file_handle:
            print('some output', file=file_handle)


    see : https://stackoverflow.com/questions/1744989/read-from-file-or-stdin

    @param filename: path to read
    @param mode: mode to open file
    @return: context with file handle
    """
    if filename == "-":
        file_handle = std_file_handler(mode)
    else:
        file_handle = smart_open.open(filename, mode)
    try:
        yield file_handle
    finally:
        if filename != "-":
            file_handle.close()


def std_file_handler(mode: str):
    """
    Return std in or out based on the mode.

    Returns stdin if read or none supplied
    otherwise supply stdout of write

    @param mode: string indicating mode
    @return: file handle
    """
    if mode is None or mode == "" or "r" in mode:
        file_handle = sys.stdin
    else:
        file_handle = sys.stdout
    return file_handle
