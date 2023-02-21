# -*- coding: utf-8 -*-
"""
Endpoint for coding data.

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

from .model import CodingDAO, JeevesContext
from pheweb.serve.components.coding.variant import Variant
from pheweb.serve.components.coding.exceptions import ParseException, NotFoundException

coding = Blueprint("pheweb_coding", __name__)
development = Blueprint("development", __name__)


app.jeeves: JeevesContext  # type: ignore


def get_dao(current_app=app) -> CodingDAO:
    """ "
    Get DAO.

    Get DAO object stored in jeeves.
    Return 404 if not available as
    it means the coding data is not
    available.
    """
    dao: typing.Optional[CodingDAO] = current_app.jeeves.coding_dao
    if dao is None:
        result = None
        abort(404, "Coding data not available")
    else:
        result = dao
    return result


@coding.route('/api/v1/coding/top')
def top_data():
    return get_dao().top_results

@coding.route('/api/v1/coding/results/<query>')
def get_results(query):
    try:
        var = Variant(query)
        index_range = get_dao().get_variant_range(var)
        results = get_dao().get_results(index_range)
    except (ParseException, NotFoundException):
        try:
            index_range = get_dao().get_gene_range(query)
            results = get_dao().get_results(index_range, query)
        except NotFoundException:
            if query.startswith('rs'):
                return jsonify({'message': 'no gene or variant found. searching with rsids does not work yet, please use gene name or chr-pos-ref-alt'}), 404
            else:
                return jsonify({'message': 'no gene or variant found. if you\'re looking for a gene, you can try with another name for that gene.'}), 404
    return jsonify(results)


@coding.route('/api/v1/coding/cluster_plot/<variant>', methods=["GET"])
def get_cluster_plot(variant : str):
    """
    Endpoint to return cluster plot for variant.

    :param variant: variant
    :return: response
    """
    dao: CodingDAO = get_dao()
    data = dao.get_cluster_plot(variant)
    if data is None:
        result = None
        abort(404, "Requested cluster plot not found!")
    else:
        result = Response(data, mimetype="image/png")
    return result
