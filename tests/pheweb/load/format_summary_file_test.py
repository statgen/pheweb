# -*- coding: utf-8 -*-

"""
Unit test for format summary files.

This contains the unit test for
format_summary_file.py.

"""
import typing
import uuid
from unittest.mock import patch
import random

from pheweb.load.command_flags import (
    OUTPUT_COLUMN_CHROMOSOME,
    OUTPUT_COLUMN_POSITION,
    OUTPUT_COLUMN_ALTERNATIVE,
    OUTPUT_COLUMN_P_VALUE,
    OUTPUT_COLUMN_BETA,
    OUTPUT_COLUMN_M_LOG_P_VALUE,
)

from pheweb.load.format_summary_file import (
    parse_args,
    log_error,
    log_info,
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


# @patch("pheweb.load.format_summary_file.log_error")
# def test_column_valid(mock_log_error) -> None:
#     """
#     Check column validator.
#
#     @param mock_log_error: logger mock
#     @return: None
#     """
#     column = Column(
#         index=1, header="a", description="description", formatter=str_formatter
#     )
#     assert column == column_valid(["a", "b"], column)
#     assert not mock_log_error.called
#     assert column_valid(["a"], column) is None
#     mock_log_error.assert_called_once()
#
#
# TEST_HEADERS = ["a", "b", "c"]
#
#
# def test_search_header() -> None:
#     assert search_header(TEST_HEADERS, "a") == 0
#     assert search_header(TEST_HEADERS, "d") is None
#     assert search_header(TEST_HEADERS, "d", default_index=10) == 10
#
#
# def test_headers_to_column() -> None:
#     bad_column = create_column(TEST_HEADERS, None, "Bad", "Bad Column", str_formatter)
#     assert bad_column is None
#     column_name = "a"
#     column_description = "Good column"
#     good_column = create_column(
#         TEST_HEADERS, column_name, "Good", column_description, str_formatter
#     )
#     assert good_column is not None
#     assert good_column.header == column_name
#     assert good_column.index == 0
#     assert good_column.formatter == str_formatter
#     assert good_column.description == column_description
#
#
# def test_coalesce() -> None:
#     assert coalesce(None, None) is None
#     assert coalesce(1, None) is None
#     assert coalesce(None, 1) is None
#     assert coalesce(None, []) is None
#     assert coalesce(None, [2]) is None
#     assert coalesce(1, []) == [1]
#     assert coalesce(2, [1]) == [1, 2]
#
#
# def test_p_value_to_m_log_p_column() -> None:
#     index = random_number()
#     header = random_string()
#     description = random_string()
#     column = Column(
#         index=index, header=header, description=description, formatter=str_formatter
#     )
#     column = p_value_to_m_log_p_column(column)
#     assert column.index == index
#     assert column.header == M_LOG_P_COLUMN_HEADER
#     assert column.description == M_LOG_P_COLUMN_DESCRIPTION
#     assert column.formatter == m_log_from_p_value_formatter
