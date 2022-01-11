# -*- coding: utf-8 -*-
"""
Test Model.

Unit testing for model.py.
"""
import uuid

import pytest

from pheweb.serve.components.chip.model import ChipDAO


def test_chip_dao() -> None:
    """
    Test chip DAO.

    :return: None
    """
    dao = ChipDAO()
    with pytest.raises(NotImplementedError):
        dao.get_chip_data()
    with pytest.raises(NotImplementedError):
        variant = str(uuid.uuid4())
        dao.get_cluster_plot(variant)
