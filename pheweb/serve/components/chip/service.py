# -*- coding: utf-8 -*-
"""
Endpoint for chip data.

Methods for flask blueprints.
"""
import typing

from flask import (
    Blueprint,
    jsonify,
    current_app as app,
    abort,
    Response,
)

from .model import ChipDAO, JeevesContext

chip = Blueprint("pheweb_chip", __name__)
development = Blueprint("development", __name__)


app.jeeves: JeevesContext  # type: ignore


def get_dao(current_app=app) -> ChipDAO:
    """ "
    Get DAO.

    Get DAO object stored in jeeves.
    Return 404 if not available as
    it means the chip data is not
    available.
    """
    dao: typing.Optional[ChipDAO] = current_app.jeeves.chip_dao
    if dao is None:
        result = None
        abort(404, "Chip data not available")
    else:
        result = dao
    return result


@chip.route("/api/v1/chip_data", methods=["GET"])
def chip_data() -> Response:
    """
    Endpoint to return chip data.

    :return: response
    """
    dao: ChipDAO = get_dao()
    return jsonify(dao.get_chip_data())


@chip.route("/api/v1/cluster_plot/<variant>", methods=["GET"])
def cluster_plot(variant) -> Response:
    """
    Endpoint to return cluster plot for variant.

    :param variant: variant
    :return: response
    """
    dao: ChipDAO = get_dao()
    data = dao.get_cluster_plot(variant)
    if data is None:
        result = None
        abort(404, "Requested cluster plot not found!")
    else:
        result = Response(data, mimetype="image/png")
    return result
