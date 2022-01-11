# -*- coding: utf-8 -*-

"""
Unit test for format summary files.

This contains the unit test for
format_summary_file.py.

"""
import os
import random
import tempfile
import typing
import uuid
from io import StringIO
from unittest.mock import patch

import pytest

from pheweb.load import command_flags
from pheweb.load.command_flags import (
    OUTPUT_COLUMN_CHROMOSOME,
    OUTPUT_COLUMN_POSITION,
    OUTPUT_COLUMN_ALTERNATIVE,
    OUTPUT_COLUMN_P_VALUE,
    OUTPUT_COLUMN_BETA,
    OUTPUT_COLUMN_M_LOG_P_VALUE,
    FLAG_OUT_FILE,
    OUTPUT_COLUMN_SE_BETA,
)
from pheweb.load.field_formatter import (
    str_formatter,
    p_value_formatter,
)
from pheweb.load.format_summary_file import (
    column_valid,
    parse_args,
    log_error,
    log_info,
    Column,
    search_header,
    create_column,
    coalesce,
    p_value_to_m_log_p_column,
    M_LOG_P_COLUMN_HEADER,
    M_LOG_P_COLUMN_DESCRIPTION,
    beta_to_m_log_p_value_column,
    exclude_header,
    process_validate_exclude,
    process_validate_rename,
    line_to_row,
    row_to_line,
    faults_to_exit_code,
    write_row,
    run,
    headers_to_columns,
    header_row,
    process_row,
    call_formatter,
    process_file,
    Arguments,
    check_row,
)


def test_parse_args_chromosome() -> None:
    """
    Test arguments for chromosome column.

    @return: None
    """
    chromosome = str(uuid.uuid4())
    assert parse_args(["--chrom", chromosome]).chromosome == chromosome
    assert parse_args([]).chromosome is OUTPUT_COLUMN_CHROMOSOME


def test_parse_args_position():
    """
    Test arguments for position column.

    @return: None
    """
    position = str(uuid.uuid4())
    assert parse_args(["--pos", position]).position == position
    assert parse_args([]).position is OUTPUT_COLUMN_POSITION


def test_parse_args_alt() -> None:
    """
    Test arguments for alternative column.

    @return: None
    """
    alternative = str(uuid.uuid4())
    assert parse_args(["--alt", alternative]).alternative == alternative
    assert parse_args([]).alternative is OUTPUT_COLUMN_ALTERNATIVE


def test_parse_args_p_value() -> None:
    """
    Test arguments for p-value column.

    @return: None
    """
    p_value = str(uuid.uuid4())
    assert parse_args(["--pval", p_value]).p_value == p_value
    assert parse_args([]).p_value == OUTPUT_COLUMN_P_VALUE


def test_parse_args_m_log_p_value() -> None:
    """
    Test arguments for m log p value column.

    @return: None
    """
    m_log_p_value = str(uuid.uuid4())
    assert parse_args(["--mlogp", m_log_p_value]).m_log_p_value == m_log_p_value
    assert parse_args([]).m_log_p_value == OUTPUT_COLUMN_M_LOG_P_VALUE


def test_parse_args_beta() -> None:
    """
    Test arguments for beta column.

    @return: None
    """
    beta = str(uuid.uuid4())
    assert parse_args(["--beta", beta]).beta == beta
    assert parse_args([]).beta == OUTPUT_COLUMN_BETA


def test_parse_args_exclude() -> None:
    """
    Test argument for columns to exclude.

    @return: None
    """
    exclude = str(uuid.uuid4())
    assert parse_args(["--exclude", exclude]).exclude == {exclude}
    assert parse_args([]).exclude == set()


def test_parse_args_rename() -> None:
    """
    Test arguments for rename.

    @return: None
    """
    new_name = str(uuid.uuid4())
    old_name = str(uuid.uuid4())
    rename = f"{old_name}:{new_name}"
    assert parse_args(["--rename", rename]).rename == {old_name: new_name}
    assert not parse_args([]).rename


def test_parse_out_file() -> None:
    """
    Test arguments for out file.

    @return: None
    """
    out_file: str = str(uuid.uuid4())
    assert parse_args(["--out-file", out_file]).out_file == out_file
    assert parse_args([]).out_file == "-"


def test_parse_args_in_file() -> None:
    """
    Test arguments for input file.

    @return: None
    """
    in_file = str(uuid.uuid4())
    assert parse_args([in_file]).in_file == in_file
    assert parse_args([]).in_file == "-"


