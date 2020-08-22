import json
from flask import Blueprint, current_app as app, g, request
from .model import Locus

colocalization = Blueprint('colocalization', __name__)
development = Blueprint('development', __name__)


@colocalization.route('/api/colocalization', methods=["GET"])
def get_phenotype():
    print(dir(app))
    app_dao = app.jeeves.colocalization
    return json.dumps(app_dao.get_phenotype(flags={}).json_rep())

@colocalization.route('/api/colocalization/<string:phenotype>/<string:chromosome>:<int:start>-<int:stop>', methods=["GET"])
def get_locus(phenotype: str,
              chromosome: str,
              start: int,
              stop: int):
    app_dao = app.jeeves.colocalization
    flags = request.args.to_dict()
    return json.dumps(app_dao.get_locus(phenotype=phenotype,
                                        locus = Locus(chromosome,
                                                      start,
                                                      stop),
                                        flags=flags).json_rep(), default=lambda o: None)


@colocalization.route('/api/colocalization/<string:phenotype>/<string:chromosome>:<int:start>-<int:stop>/summary', methods=["GET"])
def do_summary_colocalization(phenotype: str,
                              chromosome: str,
                              start: int,
                              stop: int):
  app_dao = app.jeeves.colocalization
  flags = request.args.to_dict()
  return json.dumps(app_dao.get_locus_summary(phenotype=phenotype,
                                              locus = Locus(chromosome,
                                                            start,
                                                            stop),
                                              flags=flags).json_rep())

@colocalization.route('/api/colocalization/<string:phenotype>/<string:chromosome>:<int:start>-<int:stop>/finemapping', methods=["GET"])
def get_finemapping(phenotype: str,
                    chromosome: str,
                    start: int,
                    stop: int):
    app_dao = app.jeeves.colocalization
    flags = request.args.to_dict()
    return json.dumps(app_dao.get_finemapping(phenotype=phenotype,
                                              locus = Locus(chromosome,
                                                            start,
                                                            stop),
                                              flags=flags).json_rep())

@development.route('/api/colocalization', methods=["POST"])
def post_phenotype1():
    f = request.files['csv']
    path = secure_filename(f.filename)
    path = os.path.join(upload_dir, path)
    f.save(path)
    return json.dumps(app_dao.load_data(path))
