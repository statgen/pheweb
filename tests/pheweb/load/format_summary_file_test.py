# -*- coding: utf-8 -*-

"""
Unit test for format summary files.

This contains the unit test for
format_summary_file.py.

"""
# import io
# import os
import uuid

# import sys
# import random
import pytest

# import uuid
# from unittest.mock import patch
# from pheweb.utils import M_LOG_P_SENTINEL
from pheweb.load.format_summary_file import (
    parse_exclude_args,
    parse_rename_args,
    parse_args,
    OUTPUT_COLUMN_CHROMOSOME,
    OUTPUT_COLUMN_POSITION,
    OUTPUT_COLUMN_ALTERNATIVE,
    OUTPUT_COLUMN_P_VALUE,
    OUTPUT_COLUMN_M_LOG_P_VALUE,
    OUTPUT_COLUMN_BETA,
    #     run,
    #     log_error,
    #     log_info,
    #     Column,
    #     str_formatter,
    #     chromosome_formatter,
    #     position_formatter,
    #     parameterized_sequence_formatter,
    #     p_value_formatter,
    #     m_log_from_p_value_formatter,
    #     parameterized_float_formatter,
    #     column_valid,
    #     search_header,
    #     create_column,
    #     coalesce,
    #     p_value_to_m_log_p_column,
    #     M_LOG_P_COLUMN_HEADER,
    #     M_LOG_P_COLUMN_DESCRIPTION,
)


def test_exclude_args() -> None:
    """
    Test exclude args.

    @return: None
    """
    assert parse_exclude_args("") == set()
    assert parse_exclude_args("a") == {"a"}
    assert parse_exclude_args("a,b") == {"a", "b"}
    assert parse_exclude_args("a,b,c") == {"a", "b", "c"}


def test_rename_args() -> None:
    """
    Test rename args.

    @return: None
    """
    assert not parse_rename_args("")
    assert parse_rename_args("a:b") == {"a": "b"}
    assert parse_rename_args("a:b,c:d") == {"a": "b", "c": "d"}
    with pytest.raises(ValueError):
        assert parse_rename_args("a")


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


