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
import argparse
import logging
import os
import sys
import typing
from dataclasses import dataclass
from pheweb.load import command_flags
from pheweb.load.field_formatter import (
    m_log_from_p_value_formatter,
    m_log_from_beta_formatter,
    str_formatter,
    chromosome_formatter,
    position_formatter,
    parameterized_float_formatter,
    parameterized_sequence_formatter,
    p_value_formatter,
    se_beta_formatter,
    Formatter,
)

from pheweb.utils import file_open

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
LOGGER = logging.getLogger(__name__)
LOGGER.setLevel(logging.INFO)


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
    exclude: typing.Set[str]
    rename: typing.Dict[str, str]
    in_file: str
    out_file: str
    m_log_p_from_betas: bool

@dataclass(repr=True, eq=True, frozen=True)
class Column:
    """
    DTO containing metadata for column.

    index : index to get data for column
    header: header for column
    description : human-readable column description
    formatter : given a column data return data if well formatted
    """

    indices: typing.Sequence[int]
    header: str
    description: str
    formatter: Formatter


OUTPUT_FIXED_COLUMNS = [
    command_flags.OUTPUT_COLUMN_CHROMOSOME,
    command_flags.OUTPUT_COLUMN_POSITION,
    command_flags.OUTPUT_COLUMN_REFERENCE,
    command_flags.OUTPUT_COLUMN_ALTERNATIVE,
    command_flags.OUTPUT_COLUMN_P_VALUE,
    command_flags.OUTPUT_COLUMN_M_LOG_P_VALUE,
    command_flags.OUTPUT_COLUMN_BETA,
    command_flags.OUTPUT_COLUMN_SE_BETA,
]

M_LOG_P_COLUMN_HEADER = command_flags.OUTPUT_COLUMN_M_LOG_P_VALUE
M_LOG_P_COLUMN_DESCRIPTION = "m log p-value computed from p-value"


# METHODS


def parse_args(argv: typing.Sequence[str]) -> Arguments:
    """
    Parse command args.

    Parse command args and return an argument object.

    :param argv: commandline options
    :returns: arguments object
    """
    parser = argparse.ArgumentParser(description="format summary file")
    command_flags.add_chromosome_flag(parser)
    command_flags.add_position_flag(parser)
    command_flags.add_reference_flag(parser)
    command_flags.add_alternate_flag(parser)
    command_flags.add_p_value_flag(parser)
    command_flags.add_m_log_p_value_flag(parser)
    command_flags.add_beta_value_flag(parser)
    command_flags.add_se_beta_value_flag(parser)
    command_flags.add_exclude_value_flag(parser)
    command_flags.add_rename_value_flag(parser)
    command_flags.add_out_file_value_flag(parser)
    command_flags.add_in_file_value_flag(parser)
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
        exclude=command_flags.parse_exclude_args(parsed.exclude),
        rename=command_flags.parse_rename_args(parsed.rename),
        out_file=parsed.out_file,
        in_file=parsed.in_file,
        m_log_p_from_betas=False
    )


def log_error(msg: str, line_number: typing.Optional[int] = None) -> None:
    """
    Log Error.

    Method for logging errors to ensure uniform summary.

    :param msg: message to be logged
    :param line_number: input file line number
    :returns: None
    """
    msg = msg if line_number is None else f"line : {line_number} : {msg}"
    LOGGER.error(msg)


def log_info(msg: str) -> None:
    """
    Log info message.

    Intended usage for displaying configuration and summary information.

    :param msg: message to be logged
    :returns: None
    """
    LOGGER.info(msg)


def column_valid(
    headers: typing.Sequence[str], column: Column
) -> typing.Optional[Column]:
    """
    Check is column is valid.

    Check if a column is valid with respect to the given header.
    The only check done is if the column index is in bounds.

    :param headers:  list containing file headers
    :param column: column description object
    :returns:  column if valid otherwise None
    """
    if not all(map(lambda index: 0 <= index < len(headers), column.indices)):
        result = None
        log_error(f"{column.indices} out of bounds header only has {len(headers)}")
    else:
        result = column
    return result