def random_number():
    """
    Random line number.

    Generate a random line number for
    testing purposes.

    @return: random number
    """
    return random.randint(1, 1000)


random_line_number: typing.Callable[[], int] = random_number
random_string: typing.Callable[[], str] = lambda: str(uuid.uuid4)


@patch("pheweb.load.format_summary_file.LOGGER.error")
def test_log_error(mock_logger_error) -> None:
    """
    Test error logger is logged.

    @return: None
    """
    salt = str(uuid.uuid4())
    line_number = random_line_number()
    assert not mock_logger_error.called
    log_error(salt, line_number=line_number)
    mock_logger_error.assert_called_once()
    msg = mock_logger_error.call_args[0][0]
    assert str(line_number) in msg
    assert salt in msg


@patch("pheweb.load.format_summary_file.LOGGER.info")
def test_log_info(mock_logger_info) -> None:
    """
    Test info logger is logged.

    @return: None
    """
    salt = str(uuid.uuid4())
    assert not mock_logger_info.called
    log_info(salt)
    mock_logger_info.assert_called_once()
    msg = mock_logger_info.call_args[0][0]
    assert salt in msg


@patch("pheweb.load.format_summary_file.log_error")
def test_column_valid(mock_log_error) -> None:
    """
    Check column validator.

    @param mock_log_error: logger mock
    @return: None
    """
    column = Column(
        indices=[1], header="a", description="description", formatter=str_formatter
    )
    assert column == column_valid(["a", "b"], column)
    assert not mock_log_error.called
    assert column_valid(["a"], column) is None
    mock_log_error.assert_called_once()


@patch("pheweb.load.format_summary_file.log_error")
def test_column_invalid(mock_log_error) -> None:
    """
    Check column validator.

    @param mock_log_error: logger mock
    @return: None
    """
    column = Column(
        indices=[-1], header="a", description="description", formatter=str_formatter
    )
    assert column_valid(["a", "b"], column) is None
    mock_log_error.assert_called_once()


TEST_HEADERS = ["a", "b", "c"]


def test_search_header() -> None:
    """
    Test search header.

    @return: None
    """
    assert search_header(TEST_HEADERS, "a") == 0
    assert search_header(TEST_HEADERS, "d") is None
    assert search_header(TEST_HEADERS, "d", default_index=10) == 10


def test_create_column() -> None:
    """
    Test create column.

    @return: None
    """
    headers: typing.Sequence[typing.Optional[str]] = TEST_HEADERS
    column_name = "Bad Name"
    description = "Bad Description"
    formatter = str_formatter
    column_header: typing.Optional[str] = "Bad Header"

    headers, bad_column = create_column(
        headers, column_name, description, formatter, column_header
    )
    assert TEST_HEADERS == headers
    assert bad_column is None

    headers = TEST_HEADERS
    column_name = "a"
    description = "Good column"
    formatter = str_formatter
    column_header = None

    headers, good_column = create_column(
        headers, column_name, description, formatter, column_header
    )

    assert good_column is not None
    assert good_column.header == column_name
    assert good_column.indices == [0]
    assert good_column.description == description
    assert headers[0] is None


def test_coalesce() -> None:
    """
    Test coalesce.

    @return: None
    """
    assert coalesce(None, None) is None
    assert coalesce(1, None) is None
    assert coalesce(None, []) is None
    acc: typing.Optional[typing.Sequence[int]] = [2]
    assert coalesce(None, acc) is None
    assert coalesce(1, []) == [1]
    assert coalesce(2, [1]) == [1, 2]


def test_p_value_to_m_log_p_column() -> None:
    """
    Test p-value to m log p-value.

    @return: None
    """
    index = random_number()
    header = command_flags.OUTPUT_COLUMN_P_VALUE
    description = random_string()
    column = Column(
        indices=[index], header=header, description=description, formatter=str_formatter
    )
    column = p_value_to_m_log_p_column(column)
    assert column.indices == [index]
    assert column.header == M_LOG_P_COLUMN_HEADER
    assert column.description == M_LOG_P_COLUMN_DESCRIPTION
    # assert column is not None and \
    #        m_log_from_p_value_formatter is not None and \
    #        column.formatter.__name__ == m_log_from_p_value_formatter.__name__


