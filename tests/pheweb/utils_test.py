# -*- coding: utf-8 -*-
"""

Unit test for the utils.py.

See : utils.py.

"""
import io
import sys
import typing
import uuid
from unittest.mock import patch

import pytest

from pheweb.utils import (
    pvalue_to_mlogp,
    M_LOG_P_SENTINEL,
    std_file_handler,
    file_open,
    parse_chromosome,
    beta_to_m_log_p,
)
from pheweb.utils import round_sig, approx_equal, pad_gene


def test_round_sig() -> None:
    """
    Test rounding to significant figures.

    @return: None
    """
    assert round_sig(0.00123, 2) == 0.0012
    assert round_sig(1.59e-10, 2) == 1.6e-10


def test_approx_equal() -> None:
    """
    Test approximate equal.

    @return: None
    """
    assert approx_equal(42, 42.0000001)
    assert not approx_equal(42, 42.01)


def test_pad_gene() -> None:
    """
    Test pad gene.

    @return: None
    """
    assert pad_gene(1000, 2345) == (0, 102345)
    assert pad_gene(1000, 400000) == (0, 500000)
    assert pad_gene(200000, 400000) == (100000, 500000)
    assert pad_gene(200000, 500000) == (100000, 600000)
    assert pad_gene(200000, 500001) == (100001, 600000)
    assert pad_gene(200000, 600000) == (150000, 650000)
    assert pad_gene(200000, 700000) == (200000, 700000)
    assert pad_gene(200000, 800000) == (200000, 800000)


def test_parse_chromosome() -> None:
    """
    Test parse chromosome.

    @return: None
    """
    assert parse_chromosome("1") == 1
    assert parse_chromosome("MT") == 25
    with pytest.raises(ValueError):
        assert parse_chromosome("a")
    with pytest.raises(ValueError):
        assert parse_chromosome("1000")


def test_p_value_to_m_log_p() -> None:
    """
    Test p value to m log p conversion.

    @return: None
    """
    assert pvalue_to_mlogp(0.0) == M_LOG_P_SENTINEL
    assert pvalue_to_mlogp(10.0) == -1.0


@pytest.fixture
def _fixture_stdin():
    """
    Swap out stdin for string.

    @return: string io
    """
    stdin = sys.stdin
    buffer = io.StringIO()
    sys.stdin = buffer
    yield buffer
    sys.stdin = stdin


@pytest.fixture
def _fixture_stdout():
    """
    Swap out stdout for string.

    @return: string io
    """
    stdout = sys.stdout
    buffer = io.StringIO()
    sys.stdout = buffer
    yield buffer
    sys.stdout = stdout


def test_std_file_handler_stdin(_fixture_stdin) -> typing.NoReturn:
    """
    Test std file handler reader.

    Test the stdin is returned when
    supplied '-'

    @param stdin: text wrapper
    @return: None
    """
    assert std_file_handler("") == _fixture_stdin
    assert std_file_handler("r") == _fixture_stdin
    assert std_file_handler("Ur") == _fixture_stdin


def test_std_file_handler_stdout(_fixture_stdout) -> None:
    """
    Test std file handler reader.

    Test the stdout is returned when
    supplied '-'

    @param stdout: text wrapper
    @return: None
    """
    assert not std_file_handler("w") == _fixture_stdout
    assert not std_file_handler("Uw") == _fixture_stdout


@patch("pheweb.utils.std_file_handler")
def test_file_open_stdin(mock_std_file_handler) -> None:
    """
    Test if standard file handles.

    @param mock_std_file_handler: mock file handler
    @return: None
    """
    salt: str = str(uuid.uuid4())
    mock_std_file_handler.return_value = io.StringIO(salt)
    with file_open("-", mode="Ur") as file:
        buffer = file.read()
        assert salt == buffer


@patch("smart_open.open")
def test_file_open_file(mock_std_file_handler) -> None:
    """
    Test if file can be open given a path.

    @param mock_std_file_handler: mock file handle
    @return: None
    """
    salt: str = str(uuid.uuid4())
    mock_std_file_handler.return_value = io.StringIO(salt)
    with file_open("test", mode="Ur") as file:
        buffer = file.read()
        assert salt == buffer


def test_beta_to_m_log_p() -> None:
    """
    Test beta to log_m(p).

    @return: None
    """
    assert beta_to_m_log_p(1.0, 1.0) == 0.4985155458279891
