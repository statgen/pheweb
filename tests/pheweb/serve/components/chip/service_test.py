# -*- coding: utf-8 -*-
"""
Service test.
"""

import pytest
from flask import Flask
from flask.testing import FlaskClient
from werkzeug.exceptions import NotFound

from pheweb.serve.components.chip.fs_storage import FileChipDAO
from pheweb.serve.components.chip.model import JeevesContext, ChipDAO
from pheweb.serve.components.chip.service import chip, development, get_dao
from tests.pheweb.serve.components.chip.fs_storage_test import (
    CHIP_CODING_FILE,
    PLOT_ROOT_DIRECTORY,
)


@pytest.fixture(name="chip_dao")
def fixture_chip_dao() -> ChipDAO:
    """
    Create chip DAO.

    :return: chip DAO
    """
    chip_data = CHIP_CODING_FILE
    plot_root = PLOT_ROOT_DIRECTORY
    return FileChipDAO(chip_data=chip_data, plot_root=plot_root)


@pytest.fixture(name="client")
def fixture_client(chip_dao: ChipDAO) -> FlaskClient:
    """
    Create flask client.

    :param chip_dao: chip dao
    :return: flask client
    """
    app = Flask(__name__, instance_relative_config=True)
    app.register_blueprint(chip)
    app.register_blueprint(development)
    app.jeeves = JeevesContext(chip_dao=chip_dao)
    with app.test_client() as client:
        yield client


@pytest.fixture(name="bad_client")
def fixture_bad_client() -> FlaskClient:
    """
    Create flask client.

    :return: flask client
    """
    app = Flask(__name__, instance_relative_config=True)
    app.register_blueprint(chip)
    app.register_blueprint(development)
    app.jeeves = JeevesContext(chip_dao=None)
    with app.test_client() as client:
        yield client


def test_get_dao_missing() -> None:
    """
    Test get doa with dao missing.

    :return: None
    """
    app = Flask(__name__, instance_relative_config=True)
    app.jeeves = JeevesContext(chip_dao=None)
    with pytest.raises(NotFound):
        get_dao(current_app=app)


def test_get_dao(chip_dao) -> None:
    """
    Test get DAO with DAO available.

    :param chip_dao: chip DAO.
    :return: None
    """
    app = Flask(__name__, instance_relative_config=True)
    app.jeeves = JeevesContext(chip_dao=chip_dao)
    assert get_dao(current_app=app) == chip_dao


def test_chip_data(client) -> None:
    """
    Test chip data.

    :param client: client
    :return: None
    """
    response_value = client.get("/api/v1/chip_data")
    assert response_value.status_code == 200


def test_chip_data_bad(bad_client) -> None:
    """
    Test with bad chip data.

    :param bad_client: bad client data.
    :return: None
    """
    response_value = bad_client.get("/api/v1/chip_data")
    assert response_value.status_code == 404


def test_cluster_plot(client) -> None:
    """
    Test cluster plot
    :param client:
    :return: None
    """
    response_value = client.get("/api/v1/cluster_plot/1:1:A:C")
    assert response_value.status_code == 200
    response_value = client.get("/api/v1/cluster_plot/variant")
    assert response_value.status_code == 404