def search_header(
    headers: typing.Sequence[typing.Optional[str]],
    column_name: str,
    default_index: typing.Optional[int] = None,
) -> typing.Optional[int]:
    """
    Search header.

    Search header for a column returning the index.

    :param headers: headers
    :param column_name: name of column
    :param default_index: default to return if not found
    :returns: index of column or default in not found
    """
    if column_name is None or column_name not in headers:
        index = default_index
    else:
        index = headers.index(column_name)
    return index


def create_column(
    headers: typing.Sequence[typing.Optional[str]],
    column_name: str,
    description: str,
    formatter: Formatter,
    column_header: typing.Optional[str] = None,
) -> typing.Tuple[typing.Sequence[typing.Optional[str]], typing.Optional[Column]]:
    """
    Create column.

    Constructor method for column.

    :param headers: file header
    :param column_name: name of columns
    :param description: description of columns
    :param formatter: column formatter
    :param column_header: used to override the column_header
    :returns: Column if column can be created None otherwise
    """
    index = search_header(headers, column_name)
    if index is None:
        result = None
    else:
        header = column_name if column_header is None else column_header
        result = Column(
            indices=[index], header=header, description=description, formatter=formatter
        )
        headers = list(headers)
        headers[index] = None
    return headers, result


VALUE = typing.TypeVar("VALUE")


def log_missing_column(
    column: typing.Optional[Column], column_name: str
) -> typing.Optional[Column]:
    """
    Log missing column.

    If column is None log the column could not be created
    because it could not be found in header.

    :param column: optional column
    :param column_name: expected header name
    :returns: optional column
    """
    if column is None:
        log_error(f"could not find column {column_name} in header")
    return column


def coalesce(
    value: typing.Optional[VALUE], acc: typing.Optional[typing.Sequence[VALUE]]
) -> typing.Optional[typing.Sequence[VALUE]]:
    """
    Coalesce a value into a list.

    If the value or the accumulator are None return.
    Otherwise, return accumulator with value appended.

    :param value: optional value
    :param acc: optional accumulator
    :returns: return accumulator+[value] otherwise None
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

    :param column: p-value column
    :returns: m log p column
    """
    # sanity check that p-value column was supplied.
    assert column.header == command_flags.OUTPUT_COLUMN_P_VALUE
    return Column(
        indices=column.indices,
        header=M_LOG_P_COLUMN_HEADER,
        description=M_LOG_P_COLUMN_DESCRIPTION,
        formatter=m_log_from_p_value_formatter,
    )


def beta_to_m_log_p_value_column(
    beta_column: Column,
    se_beta_column: Column,
) -> Column:
    """
    Beta to m log p-value.

    Given beta value and se beta columns
    return a column that calculates m
    log p-value.  Care has to be taken
    the arguments are given in the right
    order.

    :param beta_column: beta column
    :param se_beta_column: se-beta column
    :returns: m log-p column
    """
    assert beta_column.header == command_flags.OUTPUT_COLUMN_BETA
    assert se_beta_column.header == command_flags.OUTPUT_COLUMN_SE_BETA
    return Column(
        indices=[*beta_column.indices, *se_beta_column.indices],
        header=M_LOG_P_COLUMN_HEADER,
        description=M_LOG_P_COLUMN_DESCRIPTION,
        formatter=m_log_from_beta_formatter,
    )


def exclude_header(
    headers: typing.Sequence[str], exclude: typing.Set[str]
) -> typing.Sequence[typing.Optional[str]]:
    """
    Exclude header.

    Exclude columns from header by changing the entry to None.

    :param headers: headers
    :param exclude: columns to be excluded
    :returns: header with columns excluded

    """
    excluded_headers = [None if current in exclude else current for current in headers]
    return excluded_headers


