#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

# Load config
import os.path
import imp
my_dir = os.path.dirname(os.path.abspath(__file__))
conf = imp.load_source('conf', os.path.join(my_dir, 'config.config'))

# Activate virtualenv
activate_this = os.path.join(conf.virtualenv_dir, 'bin/activate_this.py')
execfile(activate_this, dict(__file__=activate_this))

from flask import Flask, Response, jsonify, render_template, request, redirect, url_for, abort, flash, send_from_directory
from flask_compress import Compress

from utils import get_phenos_with_colnums, get_variant
from autocomplete import get_autocompletion, get_best_completion, cpra_to_rsids_trie



app = Flask(__name__)
app.config.from_object('flask_config')
Compress(app)

phenos = get_phenos_with_colnums(app.root_path)

@app.route('/api/autocomplete')
def autocomplete():
    query = request.args.get('query', '')
    suggestions = get_autocompletion(query, phenos)
    if suggestions:
        return jsonify(sorted(suggestions, key=lambda sugg: sugg['display']))
    return jsonify([])

@app.route('/go')
def go():
    query = request.args.get('query', None)
    if query is None:
        die("How did you manage to get a null query?")
    best_suggestion = get_best_completion(query, phenos)
    if best_suggestion:
        return redirect(best_suggestion['url'])
    die("Couldn't find page for {!r}".format(query))

@app.route('/api/variant/<query>')
def api_variant(query):
    variant = get_variant(query, phenos, cpra_to_rsids_trie)
    return jsonify(variant)

@app.route('/variant/<query>')
def variant_page(query):
    try:
        variant = get_variant(query, phenos, cpra_to_rsids_trie)
        if variant is None:
            die("Sorry, I couldn't find the variant {}".format(query.encode('utf-8')))
        return render_template('variant.html',
                               variant=variant)
    except:
        die('Oh no, something went wrong')

@app.route('/api/manhattan/pheno/<filename>')
def api_pheno(filename):
    return send_from_directory(conf.data_dir + '/manhattan/', filename)

@app.route('/api/qq/pheno/<filename>')
def api_pheno_qq(filename):
    return send_from_directory(conf.data_dir + '/qq/', filename)

@app.route('/pheno/<phewas_code>')
def pheno_page(phewas_code):
    try:
        pheno = phenos[phewas_code]
    except:
        die("Sorry, I couldn't find the phewas code {!r}".format(phewas_code.encode('utf-8')))
    return render_template('pheno.html',
                           phewas_code=phewas_code,
                           pheno=pheno,
    )

@app.route('/')
def homepage():
    return render_template('index.html')

@app.route('/about')
def about_page():
    return render_template('about.html')

def die(message='no message'):
    flash(message)
    abort(404)

@app.errorhandler(404)
def error_page(message):
    return render_template(
        'error.html',
        message=message
    ), 404

# Resist some CSRF attacks
@app.after_request
def apply_caching(response):
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    return response

if __name__ == '__main__':
    import argparse
    import glob
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=5001, help='an integer for the accumulator')
    args = parser.parse_args()
    extra_files = glob.glob('templates/*.html')
    app.run(host='browser.sph.umich.edu', port=args.port,
#            threaded=True, # seems to be bad at dying when I ctrl-C / SIGTERM.
            debug=True, use_reloader=True, extra_files=extra_files)
