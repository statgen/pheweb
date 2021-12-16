# -*- coding: utf-8 -*-

"""
Unit test for drug db module.

See: pheweb/serve/data_access/drug_db.py

"""
from pheweb.serve.data_access.drug_db import (
    nvl_attribute,
    copy_attribute,
    query_endpoint,
    reshape_row,
    extract_rows,
)


def test_nvl_attribute() -> None:
    """
    Test nvl attributes.

    @return: None
    """
    assert nvl_attribute("name", None, 1) == 1
    assert nvl_attribute("name", {}, 1) == 1
    assert nvl_attribute("name", {"name": 2}, 1) == 2


def test_copy_attribute() -> None:
    """
    Test copy attribute.

    @return: None
    """
    assert copy_attribute("name", None, None) is None
    assert copy_attribute("name", {}, None) is None
    assert not copy_attribute("name", {}, {})
    assert copy_attribute("name", {"name": 1}, {}) == {"name": 1}


def test_reshape_row_1() -> None:
    """
    Test Reshape row.

    @return: None
    """
    assert not reshape_row({})
    assert reshape_row({"approvedName": 1}) == {"approvedName": 1}


def test_reshape_row_2() -> None:
    """
    Test reshape row.

    @return: None
    """
    assert extract_rows({}, "DBH") == []


def test_endpoint() -> None:
    """
    Test end point.

    @return: None
    """
    assert not query_endpoint("DBH") is None