def process_remainder(
    headers: typing.Sequence[typing.Optional[str]],
) -> typing.Sequence[Column]:
    """
    Process remainder.

    Create columns from the remainder of columns.

    :param headers: headers
    :returns: columns
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
    headers: typing.Sequence[str],
    exclude: typing.Set[str],
    columns: typing.Optional[typing.Sequence[Column]],
) -> typing.Optional[typing.Sequence[Column]]:
    """
    Validate exclude.

    Check that excluded columns could be found in headers.

    :param headers: input file header
    :param exclude: columns to exclude
    :param columns: partially constructed columns
    :returns: None if excluded is malformed otherwise columns
    """
    for column_name in exclude:
        if column_name not in headers:
            log_error(f"excluded column {column_name} not found in header")
            columns = coalesce(None, columns)
    return columns


def process_validate_rename(
    headers: typing.Sequence[typing.Optional[str]],
    rename: typing.Dict[str, str],
    columns: typing.Optional[typing.Sequence[Column]],
) -> typing.Optional[typing.Sequence[Column]]:
    """
    Validate rename arguments.

    * Check they are not pointing to a required column use the flags for those.
    * Check the renaming refers to column that is in the header.

    Note: This is run after columns have bene excluded, so those values should be None.
    Note: This also allows a column name to be repeated.

    :param headers: input file headers
    :param rename: map continuing header names what to remap to.
    :param columns: columns being constructed
    :returns: return None if remapping is invalid or column if they are
    """
    for column_name in rename:
        if column_name not in headers:
            log_error(f"renaming source column {column_name} not found in header")
            columns = coalesce(None, columns)
        # can't map to required columns. Use flags instead.
        if column_name in OUTPUT_FIXED_COLUMNS:
            log_error(f"mapped column {column_name} not found in header")
    return columns


def headers_to_columns(
    arguments: Arguments, headers: typing.Sequence[str]
) -> typing.Optional[typing.Sequence[Column]]:
    """
     Create columns from header.

     Create column metadata from headers.

    :param arguments: arguments
    :param headers: file headers
    :returns: Sequence of columns if successful None otherwise
    """
    columns: typing.Optional[typing.Sequence[Column]] = []
    columns = process_validate_exclude(headers, arguments.exclude, columns)
    # mark excluded headers with None so they are not used
    processed_headers: typing.Sequence[typing.Optional[str]] = exclude_header(
        headers, arguments.exclude
    )
    # NOTE : excluded have been "marked"/replaced with None at this point
    columns = process_validate_rename(processed_headers, arguments.rename, columns)

    # chromosome column
    processed_headers, chromosome_column = create_column(
        processed_headers,
        arguments.chromosome,
        command_flags.OUTPUT_DESCRIPTION_CHROMOSOME,
        chromosome_formatter,
        column_header=command_flags.OUTPUT_COLUMN_CHROMOSOME,
    )
    # indicate an error when coalescing
    columns = coalesce(
        log_missing_column(chromosome_column, arguments.chromosome), columns
    )

    # position column
    processed_headers, position_column = create_column(
        processed_headers,
        arguments.position,
        command_flags.OUTPUT_DESCRIPTION_POSITION,
        position_formatter,
        column_header=command_flags.OUTPUT_COLUMN_POSITION,
    )
    columns = coalesce(log_missing_column(position_column, arguments.position), columns)

    processed_headers, reference_column = create_column(
        processed_headers,
        arguments.reference,
        command_flags.OUTPUT_DESCRIPTION_REFERENCE,
        parameterized_sequence_formatter(command_flags.OUTPUT_DESCRIPTION_REFERENCE),
        column_header=command_flags.OUTPUT_COLUMN_REFERENCE,
    )
    columns = coalesce(
        log_missing_column(reference_column, arguments.reference), columns
    )

    processed_headers, alternative_column = create_column(
        processed_headers,
        arguments.alternative,
        command_flags.OUTPUT_DESCRIPTION_ALTERNATIVE,
        parameterized_sequence_formatter(command_flags.OUTPUT_DESCRIPTION_ALTERNATIVE),
        column_header=command_flags.OUTPUT_COLUMN_ALTERNATIVE,
    )
    columns = coalesce(
        log_missing_column(alternative_column, arguments.alternative), columns
    )

    processed_headers, p_value_column = create_column(
        processed_headers,
        arguments.p_value,
        command_flags.OUTPUT_DESCRIPTION_P_VALUE,
        p_value_formatter,
        column_header=command_flags.OUTPUT_COLUMN_P_VALUE,
    )
    columns = coalesce(log_missing_column(p_value_column, arguments.p_value), columns)

    processed_headers, beta_value_column = create_column(
        processed_headers,
        arguments.beta,
        command_flags.OUTPUT_DESCRIPTION_BETA,
        parameterized_float_formatter(command_flags.OUTPUT_DESCRIPTION_BETA),
        column_header=command_flags.OUTPUT_COLUMN_BETA,
    )

    processed_headers, se_beta_column = create_column(
        processed_headers,
        arguments.se_beta,
        command_flags.OUTPUT_DESCRIPTION_SE_BETA,
        se_beta_formatter,
        column_header=command_flags.OUTPUT_COLUMN_SE_BETA,
    )

    # m log p-value takes a few steps
    # step 1. First try to see if the column is available.
    # step 2. If it is not try to calculate using beta and
    # se_beta, this method is more accurate.  As
    # se-beta is optional this may not be possible.
    # step 3. In this case try calculating using p-value. As
    #  p-value required this step should succeed.
    # step 4. Report findings to the authorities

    # step 1
    processed_headers, m_log_p_value_column = create_column(
        processed_headers,
        arguments.m_log_p_value,
        command_flags.OUTPUT_DESCRIPTION_M_LOG_P,
        parameterized_float_formatter(command_flags.OUTPUT_DESCRIPTION_M_LOG_P),
        column_header=command_flags.OUTPUT_COLUMN_M_LOG_P_VALUE,
    )

    # step 2
    if m_log_p_value_column is None:
        if (arguments.m_log_p_from_betas and
            beta_value_column is not None and
            se_beta_column):
            m_log_p_value_column = beta_to_m_log_p_value_column(
                beta_value_column, se_beta_column
            )
        # step 3
        elif p_value_column is not None:
            m_log_p_value_column = p_value_to_m_log_p_column(p_value_column)

    # step 4
    columns = coalesce(
        log_missing_column(m_log_p_value_column, arguments.m_log_p_value), columns
    )
    columns = coalesce(log_missing_column(beta_value_column, arguments.beta), columns)

    if se_beta_column is not None:
        columns = coalesce(se_beta_column, columns)

    for current_column in process_remainder(processed_headers):
        columns = coalesce(current_column, columns)

    return columns


def line_to_row(line: str) -> typing.Sequence[str]:
    """
    Line to row.

    Given a string covert to a list representing a row.

    :param line: string containing a row
    :returns: row
    """
    return line.rstrip("\n").split("\t")


def row_to_line(row: typing.Sequence[str]) -> str:
    """
    Row to line.

    Given a row (list of string) return a tsv encoded string.

    :param row: list of cells
    :returns: string representing the row
    """
    line = "\t".join(row)
    return f"{line}\n"


def header_row(columns: typing.Sequence[Column]) -> typing.Sequence[str]:
    """
    Header row.

    Create header row from the column metadata.

    :param columns:  column metadata
    :returns: header row.
    """
    headers = list(map(lambda current_column: current_column.header, columns))
    return headers


def process_row(
    line_number: int,
    row: typing.Optional[typing.Sequence[str]],
    columns: typing.Sequence[Column],
) -> typing.Optional[typing.Sequence[str]]:
    """
    Process row from input.

    Given a row return a str return formatted row or None if there is a fault.

    :param line_number:
    :param row: input row to be formatted
    :param columns: row metadata
    :returns: formatted row otherwise None
    """
    if row is not None:
        result: typing.Optional[typing.Sequence[str]] = []
        current_column: Column
        for current_column in columns:
            assert current_column.formatter is not None
            assert row is not None
            _row: typing.Sequence[str] = row  # mypy type hint
            lookup: typing.Callable[[int], str] = lambda i: _row[i]
            arguments: typing.Sequence[str] = list(map(lookup, current_column.indices))
            formatter: Formatter = current_column.formatter
            result = coalesce(call_formatter(formatter, arguments, line_number), result)
    else:
        result = None
    return result


def check_row(
    line_number: int,
    row: typing.Optional[typing.Sequence[str]],
    header: typing.Sequence[str],
) -> typing.Optional[typing.Sequence[str]]:
    """
    Check row is well-structured.

    This checks if the row has the same
    number of columns as the header.

    :param line_number: line number currently being processed
    :param row: row to be checked
    :param header: file header
    :returns: None is row is malformed returns row otherwise
    """
    if row is None:
        result = None
        log_error("row is missing (None)", line_number=line_number)
    elif len(header) != len(row):
        result = None
        log_error(
            f" header has : {len(header)} column , row has {len(row)} : {row}",
            line_number=line_number,
        )
    else:
        result = row
    return result


def call_formatter(
    formatter: Formatter, arguments: typing.Sequence[str], line_number: int
) -> typing.Optional[str]:
    """
    Call formatter.

    Create cell given arguments to formatter.

    :param formatter: cell formatter
    :param arguments: arguments for formatter
    :param line_number: line number being processed
    :returns: formatted cell if successful None otherwise
    """
    if formatter is None:
        result = None
    else:
        # NOTE : there is a bit of trickery used to get
        # the arguments to the formatter and typed check.
        # the formatter takes a maximum of two values
        # see the union in the type formatter.  Then a
        # subarray of length 2 is passed to the formatter.
        try:
            result = formatter(*arguments[:2])
        except ValueError as value_error:
            log_error(str(value_error), line_number=line_number)
            result = None
    return result


def process_file(
    arguments: Arguments,
    read_file: typing.IO[str],
    write_file: typing.IO[str],
) -> int:
    """
    Process file.

    Format file given supplied path.

    :param arguments : arguments
    :param read_file: read file handle
    :param write_file: write file handle
    :returns: process return code
    """
    msg = f"""
    Columns:
        chromosome : {arguments.chromosome}
        position : {arguments.position}
        reference : {arguments.reference}
        alternative : {arguments.alternative}
        p-value : {arguments.p_value}
        m log p-value : {arguments.m_log_p_value}
        beta : {arguments.beta}
        se beta : {arguments.se_beta}

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

    msg = f"""
    Headers:
        {headers}
    """
    log_info(msg)

    columns = headers_to_columns(arguments, headers)
    if columns is None:
        exit_code = os.EX_CONFIG
    else:
        write_file.write(row_to_line(header_row(columns)))
        line_number = 1
        for line in read_file.readlines():
            row = check_row(line_number, line_to_row(line), headers)
            formatted_row = process_row(line_number, row, columns)
            faults = write_row(write_file, formatted_row, faults)
            line_number = line_number + 1
        msg = f"""
        processed:
         line count : {line_number}
         fault : {faults}
        """
        log_info(msg)
        exit_code = faults_to_exit_code(faults)
    return exit_code


