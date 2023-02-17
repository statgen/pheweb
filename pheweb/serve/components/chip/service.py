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
from pheweb.serve.components.chip.variant import Variant
from pheweb.serve.components.chip.exceptions import ParseException, NotFoundException

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


@chip.route('/api/v1/chip/top')
def top_data():
    return get_dao().top_results

@chip.route('/api/v1/chip/results/<query>')
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
    

@chip.route('/api/v1/chip/cluster_plot/<variant>', methods=["GET"])
def get_cluster_plot(variant : str):
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
