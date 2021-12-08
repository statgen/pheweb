#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Format summary file for pheweb.

Tool for formatting a summary file for Pheweb.  Pheweb expects summary file
to be a tsv with the following required columns with their name and header:

* chromosome : #chrom : where chromosome is a number between 1-25
* position : pos : the position is a positive integer
* reference : ref : a string [GATC]+
* alternative : alt : a string [GACT]+
* p-value : pval : float : [0 - 1]
* m-log-p-value : mlogp : float : -inf - sentinel
* beta : beta : float

The fields that follow these columns are free form.

CLI:
Run command to see usage:

    format_summary_file.py -h

Behavior:
The header is validated.  The header validation fails the error is output the
program terminates.  If the header validation succeeds each row is parsed and
validated.  If the row is valid then it is output otherwise print error to stderr.
Print summary of error and valid rows to stderr when done.

"""

import logging
import argparse
import os
import re
import sys
import typing
from dataclasses import dataclass
from typing import Dict, Set, Optional, Sequence
from pheweb.utils import file_open, pvalue_to_mlogp, parse_chromosome, beta_to_m_log_p

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
LOGGER = logging.getLogger(__name__)
# Data classes


@dataclass(repr=True, eq=True, frozen=True)
class Arguments:
    """
    DTO containing the arguments.

    The arguments to the script are packed in this DTO.

    chromosome : chromosome column name
    position: position column name
    reference: reference column name
    alternative: alternative column name
    p_value: p-value column name
    m_log_p_value: m log p value name
    beta: beta column name
    exclude: name of columns to be excluded
    rename: name of columns to be renamed
    in_file: file to read from ('-' means stdin)
    out_file: file to write to ('-' means stdout)

    """

    chromosome: str
    position: str
    reference: str
    alternative: str
    p_value: str
    m_log_p_value: str
    beta: str
    se_beta: str
    exclude: Set[str]
    rename: Dict[str, str]
    in_file: str
    out_file: str


Formatter = Optional[typing.Union[typing.Callable[[int, str], Optional[str]],
                                  typing.Callable[[int, str, str], Optional[str]]]]


@dataclass(repr=True, eq=True, frozen=True)
class Column:
    """
    DTO containing metadata for column.

    index : index to get data for column
    header: header for column
    description : human-readable column description
    formatter : given a column data return data if well formatted
    """

    indices: Sequence[int]
    header: str
    description: str
    # see : https://stackoverflow.com/q/51811024
    formatter: Formatter


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
OUTPUT_DESCRIPTION_M_LOG_P_VALUE = "m log p-value"

OUTPUT_COLUMN_BETA = "beta"
OUTPUT_DESCRIPTION_BETA = "beta"

OUTPUT_COLUMN_SE_BETA = "sebeta"
OUTPUT_DESCRIPTION_SE_BETA = "sebeta"

OUTPUT_FIXED_COLUMNS = [
    OUTPUT_COLUMN_CHROMOSOME,
    OUTPUT_COLUMN_POSITION,
    OUTPUT_COLUMN_REFERENCE,
    OUTPUT_COLUMN_ALTERNATIVE,
    OUTPUT_COLUMN_P_VALUE,
    OUTPUT_COLUMN_M_LOG_P_VALUE,
    OUTPUT_COLUMN_BETA,
    OUTPUT_COLUMN_SE_BETA,
]

M_LOG_P_COLUMN_HEADER = OUTPUT_COLUMN_M_LOG_P_VALUE
M_LOG_P_COLUMN_DESCRIPTION = "m log p-value computed from p-value"

# METHODS


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


def parse_args(argv: Sequence[str]) -> Arguments:
    """
    Parse command args.

    Parse command args and return an argument object.

    @param argv: commandline options
    @return: arguments object
    """
    parser = argparse.ArgumentParser(description="format summary file")
    parser.add_argument(
        "--chrom",
        dest="chromosome",
        default=OUTPUT_COLUMN_CHROMOSOME,
        action="store",
        type=str,
        help="name of chromosome column defaults to first column",
    )

    parser.add_argument(
        "--pos",
        dest="position",
        default=OUTPUT_COLUMN_POSITION,
        action="store",
        type=str,
        help="name of position column defaults to second column",
    )

    parser.add_argument(
        "--ref",
        dest="reference",
        default=OUTPUT_COLUMN_REFERENCE,
        action="store",
        type=str,
        help="name of reference column defaults to third column",
    )

    parser.add_argument(
        "--alt",
        dest="alternative",
        default=OUTPUT_COLUMN_ALTERNATIVE,
        action="store",
        type=str,
        help="name of alternate column defaults to fourth column",
    )

    parser.add_argument(
        "--pval",
        dest="p_value",
        default=OUTPUT_COLUMN_P_VALUE,
        action="store",
        type=str,
        help="name of p-value column  defaults to fifth column",
    )

    parser.add_argument(
        "--mlogp",
        dest="m_log_p_value",
        default=OUTPUT_COLUMN_M_LOG_P_VALUE,
        action="store",
        type=str,
        help="name of m-logp column checks 6 column",
    )

    parser.add_argument(
        "--beta",
        dest="beta",
        default=OUTPUT_COLUMN_BETA,
        action="store",
        type=str,
        help="name of beta columns column",
    )

    parser.add_argument(
        "--se_beta",
        dest="se_beta",
        default=OUTPUT_COLUMN_SE_BETA,
        action="store",
        type=str,
        help="name of se beta columns column",
    )

    parser.add_argument(
        "--exclude",
        dest="exclude",
        default="",
        action="store",
        type=str,
        help="rename fields format is field_1,... ",
    )

    parser.add_argument(
        "--rename",
        dest="rename",
        default="",
        action="store",
        type=str,
        help="rename fields format is old_name:new_name,... ",
    )

    parser.add_argument(
        "--out-file",
        dest="out_file",
        default="-",
        action="store",
        type=str,
        help="out file, defaults to stdout '-'",
    )

    parser.add_argument(
        "in_file", nargs="?", default="-", help="in_file to be formatted"
    )
    parsed = parser.parse_args(argv)
    return Arguments(
        chromosome=parsed.chromosome,
        position=parsed.position,
        reference=parsed.reference,
        alternative=parsed.alternative,
        p_value=parsed.p_value,
        m_log_p_value=parsed.m_log_p_value,
        beta=parsed.beta,
        se_beta=parsed.se_beta,
        exclude=parse_exclude_args(parsed.exclude),
        rename=parse_rename_args(parsed.rename),
        out_file=parsed.out_file,
        in_file=parsed.in_file,
    )


def log_error(msg: str, line_number: typing.Optional[int] = None) -> None:
    """
    Log Error.

    Method for logging errors to ensure uniform summary.

    @param msg: message to be logged
    @param line_number: input file line number
    @return: None
    """
    msg = msg if line_number is None else f"line : {line_number} : {msg}"
    LOGGER.error(msg)


def log_info(msg: str) -> None:
    """
    Log info message.

    Intended usage for displaying configuration and summary information

    @param msg:
    @return: None
    """
    LOGGER.info(msg)


def str_formatter(_: int, value: str) -> Optional[str]:
    """
    Format string.

    A pass through formatter.

    @param _: Ignored
    @param value: value to pass through
    @return: value supplied
    """
    return value


def chromosome_formatter(line_number: int, value: str) -> Optional[str]:
    """
    Format chromosome.

    If valid chromosome format otherwise log error.

    See utils_py:parse_chromosome

    @param line_number: line number
    @param value: value containing chromosome
    @return: formatted chromosome
    """
    result: Optional[str] = None
    try:
        chromosome = value.strip()
        result = str(parse_chromosome(chromosome))
    except ValueError as value_error:
        log_error(
            f'invalid chromosome expected number "{value}" details : {value_error}',
            line_number=line_number,
        )
    return result


def position_formatter(line_number: int, value: str) -> typing.Optional[str]:
    """
    Position formatter.

    Check for valid position and format.

    @param line_number:
    @param value: value
    @return: position if value otherwise None.
    """
    result: Optional[str] = None
    try:
        position = int(value)
        if position >= 0:
            result = str(position)
        else:
            log_error(
                f'position expected positive integer "{value}"', line_number=line_number
            )
    except ValueError as value_error:
        log_error(
            f'position could not be parsed as integer "{value}" details : {value_error}',
            line_number=line_number,
        )
    return result


def parameterized_sequence_formatter(
    column_name: str,
) -> typing.Callable[[int, str], typing.Optional[str]]:
    """
    Parameterize sequence formatter.

    Because both the reference and alternate columns both use the  same
    formatter this allows the column to be added to the error message.

    @param column_name: column name
    @return:  Formatter for column
    """

    def formatter(line_number: int, value: str) -> typing.Optional[str]:
        """
        Validate a sequence.

        @param line_number: line number
        @param value: sequence
        @return: sequence if valid otherwise None
        """
        sequence = value.upper()
        if not re.match(r"^[GCAT]*$", sequence):
            result = None
            log_error(
                f'{column_name} is not a valid sequence "{value}" ',
                line_number=line_number,
            )
        else:
            result = sequence
        return result

    return formatter


def p_value_formatter(line_number: int, value: str) -> typing.Optional[str]:
    """
    P-value formatter.

    Check for valid p-value and format.

    @param line_number: line number
    @param value: string p-value
    @return: p-value if value otherwise None.
    """
    result = None
    try:
        p_value = float(value)
        if 0 <= p_value <= 1:
            result = str(p_value)
        else:
            log_error(
                f'p-value not in expected range "{p_value}"', line_number=line_number
            )
    except ValueError as value_error:
        log_error(
            f'p-value could not be parsed as float "{value}" details : {value_error}',
            line_number=line_number,
        )
    return result


def m_log_from_p_value_formatter(line_number: int, value: str) -> typing.Optional[str]:
    """
    M log p-value from p-value.

    This formatter creates an m log p-value from a p-value column by calculation.

    @param line_number: line number
    @param value: string value
    @return: m log p-value if it can be calculated otherwise None
    """
    result = None
    p_value = p_value_formatter(line_number, value)
    if p_value is not None:
        try:
            p_value_float = float(p_value)
            p_value_float = pvalue_to_mlogp(p_value_float)
            result = str(p_value_float)
        except ValueError as value_error:
            log_error(
                f'p-value for m log could not be parsed as float "{value}" details : {value_error}',
                line_number=line_number,
            )
    return result


def se_beta_formatter(line_number: int, value: str) -> typing.Optional[str]:
    result: Optional[str] = None
    try:
        se_beta = float(value)
        if se_beta >= 0:
            result = str(se_beta)
        else:
            log_error(
                f'position expected positive float "{value}"', line_number=line_number
            )
    except ValueError as value_error:
        log_error(
            f'position could not be parsed as integer "{value}" details : {value_error}',
            line_number=line_number,
        )
    return result


def m_log_from_beta_formatter(line_number: int, beta: str, se_beta: str) -> typing.Optional[str]:
    result = None
    string_beta = parameterized_float_formatter("beta")(line_number, beta)
    string_se_beta: Optional[str] = se_beta_formatter(line_number, se_beta)
    if string_beta is not None and string_se_beta is not None:
        try:
            float_beta = float(string_beta)
            float_se_beta = float(string_se_beta)
            m_log_p_value = beta_to_m_log_p(float_beta, float_se_beta)
            result = str(m_log_p_value)
        except ValueError as value_error:
            log_error(
                f'position could not calculate m log p from beta "{beta}" se beta "{se_beta}" details : {value_error}',
                line_number=line_number,
            )
    return result


def parameterized_float_formatter(
    column_name: str,
) -> typing.Callable[[int, str], typing.Optional[str]]:
    """
    Parameterized float formatter.

    Used to format beta values and m-log p when provided.

    @param column_name: name of column being formatted
    @return: formatter
    """

    def formatter(line_number: int, value: str) -> typing.Optional[str]:
        """
        Float formatter.

        Returns a string representing float if a valid
        float is provided.  Returns None otherwise.

        @param line_number:
        @param value: value to be formatted
        @return: string representing provided float None otherwise
        """
        result = None
        try:
            result = str(float(value))
        except ValueError as value_error:
            log_error(
                f'{column_name} could not be parsed as float "{value}" details : {value_error}',
                line_number=line_number,
            )
        return result

    return formatter


def column_valid(headers: Sequence[str], column: Column) -> typing.Optional[Column]:
    """
    Check is column is valid.

    Check if a column is valid with respect to the given header.
    The only check done is if the column index is in bounds.

    @param headers:  list containing file headers
    @param column: column description object
    @return:  column if valid otherwise None
    """
    if not all(map(lambda index: index < len(headers), column.indices)):
        result = None
        log_error(f"{column.indices} out of bounds header only has {len(headers)}")
    else:
        result = column
    return result


def search_header(
    headers: Sequence[Optional[str]],
    column_name: str,
    default_index: Optional[int] = None,
) -> Optional[int]:
    """
    Search header.

    Search header for a column returning the index.

    @param headers: headers
    @param column_name: name of column
    @param default_index: default to return if not found
    @return: index of column or default in not found
    """
    if column_name is None or column_name not in headers:
        index = default_index
    else:
        index = headers.index(column_name)
    return index


def resolve_index(
    headers: Sequence[Optional[str]], index: Optional[int]
) -> Optional[str]:
    """
    Resolve index.

    Given an index return header at that index.

    @param headers: headers
    @param index: optional index
    @return: header is available.
    """
    if index is None:
        result = None
    else:
        result = headers[index]
    return result


def create_column(headers: Sequence[Optional[str]],
                  column_name: str,
                  description: str,
                  formatter: Formatter) -> typing.Tuple[typing.Sequence[typing.Optional[str]], typing.Optional[Column]]:
    """
    Create column.

    Constructor method for column.

    @param headers: file header
    @param column_name: name of columns
    @param description: description of columns
    @param formatter: column formatter
    @return: Column if column can be created None otherwise
    """
    index = search_header(headers, column_name)
    header = resolve_index(headers, index)
    if header is None or index is None:
        result = None
    else:
        result = Column(indices=[index],
                        header=header,
                        description=description,
                        formatter=formatter)
        headers = list(headers)
        headers[index] = None
    return headers, result


VALUE = typing.TypeVar("VALUE")


def coalesce(
    value: Optional[VALUE], acc: Optional[Sequence[VALUE]]
) -> Optional[Sequence[VALUE]]:
    """
    Coalesce a value into a list.

    If the value or the accumulator are None return.
    Otherwise, return accumulator with value appended.

    @param value: optional value
    @param acc: optional accumulator
    @return: return accumulator+[value] otherwise None
    """
    if acc is None:
        result = None
    elif value is None:
        result = None
    else:
        result = list(acc) + [value]
    return result


def p_value_to_m_log_p_column(column: Column) -> Column:
    """
    Convert a p-value column to m log p-value column.

    For files that don't supply an m log p-value column
    calculate from p-value column.   This is done by taking
    the p-value column and overriding the definition.

    @param column: p-value column
    @return: m log p column
    """
    # sanity check that p-value column was supplied.
    assert column.header == OUTPUT_COLUMN_P_VALUE
    return Column(indices=column.indices,
                  header=M_LOG_P_COLUMN_HEADER,
                  description=M_LOG_P_COLUMN_DESCRIPTION,
                  formatter=m_log_from_p_value_formatter)


def beta_to_m_log_p_column(beta_value_column: Column,
                           se_beta_value_column: Column) -> Column:
    assert beta_value_column.header == OUTPUT_COLUMN_SE_BETA
    assert se_beta_value_column.header == OUTPUT_COLUMN_SE_BETA
    return Column(indices=[*beta_value_column.header,
                           *se_beta_value_column.header],
                  header=M_LOG_P_COLUMN_HEADER,
                  description=M_LOG_P_COLUMN_DESCRIPTION,
                  formatter=m_log_from_beta_formatter)


def exclude_header(
    headers: Sequence[str], exclude: Set[str]
) -> Sequence[Optional[str]]:
    """
    Exclude header.

    Exclude columns from header by changing the entry to None.

    @param headers: headers
    @param exclude: columns to be excluded
    @return: header with columns excluded

    """
    excluded_headers = [None if current in exclude else current for current in headers]
    return excluded_headers


def process_remainder(headers: Sequence[Optional[str]]) -> Sequence[Column]:
    """
    Process remainder.

    Create columns from the remainder of columns.

    @param headers: headers
    @return: columns
    """
    columns = []
    for index, current_header in enumerate(headers):
        if current_header is not None:
            current_column = Column(
                indices=[index],
                header=current_header,
                description=current_header,
                formatter=str_formatter,
            )
            columns.append(current_column)
    return columns


def process_validate_exclude(
    headers: Sequence[str], exclude: Set[str], columns: Optional[Sequence[Column]]
) -> Optional[Sequence[Column]]:
    """
    Validate exclude.

    Check that excluded columns could be found in headers.

    @param headers: input file header
    @param exclude: columns to exclude
    @param columns: partially constructed columns
    @return: None if excluded is malformed otherwise columns
    """
    for column_name in exclude:
        if column_name not in headers:
            log_error(f"excluded column {column_name} not found in header")
            columns = coalesce(None, columns)
    return columns


def process_validate_rename(
    headers: Sequence[Optional[str]],
    rename: Dict[str, str],
    columns: Optional[Sequence[Column]],
) -> Optional[Sequence[Column]]:
    """
    Validate rename arguments.

    * Check they are not pointing to a required column use the flags for those.
    * Check the renaming refers to column that is in the header.

    Note: This is run after columns have bene excluded, so those values should be None.
    Note: This also allows a column name to be repeated.

    @param headers: input file headers
    @param rename: map continuing header names what to remap to.
    @param columns: columns being constructed
    @return: return None if remapping is invalid or column if they are
    """
    # can't map to protected columns have to use flags for that
    # have to map from allowed columns
    for column_name in rename:
        if column_name not in headers:
            log_error(f"renaming source column {column_name} not found in header")
            columns = coalesce(None, columns)
        if column_name in OUTPUT_FIXED_COLUMNS:
            log_error(f"mapped column {column_name} not found in header")
    return columns


def headers_to_columns(
    arguments: Arguments, headers: Sequence[str]
) -> typing.Optional[Sequence[Column]]:
    """
     Create columns from header.

     Create column metadata from headers.

    @param arguments: arguments
    @param headers: file headers
    @return:
    """
    columns: typing.Optional[Sequence[Column]] = []
    columns = process_validate_exclude(headers, arguments.exclude, columns)
    # mark excluded headers with None so they are not used
    processed_headers: Sequence[Optional[str]] = exclude_header(
        headers, arguments.exclude
    )
    # NOTE : excluded have been marked at this point
    columns = process_validate_rename(processed_headers, arguments.rename, columns)

    processed_headers, chromosome_column = create_column(
        processed_headers,
        arguments.chromosome,
        OUTPUT_DESCRIPTION_CHROMOSOME,
        chromosome_formatter,
    )
    # indicate an error when coalescing
    columns = coalesce(chromosome_column, columns)

    processed_headers, position_column = create_column(
        processed_headers,
        arguments.position,
        OUTPUT_DESCRIPTION_POSITION,
        position_formatter,
    )
    columns = coalesce(position_column, columns)

    processed_headers, reference_column = create_column(
        processed_headers,
        arguments.reference,
        OUTPUT_DESCRIPTION_REFERENCE,
        parameterized_sequence_formatter(OUTPUT_DESCRIPTION_REFERENCE),
    )
    columns = coalesce(reference_column, columns)

    processed_headers, alternative_column = create_column(
        processed_headers,
        arguments.alternative,
        OUTPUT_DESCRIPTION_ALTERNATIVE,
        parameterized_sequence_formatter(OUTPUT_DESCRIPTION_ALTERNATIVE),
    )
    columns = coalesce(alternative_column, columns)

    processed_headers, p_value_column = create_column(
        processed_headers,
        arguments.p_value,
        OUTPUT_DESCRIPTION_P_VALUE,
        p_value_formatter,
    )
    columns = coalesce(p_value_column, columns)

    processed_headers, beta_value_column = create_column(
        processed_headers,
        arguments.beta,
        OUTPUT_DESCRIPTION_BETA,
        parameterized_float_formatter(OUTPUT_DESCRIPTION_BETA),
    )

    processed_headers, se_beta_column = create_column(
        processed_headers,
        arguments.p_value,
        OUTPUT_DESCRIPTION_SE_BETA,
        parameterized_float_formatter(OUTPUT_DESCRIPTION_SE_BETA),
    )

    processed_headers, p_m_log_p_value_column = create_column(
        processed_headers,
        arguments.m_log_p_value,
        OUTPUT_DESCRIPTION_M_LOG_P_VALUE,
        parameterized_float_formatter(OUTPUT_DESCRIPTION_M_LOG_P_VALUE),
    )

    if p_m_log_p_value_column is None and beta_value_column is not None and se_beta_column:
        p_m_log_p_value = beta_to_m_log_p_column(beta_value_column, se_beta_column)
        columns = coalesce(p_m_log_p_value, columns)
    elif p_m_log_p_value_column is None and p_value_column is not None:
        p_m_log_p_value = p_value_to_m_log_p_column(p_value_column)
        columns = coalesce(p_m_log_p_value, columns)

    columns = coalesce(beta_value_column, columns)

    if se_beta_column is not None:
        columns = coalesce(se_beta_column, columns)

    for current_column in process_remainder(processed_headers):
        columns = coalesce(current_column, columns)

    return columns


def line_to_row(line: str) -> Sequence[str]:
    """
    Line to row.

    Given a string covert to a list representing a row.

    @param line: string containing a row
    @return: row
    """
    return line.rstrip("\n").split("\t")


def row_to_line(row: Sequence[str], prefix="\n") -> str:
    """
    Row to line.

    Given a row (list of string) return a tsv encoded string.

    @param row: list of cells
    @param prefix : prefix (space supplied for header)
    @return: string representing the row
    """
    line = "\t".join(row)
    return f"{prefix}{line}"


def header_row(columns: Sequence[Column]) -> Sequence[str]:
    """
    Header row.

    Create header row from the column metadata.

    @param columns:  column metadata
    @return: header row.
    """
    headers = list(map(lambda current_column: current_column.header, columns))
    return headers


def process_row(
    line_number: int, row: Sequence[str], columns: Sequence[Column]
) -> typing.Optional[Sequence[str]]:
    """
    Process row from input.

    Given a row return a str return formatted row or None if there is a fault.

    @param line_number:
    @param row: input row to be formatted
    @param columns: row metadata
    @return: formatted row otherwise None
    """
    result: typing.Optional[Sequence[str]] = []
    current_column: Column
    for current_column in columns:
        assert current_column.formatter is not None
        lookup: typing.Callable[[int], str] = lambda i: row[i]
        arguments: Sequence[str] = list(map(lookup, current_column.indices))
        formatter: Formatter = current_column.formatter
        if formatter is not None:
            # NOTE : there is a bit of trickery used to get
            # the arguments to the formatter and typed check.
            # the formatter takes a maximum of two values
            # see the union in the type formatter.  Then a
            # subarray of length 2 is passed to the formatter.
            cell: typing.Optional[str] = formatter(line_number, *arguments[:2])
            result = coalesce(cell, result)
        else:
            result = None
    return result


def process_file(arguments: Arguments, read_file, write_file) -> int:
    """
    Process file.

    Format file given supplied path.

    @param arguments : arguments
    @param read_file: read file handle
    @param write_file: write file handle
    @return: return code
    """
    msg = f"""
    Columns:
        chromosome : {arguments.chromosome}
        position : {arguments.position}
        reference : {arguments.reference}
        alternative : {arguments.alternative}
        p-value : {arguments.p_value}
        m log p-value : {arguments.m_log_p_value}

    Configuration:
        exclude : {arguments.exclude}
        rename: {arguments.rename}

    Files:
        in file : {arguments.in_file}
        out file : {arguments.out_file}
    """
    log_info(msg)

    faults = 0
    headers = line_to_row(read_file.readline())
    columns = headers_to_columns(arguments, headers)
    if columns is None:
        exit_code = os.EX_CONFIG
    else:
        write_file.write(row_to_line(header_row(columns), prefix=""))
        line_number = 1
        for line in read_file.readlines():
            row = line_to_row(line)
            formatted_row = process_row(line_number, row, columns)
            faults = write_row(write_file, formatted_row, faults)
            line_number = line_number + 1
        msg = f"""
        processed:
         lines : {line_number}
         fault : {faults}
        """
        log_info(msg)
        exit_code = faults_to_exit_code(faults)
    return exit_code


def write_row(write_file, row: Optional[Sequence[str]], faults: int) -> int:
    """
    Write row.

    Given a row write out if valid otherwise update the number of faults.

    @param write_file: file handle
    @param row: row
    @param faults: current number of faults
    @return: updated number of faults
    """
    if row is not None:
        write_file.write(row_to_line(row))
    else:
        faults = faults + 1
    return faults


def faults_to_exit_code(faults: int) -> int:
    """
    Faults to exit code.

    Given the number of faults in the file return the exit code.

    @param faults: number of faults in file
    @return: return exit code
    """
    if faults == 0:
        exit_code = os.EX_OK
    else:
        exit_code = os.EX_CONFIG
    return exit_code


def run(argv: Sequence[str]) -> typing.NoReturn:
    """
    Take arguments and returns an exit code.

    @param argv: command line arguments
    @return: exit code
    """
    args = parse_args(argv)
    with file_open(args.in_file, mode="r") as read_file:
        with file_open(args.out_file, mode="w") as write_file:
            return_code = process_file(args, read_file, write_file)
    sys.exit(return_code)


if __name__ == "__main__":
    run(sys.argv[1:])  # pragma: no cover