# def test_parse_out_file() -> None:
#     """
#     Test arguments for out file.
#
#     @return: None
#     """
#     out_file = str(uuid.uuid4())
#     assert parse_args(["--out-file", out_file]).out_file == out_file
#     assert parse_args([]).out_file == "-"
#
#
# def test_parse_args_in_file() -> None:
#     """
#     Test arguments for input file.
#
#     @return: None
#     """
#     in_file = str(uuid.uuid4())
#     assert parse_args([in_file]).in_file == in_file
#     assert parse_args([]).in_file == "-"
#
#
# def test_log_error() -> None:
#     """
#     Test error logger is logged.
#
#     @return: None
#     """
#     file = io.StringIO()
#     salt = str(uuid.uuid4())
#     log_error(salt, file=file)
#     assert salt in file.getvalue()
#
#
# def test_str_formatter() -> None:
#     """
#     Test string formatter.
#
#     @return: None
#     """
#     salt = str(uuid.uuid4())
#     assert salt == str_formatter(0, salt)
#
#
# def random_number():
#     """
#     Randome line number.
#
#     Generate a random line number for
#     testing purposes.
#
#     @return: random number
#     """
#     return random.randint(1, 1000)
#
#
# random_line_number = random_number
# random_string = uuid.uuid4
#
#
# @patch("pheweb.load.format_summary_file.log_error")
# def test_chromosome_formatter(mock_log_error) -> None:
#     """
#     Test chromosome formatter.
#
#     @param mock_log_error: mocker logger
#     @return: None
#     """
#     assert "1" == chromosome_formatter(1, "1")
#     assert "25" == chromosome_formatter(1, "MT")
#     assert not mock_log_error.called
#     line_number = random_line_number()
#     assert chromosome_formatter(line_number, "Z") is None
#     mock_log_error.assert_called_once()
#     kwargs = mock_log_error.call_args.kwargs
#     assert kwargs == {"line_number": line_number}
#
#
# @patch("pheweb.load.format_summary_file.log_error")
# def test_position_formatter_1(mock_log_error) -> None:
#     assert "1" == position_formatter(1, "1")
#     assert "10" == position_formatter(1, "10")
#     line_number = random_line_number()
#     assert position_formatter(line_number, "-Z") is None
#     mock_log_error.assert_called_once()
#     kwargs = mock_log_error.call_args.kwargs
#     assert kwargs == {"line_number": line_number}
#
#
# @patch("pheweb.load.format_summary_file.log_error")
# def test_position_formatter_negative(mock_log_error) -> None:
#     line_number = random_line_number()
#     assert position_formatter(line_number, "-2") is None
#     mock_log_error.assert_called_once()
#     kwargs = mock_log_error.call_args.kwargs
#     assert kwargs == {"line_number": line_number}
#
#
# @patch("pheweb.load.format_summary_file.log_error")
# def test_position_formatter_2(mock_log_error) -> None:
#     line_number = random_line_number()
#     assert position_formatter(line_number, "bad") is None
#     mock_log_error.assert_called_once()
#     kwargs = mock_log_error.call_args.kwargs
#     assert kwargs == {"line_number": line_number}
#
#
# @patch("pheweb.load.format_summary_file.log_error")
# def test_parameterized_sequence_formatter(mock_log_error) -> None:
#     line_number = random_line_number()
#     column_name = str(uuid.uuid4())
#     formatter = parameterized_sequence_formatter(column_name)
#     assert "" == formatter(line_number, "")
#     assert "G" == formatter(line_number, "G")
#     assert "CAT" == formatter(line_number, "CAT")
#     assert not mock_log_error.called
#     assert formatter(line_number, "BAT") is None
#     assert column_name in mock_log_error.call_args[0][0]
#     mock_log_error.assert_called_once()
#     kwargs = mock_log_error.call_args.kwargs
#     assert kwargs == {"line_number": line_number}
#
#
# @patch("pheweb.load.format_summary_file.log_error")
# def test_p_value_formatter_neg_1(mock_log_error) -> None:
#     line_number = random_line_number()
#     assert not mock_log_error.called
#     assert p_value_formatter(line_number, "-1") is None
#     mock_log_error.assert_called_once()
#     kwargs = mock_log_error.call_args.kwargs
#     assert kwargs == {"line_number": line_number}
#
#
# @patch("pheweb.load.format_summary_file.log_error")
# def test_p_value_formatter_zero(mock_log_error) -> None:
#     line_number = random_line_number()
#     assert not mock_log_error.called
#     assert p_value_formatter(line_number, "0") == "0"
#     assert not mock_log_error.called
#
#
# @patch("pheweb.load.format_summary_file.log_error")
# def test_p_value_formatter_zero_point_five(mock_log_error) -> None:
#     line_number = random_line_number()
#     assert not mock_log_error.called
#     assert p_value_formatter(line_number, "0.5") == "0.5"
#     assert not mock_log_error.called
#
#
# @patch("pheweb.load.format_summary_file.log_error")
# def test_p_value_formatter_one(mock_log_error) -> None:
#     line_number = random_line_number()
#     assert not mock_log_error.called
#     assert p_value_formatter(line_number, "1.0") == "1.0"
#     assert not mock_log_error.called
#
#
# @patch("pheweb.load.format_summary_file.log_error")
# def test_p_value_formatter_two(mock_log_error) -> None:
#     line_number = random_line_number()
#     assert not mock_log_error.called
#     assert p_value_formatter(line_number, "2.0") is None
#     mock_log_error.assert_called_once()
#     kwargs = mock_log_error.call_args.kwargs
#     assert kwargs == {"line_number": line_number}
#
#
# @patch("pheweb.load.format_summary_file.log_error")
# def test_p_value_formatter_a(mock_log_error) -> None:
#     line_number = random_line_number()
#     assert not mock_log_error.called
#     assert p_value_formatter(line_number, "a") is None
#     mock_log_error.assert_called_once()
#     kwargs = mock_log_error.call_args.kwargs
#     assert kwargs == {"line_number": line_number}
#
#
# @patch("pheweb.load.format_summary_file.log_error")
# def test_m_log_from_p_value_formatter_neg_1(mock_log_error) -> None:
#     line_number = random_line_number()
#     assert not mock_log_error.called
#     assert m_log_from_p_value_formatter(line_number, "-1") is None
#     mock_log_error.assert_called_once()
#     kwargs = mock_log_error.call_args.kwargs
#     assert kwargs == {"line_number": line_number}
#
#
# @patch("pheweb.load.format_summary_file.log_error")
# @patch("pheweb.load.format_summary_file.p_value_formatter", return_value="-1.0")
# def test_m_log_from_p_value_formatter_invalid_log(
#     mock_p_value_formatter,
#     mock_log_error,
# ) -> None:
#     line_number = random_line_number()
#     assert not mock_log_error.called
#     assert m_log_from_p_value_formatter(line_number, "-1") is None
#     mock_log_error.assert_called_once()
#     mock_p_value_formatter.assert_called_once()
#     kwargs = mock_log_error.call_args.kwargs
#     assert kwargs == {"line_number": line_number}
#
#
# @patch("pheweb.load.format_summary_file.log_error")
# def test_m_log_from_p_value_formatter_valid(mock_log_error) -> None:
#     line_number = random_line_number()
#     assert not mock_log_error.called
#     assert m_log_from_p_value_formatter(line_number, "0") == str(M_LOG_P_SENTINEL)
#     assert m_log_from_p_value_formatter(line_number, "0.1") == "1.0"
#     assert m_log_from_p_value_formatter(line_number, "0.01") == "2.0"
#     assert not mock_log_error.called
#
#
# @patch("pheweb.load.format_summary_file.log_error")
# def test_m_log_from_p_value_formatter_two(mock_log_error) -> None:
#     line_number = random_line_number()
#     assert not mock_log_error.called
#     assert m_log_from_p_value_formatter(line_number, "2") is None
#     mock_log_error.assert_called_once()
#     kwargs = mock_log_error.call_args.kwargs
#     assert kwargs == {"line_number": line_number}
#
#
# @patch("pheweb.load.format_summary_file.log_error")
# def test_m_log_from_p_value_formatter_a(mock_log_error) -> None:
#     line_number = random_line_number()
#     assert not mock_log_error.called
#     assert m_log_from_p_value_formatter(line_number, "a") is None
#     mock_log_error.assert_called_once()
#     kwargs = mock_log_error.call_args.kwargs
#     assert kwargs == {"line_number": line_number}
#
#
# @patch("pheweb.load.format_summary_file.log_error")
# def test_parameterized_float_formatter_valid(mock_log_error) -> None:
#     line_number = random_line_number()
#     column_name = uuid.uuid4()
#     f = parameterized_float_formatter(column_name)
#     assert not mock_log_error.called
#     assert f(line_number, "-1") == "-1.0"
#     assert f(line_number, "0") == "0.0"
#     assert f(line_number, "0.1") == "0.1"
#     assert f(line_number, "10.0") == "10.0"
#     assert not mock_log_error.called
#
#
# @patch("pheweb.load.format_summary_file.log_error")
# def test_parameterized_float_formatter_a(mock_log_error) -> None:
#     line_number = random_line_number()
#     column_name = str(uuid.uuid4())
#     f = parameterized_float_formatter(column_name)
#     assert not mock_log_error.called
#     assert f(line_number, "a") is None
#     mock_log_error.assert_called_once()
#     kwargs = mock_log_error.call_args.kwargs
#     assert column_name in mock_log_error.call_args[0][0]
#     assert kwargs == {"line_number": line_number}
#
#
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
