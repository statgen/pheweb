import json
import typing
from flask import Blueprint, current_app as app, request, jsonify, abort
from .dao import AutocompleterDAO, QUERY_LIMIT
from pheweb.serve.components.model import ComponentCheck, ComponentStatus, ComponentDTO

def get_dao(current_app=app) -> AutocompleterDAO:
    """
    Get DAO
    """
    dao: typing.Optional[AutocompleterDAO] = current_app.jeeves.autocompleter_dao
    if dao is None:
        result = None
        abort(500, "Autocompleter not available")
    else:
        result = dao
    return result

class AutocompleteComponentCheck(ComponentCheck):
    def get_name(self,) -> str:
        return "autocomplete"
    
    def get_status(self,) -> ComponentStatus:
        dao = get_dao()
        if dao is None:
            result = ComponentStatus(False, ["dao is not available"])
        else:
            result = dao.get_status()
        return result


autocomplete = Blueprint('autocomplete', __name__)

@autocomplete.route('/api/autocomplete', methods=["GET"])
def get_autocomplete():
    queries = request.args.getlist('query', type=str)
    suggestions = [ suggestion for query in queries for suggestion in sorted(get_dao().autocomplete(query), key=lambda sugg: sugg['display']) ]
    suggestions = suggestions[0:QUERY_LIMIT]
    if suggestions:
        return jsonify(suggestions)
    return jsonify([])

@autocomplete.route('/api/go', methods=["GET"])
def api_go():
    query = request.args.get('query', '')
    best_suggestion = get_dao().get_best_completion(query)
    return json.dumps(best_suggestion)

component = ComponentDTO(autocomplete, AutocompleteComponentCheck())
