# -*- coding: utf-8 -*-
"""
Test formatters.

Unit tests for column formatters.

"""
import uuid

import pytest

from pheweb.load.field_formatter import str_formatter, chromosome_formatter


def test_str_formatter() -> None:
    """
    Test string formatter.

    @return: None
    """
    salt = str(uuid.uuid4())
    assert salt == str_formatter(salt)


def test_chromosome_formatter() -> None:
    """
    Test chromosome formatter.

    @return: None
    """
    assert "1" == chromosome_formatter("1")
    assert "25" == chromosome_formatter("MT")
    with pytest.raises(ValueError) as value_error:
        chromosome_formatter("Z")
    assert "Z" in str(value_error)
    salt = str(uuid.uuid4())
    with pytest.raises(ValueError) as value_error:
        chromosome_formatter(salt)
    assert salt in str(value_error)


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
#     assert p_value_formatter(line_number, "0") == "0.0"
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
#         mock_p_value_formatter,
#         mock_log_error,
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
# def test_se_beta_formatter(mock_log_error) -> None:
#     line_number = random_line_number()
#     # 0
#     assert not mock_log_error.called
#     assert se_beta_formatter(line_number, '0') == '0.0'
#     # 1
#     assert not mock_log_error.called
#     assert se_beta_formatter(line_number, '1') == '1.0'
#     # 1.0
#     assert not mock_log_error.called
#     assert se_beta_formatter(line_number, '1.0') == '1.0'
#     # 5.9719201914e-10
#     assert not mock_log_error.called
#     assert se_beta_formatter(line_number, ' 5.9719201914e-10') == '5.9719201914e-10'
#     # -1
#     se_beta_formatter(line_number, '-1')
#     mock_log_error.assert_called_once()
#     kwargs = mock_log_error.call_args.kwargs
#     assert kwargs == {"line_number": line_number}
#
#
# # m_log_from_beta_formatter
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
