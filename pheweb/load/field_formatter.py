# -*- coding: utf-8 -*-

"""
Field formatters.

These functions format and verify
the fields of data loaded into pheweb.
"""
import typing
import re

from pheweb.utils import parse_chromosome, pvalue_to_mlogp, beta_to_m_log_p


def str_formatter(value: str) -> typing.Optional[str]:
    """
    Format string.

    A pass through formatter.

    @param value: value to pass through
    @return: value supplied
    """
    return value


def chromosome_formatter(value: str) -> typing.Optional[str]:
    """Format chromosome.

    If valid chromosome format otherwise log error.

    See utils_py:parse_chromosome

    @param value: value containing chromosome
    @return: formatted chromosome
    """
    try:
        chromosome = value.strip()
        result = str(parse_chromosome(chromosome))
    except ValueError as value_error:
        raise ValueError(
            f'invalid chromosome expected number "{value}" details : {value_error}'
        ) from value_error
    return result


def position_formatter(value: str) -> typing.Optional[str]:
    """
    Position formatter.

    Check for valid position and format.

    @param value: value
    @return: position if value otherwise None.
    """
    try:
        position = int(value)
        if position >= 0:
            result = str(position)
        else:
            raise ValueError(f'position expected positive integer "{value}"')
    except ValueError as value_error:
        raise ValueError(
            f'position could not be parsed as integer "{value}" details : {value_error}'
        ) from value_error
    return result


def parameterized_sequence_formatter(
    column_name: str,
) -> typing.Callable[[str], typing.Optional[str]]:
    """
    Parameterize sequence formatter.

    Because both the reference and alternate columns both use the  same
    formatter this allows the column to be added to the error message.

    @param column_name: column name
    @return:  Formatter for column
    """

    def formatter(value: str) -> typing.Optional[str]:
        """
        Validate a sequence.

        @param value: sequence
        @return: sequence if valid otherwise None
        """
        sequence = value.upper()
        if not re.match(r"^[GCAT]*$", sequence):
            raise ValueError(f'{column_name} is not a valid sequence "{value}" ')
        return sequence

    return formatter


def p_value_formatter(value: str) -> typing.Optional[str]:
    """
    P-value formatter.

    Check for valid p-value and format.

    @param value: string p-value
    @return: p-value if value otherwise None.
    """
    try:
        p_value = float(value)
        if 0 <= p_value <= 1:
            result = str(p_value)
        else:
            raise ValueError(f'p-value not in expected range "{p_value}"')
    except ValueError as value_error:
        raise ValueError(
            f'p-value could not be parsed as float "{value}" details : {value_error}',
        ) from value_error
    return result


def m_log_from_p_value_formatter(value: str) -> typing.Optional[str]:
    """
    M log p-value from p-value.

    This formatter creates an m log p-value from a p-value column by calculation.

    @param value: string value
    @return: m log p-value if it can be calculated otherwise None
    """
    result = None
    p_value = p_value_formatter(value)
    if p_value is not None:
        try:
            p_value_float = float(p_value)
            p_value_float = pvalue_to_mlogp(p_value_float)
            result = str(p_value_float)
        except ValueError as value_error:
            raise ValueError(
                f'p-value for m log could not be parsed as float "{value}" details : {value_error}',
            ) from value_error
    return result


def se_beta_formatter(value: str) -> typing.Optional[str]:
    """
    SE Beta formatter.

    This formats SE beta values.  A valid SE beta values
    is a positive float.

    @param value:
    @return:
    """
    try:
        se_beta = float(value)
        if se_beta >= 0:
            result = str(se_beta)
        else:
            raise ValueError(f'position expected positive float "{value}"')
    except ValueError as value_error:
        raise ValueError(
            f'position could not be parsed as integer "{value}" details : {value_error}',
        ) from value_error
    return result


def m_log_from_beta_formatter(beta: str, se_beta: str) -> typing.Optional[str]:
    """
    Log_m p-value formatter.

    This format calculates m log p-value from
    the beta and se beta values.

    See : utils.py:beta_to_m_log_p

    @param beta: beta value
    @param se_beta: se beta value
    @return: m log p-value otherwise None otherwise
    """
    result = None
    string_beta = parameterized_float_formatter("beta")(beta)
    string_se_beta: typing.Optional[str] = se_beta_formatter(se_beta)
    if string_beta is not None and string_se_beta is not None:
        try:
            float_beta = float(string_beta)
            float_se_beta = float(string_se_beta)
            m_log_p_value = beta_to_m_log_p(float_beta, float_se_beta)
            result = str(m_log_p_value)
        except ValueError as value_error:
            raise ValueError(
                f"""position could not calculate m log p from
                    beta : "{beta}"
                    se beta : "{se_beta}"
                    details : {value_error}""",
            ) from value_error
    return result


def parameterized_float_formatter(
    column_name: str,
) -> typing.Callable[[str], typing.Optional[str]]:
    """
    Parameterized float formatter.

    Used to format beta values and m-log p when provided.

    @param column_name: name of column being formatted
    @return: formatter
    """

    def formatter(value: str) -> typing.Optional[str]:
        """
        Float formatter.

        Returns a string representing float if a valid
        float is provided.  Returns None otherwise.

        @param value: value to be formatted
        @return: string representing provided float None otherwise
        """
        try:
            result = str(float(value))
        except ValueError as value_error:
            raise ValueError(
                f'{column_name} could not be parsed as float "{value}" details : {value_error}',
            ) from value_error
        return result

    return formatter
