# -*- coding: utf-8 -*-

"""
Unit test for drug db module.

See: pheweb/serve/data_access/drug_db.py

"""
import uuid
from unittest.mock import patch

import pytest

from pheweb.serve.data_access.drug_db import (
    nvl_attribute,
    copy_attribute,
    query_endpoint,
    reshape_row,
    extract_rows, DrugDB, DrugDao, fetch_drugs,
)


@patch("pheweb.serve.data_access.drug_db.query_endpoint", return_value={})
def test_fetch_drugs(mock_query_endpoint) -> None:
    assert fetch_drugs("test") == []


def test_drug_db() -> None:
    db = DrugDB()
    with pytest.raises(NotImplementedError):
        db.get_drugs("")


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


@patch("pheweb.serve.data_access.drug_db.fetch_drugs", return_value=None)
def test_drug_dao_get_drugs(mock_fetch_drugs) -> None:
    """
    Test drug dao get drugs.

    :return:
    """
    dao = DrugDao()
    assert dao.get_drugs("test") is None


def test_reshape_row() -> None:
    row = {}
    assert reshape_row(row) == {}
    row['disease'] = {}
    assert reshape_row(row) == {}
    name = str(uuid.uuid4())
    row['disease'] = {'name': name}
    assert reshape_row(row) == {'diseaseName': name}
    db_x_ref = str(f'EFO:{uuid.uuid4()}')
    row['disease'] = {'name': name, 'dbXRefs': [db_x_ref]}
    assert reshape_row(row) == {'diseaseName': name,
                                'EFOInfo': db_x_ref}
    drug = str(uuid.uuid4())
    row['drug'] = { 'maximumClinicalTrialPhase' : drug }
    assert reshape_row(row) == {'diseaseName': name,
                                'EFOInfo': db_x_ref,
                                'maximumClinicalTrialPhase': drug}