def test_beta_to_m_log_p_value_column() -> None:
    """
    Test beta to m-log p-value.

    @return: None
    """
    beta_indices = [1, 2]
    se_beta_indices = [3, 4]
    beta_column = Column(
        indices=beta_indices,
        header=command_flags.OUTPUT_COLUMN_BETA,
        description=command_flags.OUTPUT_DESCRIPTION_BETA,
        formatter=str_formatter,
    )

    se_beta_column = Column(
        indices=se_beta_indices,
        header=command_flags.OUTPUT_COLUMN_SE_BETA,
        description=command_flags.OUTPUT_DESCRIPTION_BETA,
        formatter=str_formatter,
    )
    column = beta_to_m_log_p_value_column(beta_column, se_beta_column)
    assert column.indices == beta_indices + se_beta_indices
    assert column.header == M_LOG_P_COLUMN_HEADER


def test_exclude_header() -> None:
    """
    Test exclude header.

    @return: None
    """
    assert exclude_header(TEST_HEADERS, set()) == TEST_HEADERS
    assert exclude_header(TEST_HEADERS, set(TEST_HEADERS)) == list(
        map(lambda _: None, TEST_HEADERS)
    )


def test_process_validate_exclude() -> None:
    """
    Test process validate exclude.

    @return: None
    """
    assert process_validate_exclude(TEST_HEADERS, set(), None) is None
    assert process_validate_exclude(TEST_HEADERS, {"X"}, None) is None


def test_process_validate_rename() -> None:
    """
    Test process validate rename.

    @return: None
    """
    assert process_validate_rename(TEST_HEADERS, {}, None) is None
    assert process_validate_rename(TEST_HEADERS, {"X": "Y"}, []) is None
    assert (
        process_validate_rename(
            TEST_HEADERS, {command_flags.OUTPUT_COLUMN_CHROMOSOME: "Y"}, []
        )
        is None
    )


@patch("pheweb.load.format_summary_file.LOGGER.error")
def test_headers_to_columns(mock_logger_error) -> None:
    """
    Test headers to columns.

    @param mock_logger_error: mock loger
    @return: None
    """
    arguments = parse_args([])
    headers: typing.List[str] = []
    assert headers_to_columns(arguments, headers) is None

    arguments = parse_args([])
    headers = [OUTPUT_COLUMN_BETA, OUTPUT_COLUMN_SE_BETA]
    assert headers_to_columns(arguments, headers) is None

    arguments = parse_args([])
    headers = [OUTPUT_COLUMN_P_VALUE]
    assert headers_to_columns(arguments, headers) is None

    assert mock_logger_error.called


def test_line_to_row() -> None:
    """
    Test line to row.

    @return: None
    """
    assert line_to_row("") == [""]
    assert line_to_row("a") == ["a"]
    assert line_to_row("a\tb") == ["a", "b"]
    assert line_to_row("a\tb\tc") == ["a", "b", "c"]


def test_row_to_line() -> None:
    """
    Row to line.

    @return: None
    """
    assert row_to_line([""]) == "\n"
    assert row_to_line(["a"]) == "a\n"
    assert row_to_line(["a", "b"]) == "a\tb\n"
    assert row_to_line(["a", "b", "c"]) == "a\tb\tc\n"


def test_header_row() -> None:
    """
    Test header row.

    @return: None
    """
    assert not header_row([])
    index = random_number()
    header = str(uuid.uuid4())
    description = random_string()
    column = Column(
        indices=[index], header=header, description=description, formatter=str_formatter
    )
    assert header_row([column]) == [header]


def test_process_row() -> None:
    """
    Test process row.

    @return: None
    """
    line_number: int = random_line_number()
    row: typing.Sequence[str] = []
    columns: typing.Sequence[Column] = []
    assert not process_row(line_number, row, columns)
    index = 0
    header = str(uuid.uuid4())
    description = random_string()
    column = Column(
        indices=[index], header=header, description=description, formatter=str_formatter
    )
    cell = str(uuid.uuid4())
    row = [cell]
    assert process_row(line_number, row, [column]) == [cell]


@patch("pheweb.load.format_summary_file.LOGGER.error")
def test_process_row_none(mock_logger_error) -> None:
    """
    Test process row with None.

    :param mock_logger_error: mocker logger
    :return: None
    """
    line_number: int = random_line_number()
    row: typing.Optional[typing.Sequence[str]] = None
    columns: typing.Sequence[Column] = []
    assert not mock_logger_error.called
    assert process_row(line_number, row, columns) is None