def write_row(
    write_file: typing.IO[str], row: typing.Optional[typing.Sequence[str]], faults: int
) -> int:
    """
    Write row.

    Given a row write out if valid otherwise update the number of faults.

    :param write_file: file handle
    :param row: row
    :param faults: current number of faults
    :returns: updated number of faults
    """
    if row is not None:
        write_file.write(row_to_line(row))
    else:
        faults = faults + 1
    return faults


def faults_to_exit_code(faults: int) -> int:
    """
    Faults to exit code.

    Given the number of faults in the file return the
    exit code.  Fails if there are any faults.

    :param faults: number of faults in file
    :returns: return exit code
    """
    if faults == 0:
        exit_code = os.EX_OK
    else:
        exit_code = os.EX_CONFIG
    return exit_code


def run(argv: typing.Sequence[str]) -> typing.NoReturn:
    """
    Take arguments return format summary and exit.

    Parse the arguments given.  Open the input and
    output file.  Process the input file and write
    to the output and exit.

    :param argv: command line arguments
    :returns: NoReturn
    """
    args = parse_args(argv)
    with file_open(args.in_file, mode="r") as read_file:
        with file_open(args.out_file, mode="w") as write_file:
            return_code = process_file(args, read_file, write_file)
    sys.exit(return_code)


if __name__ == "__main__":
    run(sys.argv[1:])  # pragma: no cover
