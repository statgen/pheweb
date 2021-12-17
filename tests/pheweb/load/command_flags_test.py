# -*- coding: utf-8 -*-
"""
Unit testing for command flags.

This tests the various command flags
and there helper methods.

"""
import argparse
import typing
import uuid

import pytest

from pheweb.load.command_flags import (
    FLAG_CHROMOSOME,
    add_chromosome_flag,
    OUTPUT_COLUMN_CHROMOSOME,
    FLAG_POSITION,
    add_position_flag,
    FLAG_REFERENCE,
    add_reference_flag,
    FLAG_ALTERNATIVE,
    add_alternate_flag,
    OUTPUT_COLUMN_REFERENCE,
    OUTPUT_COLUMN_ALTERNATIVE,
    FLAG_P_VALUE,
    add_p_value_flag,
    OUTPUT_COLUMN_P_VALUE,
    FLAG_M_LOG_P_VALUE,
    add_m_log_p_value_flag,
    OUTPUT_COLUMN_M_LOG_P_VALUE,
    add_beta_value_flag,
    FLAG_BETA,
    OUTPUT_COLUMN_BETA,
    FLAG_SE_BETA,
    add_se_beta_value_flag,
    OUTPUT_COLUMN_SE_BETA,
    OUTPUT_COLUMN_POSITION,
    add_in_file_value_flag,
    DEFAULT_IN_FILE,
    add_out_file_value_flag,
    DEFAULT_OUT_FILE,
    add_rename_value_flag,
    DEFAULT_RENAME,
    add_exclude_value_flag,
    FLAG_EXCLUDE,
    FLAG_RENAME,
    DEFAULT_EXCLUDE,
    parse_exclude_args,
    parse_rename_args,
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


def parse_harness(
    cli_argv: typing.List[str],
    parse_method: typing.Callable[[argparse.ArgumentParser], None],
):
    """
    Parse harness.

    Calls the argument parser with the parse method.
    Then calls the argument parse with the cli argv.

    @param cli_argv: arguments to pass to parser
    @param parse_method: parse set up method
    @return: result of the parse
    """
    parser = argparse.ArgumentParser(description=f"test : {parse_method}")
    parse_method(parser)
    return parser.parse_args(cli_argv)


def test_add_chromosome() -> None:
    """
    Test arguments for chromosome column.

    @return: None
    """
    chromosome = str(uuid.uuid4())
    arguments = parse_harness([FLAG_CHROMOSOME, chromosome], add_chromosome_flag)
    assert arguments.chromosome == chromosome
    assert parse_harness([], add_chromosome_flag).chromosome is OUTPUT_COLUMN_CHROMOSOME


def test_add_position():
    """
    Test arguments for position column.

    @return: None
    """
    position = str(uuid.uuid4())
    arguments = parse_harness([FLAG_POSITION, position], add_position_flag)
    assert arguments.position == position
    assert parse_harness([], add_position_flag).position is OUTPUT_COLUMN_POSITION


def test_add_ref() -> None:
    """
    Test arguments for alternative column.

    @return: None
    """
    reference = str(uuid.uuid4())
    arguments = parse_harness([FLAG_REFERENCE, reference], add_reference_flag)
    assert arguments.reference == reference
    assert parse_harness([], add_reference_flag).reference is OUTPUT_COLUMN_REFERENCE


def test_add_alt() -> None:
    """
    Test arguments for alternative column.

    @return: None
    """
    alternative = str(uuid.uuid4())
    arguments = parse_harness([FLAG_ALTERNATIVE, alternative], add_alternate_flag)
    assert arguments.alternative == alternative
    assert (
        parse_harness([], add_alternate_flag).alternative is OUTPUT_COLUMN_ALTERNATIVE
    )


def test_add_p_value() -> None:
    """
    Test arguments for p-value column.

    @return: None
    """
    p_value = str(uuid.uuid4())
    arguments = parse_harness([FLAG_P_VALUE, p_value], add_p_value_flag)
    assert arguments.p_value == p_value
    assert parse_harness([], add_p_value_flag).p_value == OUTPUT_COLUMN_P_VALUE


def test_add_m_log_p_value() -> None:
    """
    Test arguments for m log p value column.

    @return: None
    """
    m_log_p_value = str(uuid.uuid4())
    arguments = parse_harness(
        [FLAG_M_LOG_P_VALUE, m_log_p_value], add_m_log_p_value_flag
    )
    assert arguments.m_log_p_value == m_log_p_value
    arguments = parse_harness([], add_m_log_p_value_flag)
    assert arguments.m_log_p_value == OUTPUT_COLUMN_M_LOG_P_VALUE


def test_add_beta() -> None:
    """
    Test arguments for beta column.

    @return: None
    """
    beta = str(uuid.uuid4())
    arguments = parse_harness([FLAG_BETA, beta], add_beta_value_flag)
    assert arguments.beta == beta
    assert parse_harness([], add_beta_value_flag).beta == OUTPUT_COLUMN_BETA


def test_add_se_beta() -> None:
    """
    Test arguments for beta column.

    @return: None
    """
    se_beta = str(uuid.uuid4())
    arguments = parse_harness([FLAG_SE_BETA, se_beta], add_se_beta_value_flag)
    assert arguments.se_beta == se_beta
    assert parse_harness([], add_se_beta_value_flag).se_beta == OUTPUT_COLUMN_SE_BETA


def test_add_exclude() -> None:
    """
    Test argument for columns to exclude.

    @return: None
    """
    exclude = str(uuid.uuid4())
    arguments = parse_harness([FLAG_EXCLUDE, exclude], add_exclude_value_flag)
    assert arguments.exclude == exclude
    assert parse_harness([], add_exclude_value_flag).exclude == DEFAULT_EXCLUDE


def test_add_rename() -> None:
    """
    Test arguments for rename.

    @return: None
    """
    new_name = str(uuid.uuid4())
    old_name = str(uuid.uuid4())
    rename = f"{old_name}:{new_name}"
    arguments = parse_harness([FLAG_RENAME, rename], add_rename_value_flag)
    assert arguments.rename == rename
    assert parse_harness([], add_rename_value_flag).rename == DEFAULT_RENAME


def test_parse_out_file() -> None:
    """
    Test arguments for out file.

    @return: None
    """
    out_file = str(uuid.uuid4())
    arguments = parse_harness(["--out-file", out_file], add_out_file_value_flag)
    assert arguments.out_file == out_file
    assert parse_harness([], add_out_file_value_flag).out_file == DEFAULT_OUT_FILE


def test_add_in_file() -> None:
    """
    Test arguments for input file.

    @return: None
    """
    in_file = str(uuid.uuid4())
    assert parse_harness([in_file], add_in_file_value_flag).in_file == in_file
    assert parse_harness([], add_in_file_value_flag).in_file == DEFAULT_IN_FILE
