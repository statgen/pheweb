import json
from flask import Blueprint, current_app as app, g, request, jsonify
from .tries_dao import create_autocompleter as tries_dao_create_autocompleter
from .sqlite_dao import create_autocompleter as sqlite_dao_create_autocompleter

def createAutocompleter(phenos):
    """
    Attempt to construct autocomplete
    """
    result = None
    if result is None:
        result = tries_dao_create_autocompleter(phenos)
    if result is None:
        result = sqlite_dao_create_autocompleter(phenos)
    return result
    
autocomplete = Blueprint('autocomplete', __name__)

def create_autocompleter():
    if not hasattr(autocomplete, 'autocompleter'):
        autocomplete.autocompleter = createAutocompleter(app.use_phenos)
        assert not autocomplete.autocompleter is None, "could not configure auto complete"
    return autocomplete.autocompleter

@autocomplete.route('/api/autocomplete', methods=["GET"])
def get_autocomplete():
    query = request.args.get('query', '')
    suggestions = create_autocompleter().autocomplete(query)
    if suggestions:
        return jsonify(sorted(suggestions, key=lambda sugg: sugg['display']))
    return jsonify([])

@autocomplete.route('/api/go', methods=["GET"])
def api_go():
    query = request.args.get('query', '')
    best_suggestion = create_autocompleter().get_best_completion(query)
    return json.dumps(best_suggestion)
