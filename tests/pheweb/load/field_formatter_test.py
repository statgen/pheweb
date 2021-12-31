# -*- coding: utf-8 -*-
"""
Test formatters.

Unit tests for column formatters.

"""
import uuid
from unittest.mock import patch

import pytest

from pheweb.load.field_formatter import (
    str_formatter,
    chromosome_formatter,
    position_formatter,
    parameterized_sequence_formatter,
    p_value_formatter,
    m_log_from_p_value_formatter,
    se_beta_formatter,
    m_log_from_beta_formatter,
    parameterized_float_formatter,
)
from pheweb.utils import M_LOG_P_SENTINEL


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


def test_position_formatter_1() -> None:
    """
    Test position formatter.

    @return: None
    """
    assert "1" == position_formatter("1")
    assert "10" == position_formatter("10")
    assert "100300000" == position_formatter("1.003e+08")
    assert "249200000" == position_formatter("2.492e+08")
    for bad_value in [
        "-BAD VALUE",
        "-2",
        "2.492e+01",
        "bad",
        "2.492e+01call_formatter",
    ]:
        with pytest.raises(ValueError) as value_error:
            position_formatter(bad_value)
        assert bad_value in str(value_error)


def test_parameterized_sequence_formatter() -> None:
    """
    Test parameter sequence formatter.

    @return: None
    """
    column_name = str(uuid.uuid4())
    formatter = parameterized_sequence_formatter(column_name)
    assert "" == formatter("")
    assert "G" == formatter("G")
    assert "CAT" == formatter("CAT")
    bad_value = "BAT"
    with pytest.raises(ValueError) as value_error:
        formatter(bad_value)
    assert bad_value in str(value_error)


def test_p_value_formatter_good_values() -> None:
    """
    Test p-value with 'good values'.

    @return: None
    """
    assert p_value_formatter("0") == "0.0"
    assert p_value_formatter("0.5") == "0.5"
    assert p_value_formatter("1.0") == "1.0"


def test_p_value_formatter_bad_values() -> None:
    """
    Test p-value with 'bad' values.

    @return: None
    """
    for bad_value in ["2.0", "a", "-1"]:
        with pytest.raises(ValueError) as value_error:
            p_value_formatter(bad_value)
        assert bad_value in str(value_error)


def test_m_log_from_m_log_from_p_value_formatter_bad() -> None:
    """
    Test m log p-value with 'bad' values.

    @return: None
    """
    for bad_value in ["-1.0", "a", "2"]:
        with pytest.raises(ValueError) as value_error:
            m_log_from_p_value_formatter(bad_value)
        assert bad_value in str(value_error)


@patch("pheweb.load.field_formatter.p_value_formatter", return_value="-1.0")
def test_m_log_from_m_log_from_p_value_formatter_edge_case(
    mock_p_value_formatter,
) -> None:
    """
    Test m log p-value with an edge case.

    @param mock_p_value_formatter: mocker p-value formatter
    @return: None
    """
    weird_value = "0.666"
    assert not mock_p_value_formatter.called
    with pytest.raises(ValueError) as value_error:
        m_log_from_p_value_formatter(weird_value)
    mock_p_value_formatter.assert_called_once()
    assert weird_value in str(value_error)


def test_m_log_from_p_value_formatter_valid() -> None:
    """
    Test m log p-value with valid values.

    @return: None
    """
    assert m_log_from_p_value_formatter("0") == str(M_LOG_P_SENTINEL)
    assert m_log_from_p_value_formatter("0.1") == "1.0"
    assert m_log_from_p_value_formatter("0.01") == "2.0"


def test_se_beta_formatter() -> None:
    """
    Test se beta formatter.

    @return: None
    """
    assert se_beta_formatter("0") == "0.0"
    assert se_beta_formatter("1") == "1.0"
    assert se_beta_formatter("1.0") == "1.0"
    assert se_beta_formatter(" 5.9719201914e-10") == "5.9719201914e-10"
    for bad_value in ["-1.0", "a", "-2"]:
        with pytest.raises(ValueError) as value_error:
            se_beta_formatter(bad_value)
        assert bad_value in str(value_error)


def test_m_log_from_beta_formatter() -> None:
    """
    Test m log from beta formatter.

    @return: None
    """
    for bad_beta, bad_se_beta in [("", ""), ("1", ""), ("", "1"), ("1", "0")]:
        with pytest.raises(ValueError):
            m_log_from_beta_formatter(bad_beta, bad_se_beta)
    assert m_log_from_beta_formatter("0.0", "1.0") == "0.0"


def test_parameterized_float_formatter_valid() -> None:
    """
    Test parameterized float formatter is valid.

    @return: None
    """
    column_name = uuid.uuid4()
    formatter = parameterized_float_formatter(column_name)
    assert formatter("-1") == "-1.0"
    assert formatter("0") == "0.0"
    assert formatter("0.1") == "0.1"
    assert formatter("10.0") == "10.0"


def test_parameterized_float_formatter_bad() -> None:
    """
    Test parameterized float formatter bad.

    @return: None
    """
    column_name = str(uuid.uuid4())
    formatter = parameterized_float_formatter(column_name)
    for bad_value in ["a", "*"]:
        with pytest.raises(ValueError) as value_error:
            formatter(bad_value)
    assert bad_value in str(value_error)
