import json
from flask import Blueprint, current_app as app, g, request
from colocalization.model import nvl, Colocalization, SearchSummary, SearchResults, ChromosomeRange, ChromosomePosition
colocalization = Blueprint('colocalization', __name__)
development = Blueprint('development', __name__)


@colocalization.route('/api/colocalization', methods=["GET"])
def get_phenotype():
    return json.dumps(app.dao.get_phenotype(flags={}).json_rep())

@colocalization.route('/api/colocalization/<string:phenotype>/<string:chromosome>:<int:start>-<int:stop>', methods=["GET"])
def do_list_colocalization(phenotype: str,
                           chromosome: str,
                           start: int,
                           stop: int):
    return json.dumps(app.dao.get_phenotype_range(phenotype=phenotype,
                                                  chromosome_range=ChromosomeRange(chromosome,
                                                                                   start,
                                                                                   stop),
                                                  flags=request.args.to_dict()).json_rep())


@colocalization.route('/api/colocalization/<string:phenotype>/<string:chromosome>:<int:start>-<int:stop>/summary', methods=["GET"])
def do_summary_colocalization(phenotype: str,
                              chromosome: str,
                              start: int,
                              stop: int):
    return json.dumps(app.dao.get_phenotype_range_summary(phenotype=phenotype,
                                                          chromosome_range=ChromosomeRange(chromosome,
                                                                                           start,
                                                                                           stop),
                                                          flags=request.args.to_dict()).json_rep())


@colocalization.route('/api/colocalization/<string:phenotype>/locus_id/chr<string:chromosome>_<int:position>_<string:reference>_<string:alternate>', methods=["GET"])
def do_locus_colocalization(phenotype: str,
                            chromosome: str,
                            position: int,
                            reference: str,
                            alternate: str):
    return json.dumps(app.dao.get_locus(phenotype=phenotype,
                                        locus=ChromosomePosition(chromosome,
                                                                 position,
                                                                 reference,
                                                                 alternate),
                                        flags=request.args.to_dict()).json_rep())


@development.route('/api/colocalization', methods=["POST"])
def post_phenotype1():
    f = request.files['csv']
    path = secure_filename(f.filename)
    path = os.path.join(upload_dir, path)
    f.save(path)
    return json.dumps(app.dao.load_data(path))
