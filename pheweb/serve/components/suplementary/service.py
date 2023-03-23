# -*- coding: utf-8 -*-
"""
Endpoint for supplementary data.

Methods for flask blueprints.
"""
import typing
from .model import JeevesContext, SupplementaryStatisticsDB

from flask import (
    Blueprint,
    jsonify,
    current_app as app,
    abort,
    Response,
)

suplementary = Blueprint("pheweb_suplementary", __name__)
development = Blueprint("development", __name__)

app.jeeves: JeevesContext  # type: ignore


def get_dao(current_app=app) -> SupplementaryStatisticsDB:
    """ "
    Get DAO.

    Get DAO object stored in jeeves.
    Return 404 if not available as
    it means the suplementary data is not
    available.
    """
    dao: typing.Optional[SupplementaryStatisticsDB] = current_app.jeeves.supplementary_dao
    if dao is None:
        result = None
        abort(404, "Suplementary data not available")
    else:
        result = dao
    return result

@suplementary.route("/api/v1/suplementary/phenotype/<phenotype>", methods=["GET"])
def suplementary_phenotype(phenotype : str) -> Response:
    """
    Endpoint to return suplementary statitics for phenotype.

    :param variant: phenotype
    :return: response
    """
    dao: SupplementaryStatisticsDB = get_dao()
    data = dao.get_phenotype_statistics(phenotype)
    result = Response(data, mimetype="application/json")
    return result


@suplementary.route("/api/v1/suplementary/variant/<variant>", methods=["GET"])
def suplementary_variant(variant : str) -> Response:
    """
    Endpoint to return suplementary statitics for a variant.

    :param variant: variant
    :return: response
    """
    dao: SupplementaryStatisticsDB = get_dao()
    parsed = Variant.from_str(variant)
    if parsed is None:
        abort(400, f"could not parse variant '{variant}'")
    else:
        data = dao.get_variant_statistics(parsed)
        result = Response(data, mimetype="application/json")
    return result