@patch("pheweb.load.format_summary_file.LOGGER.error")
def test_check_row_none(mock_logger_error) -> None:
    """
    Check what happens when row is None
    :param mock_logger_error: logger
    :return: None
    """
    line_number: int = random_line_number()
    row: typing.Optional[typing.Sequence[str]] = None
    header: typing.Sequence[str] = []
    assert not mock_logger_error.called
    assert check_row(line_number, row, header) is None
    mock_logger_error.assert_called_once()
    msg = mock_logger_error.call_args[0][0]
    assert str(line_number) in msg


@patch("pheweb.load.format_summary_file.LOGGER.error")
def test_check_row_wrong_width(mock_logger_error) -> None:
    """
    Test check row with wrong width.

    :param mock_logger_error: logger
    :return: None
    """
    line_number: int = random_line_number()
    row: typing.Optional[typing.Sequence[str]] = ["a"]
    header: typing.Sequence[str] = ["a", "b"]
    assert not mock_logger_error.called
    assert check_row(line_number, row, header) is None
    mock_logger_error.assert_called_once()
    msg = mock_logger_error.call_args[0][0]
    assert str(line_number) in msg


@patch("pheweb.load.format_summary_file.LOGGER.error")
def test_check_row_success(mock_logger_error) -> None:
    """
    Test check row success path.

    :param mock_logger_error: error log
    :return: None
    """
    line_number: int = random_line_number()
    row: typing.Optional[typing.Sequence[str]] = ["a", "b"]
    header: typing.Sequence[str] = ["c", "d"]
    assert not mock_logger_error.called
    assert check_row(line_number, row, header) == row
    assert not mock_logger_error.called


# call_formatter
@patch("pheweb.load.format_summary_file.LOGGER.error")
def test_call_formatter(mock_logger_error) -> None:
    """
    Test call formatter.

    @param mock_logger_error: logger error
    @return: None
    """
    cell = str(uuid.uuid4())
    row = [cell]
    line_number = random_line_number()
    assert call_formatter(None, row, line_number) is None
    assert call_formatter(str_formatter, row, line_number) == cell
    assert not mock_logger_error.called
    assert call_formatter(p_value_formatter, row, line_number) is None
    mock_logger_error.assert_called_once()
    msg = mock_logger_error.call_args[0][0]
    assert cell in msg


# process_file
@patch("pheweb.load.format_summary_file.LOGGER.error")
@patch("pheweb.load.format_summary_file.LOGGER.info")
def test_process_file(mock_logger_error, mock_logger_info) -> None:
    """
    Test process file.

    @param mock_logger_error: logger error
    @param mock_logger_info: logger info
    @return: None
    """
    arguments: Arguments = parse_args([])
    read_file: typing.IO[str] = StringIO()
    write_file = StringIO()
    assert process_file(arguments, read_file, write_file) == os.EX_CONFIG
    header = "#chrom\tpos\tref\talt\tpval\tmlogp\tbeta\tsebeta\n"
    read_file = StringIO(header)
    assert process_file(arguments, read_file, write_file) == os.EX_OK
    assert write_file.getvalue() == header
    data = "1\t2\tA\tC\t0.1\t0.2\t0.3\t0.4\n"
    read_file = StringIO(header + data)
    write_file = StringIO()
    assert process_file(arguments, read_file, write_file) == os.EX_OK
    assert write_file.getvalue() == header + data

    assert mock_logger_error.called
    assert mock_logger_info.called


def test_write_row_fault() -> None:
    """
    Test write row fault.

    @return: None
    """
    buffer = StringIO()
    fault = random_number()
    assert fault + 1 == write_row(buffer, None, fault)
    assert buffer.getvalue() == ""


def test_write_row_success() -> None:
    """
    Test write row success.

    @return: None
    """
    buffer = StringIO()
    fault = random_number()
    salt = random_string()
    assert fault == write_row(buffer, [salt], fault)
    assert salt in buffer.getvalue()


def test_faults_to_exit_code() -> None:
    """
    Test faults to exit code.

    @return: None
    """
    assert faults_to_exit_code(0) == os.EX_OK
    assert faults_to_exit_code(1) == os.EX_CONFIG


@patch("pheweb.load.format_summary_file.process_file", return_value=os.EX_OK)
def test_run(mock_process_file) -> None:
    """
    Test run method.

    @param mock_process_file: mock of process file method
    @return: None
    """
    with tempfile.NamedTemporaryFile() as in_file:
        with tempfile.NamedTemporaryFile() as out_file:
            with pytest.raises(SystemExit) as system_exit:
                argv = [FLAG_OUT_FILE, out_file.name, in_file.name]
                run(argv)
            assert system_exit.type == SystemExit
            assert system_exit.value.code == os.EX_OK
    assert mock_process_file.called
