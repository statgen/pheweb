import typing
from flask import Blueprint, jsonify, current_app as app, render_template, abort, Response

from .dao import ChipDAO, JeevesContext

chip = Blueprint('pheweb_chip', __name__)
development = Blueprint('development', __name__)


app.jeeves: JeevesContext  # type: ignore


def get_dao() -> ChipDAO:
    dao: typing.Optional[ChipDAO] = app.jeeves.chip_dao
    if dao is None:
        abort(404, 'Chip data not available')
    else:
        return dao


@development.route('/')
def index() -> str:
    return render_template('index.html')


@chip.route('/api/v1/chip_data')
def chip_data() -> Response:
    dao: ChipDAO = get_dao()
    return jsonify(dao.get_chip_data())


@chip.route('/api/v1/cluster_plot/<variant>')
def cluster_plot(variant) -> Response:
    dao: ChipDAO = get_dao()
    data = dao.get_cluster_plot(variant)
    if data is None:
        abort(404, 'Requested cluster plot not found!')
    else:
        return Response(data, mimetype='image/png')
