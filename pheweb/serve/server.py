



from .. import utils
conf = utils.conf

from flask import Flask, jsonify, render_template, request, redirect, abort, flash, send_from_directory
from flask_compress import Compress

from .autocomplete import Autocompleter
from . import region

import re
import traceback
import sys

app = Flask(__name__)
Compress(app)
app.config['SECRET_KEY'] = conf.SECRET_KEY if hasattr(conf, 'SECRET_KEY') else 'nonsecret key'
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 9

if 'custom_templates' in conf:
    app.jinja_loader.searchpath.insert(0, conf.custom_templates)

phenos = utils.get_phenos_with_colnums(app.root_path)

autocompleter = Autocompleter(phenos)

@app.route('/api/autocomplete')
def autocomplete():
    query = request.args.get('query', '')
    suggestions = autocompleter.autocomplete(query)
    if suggestions:
        return jsonify(sorted(suggestions, key=lambda sugg: sugg['display']))
    return jsonify([])

@app.route('/go')
def go():
    query = request.args.get('query', None)
    if query is None:
        die("How did you manage to get a null query?")
    best_suggestion = autocompleter.get_best_completion(query)
    if best_suggestion:
        return redirect(best_suggestion['url'])
    die("Couldn't find page for {!r}".format(query))

@app.route('/api/variant/<query>')
def api_variant(query):
    variant = utils.get_variant(query, phenos)
    return jsonify(variant)

@app.route('/variant/<query>')
def variant_page(query):
    try:
        variant = utils.get_variant(query, phenos)
        if variant is None:
            die("Sorry, I couldn't find the variant {}".format(query))
        return render_template('variant.html',
                               variant=variant)
    except Exception as exc:
        die('Oh no, something went wrong', exc)

@app.route('/api/manhattan/pheno/<filename>')
def api_pheno(filename):
    return send_from_directory(conf.data_dir + '/manhattan/', filename)

@app.route('/api/top_hits.json')
def api_top_hits():
    return send_from_directory(conf.data_dir, 'top_hits.json')

@app.route('/api/qq/pheno/<filename>')
def api_pheno_qq(filename):
    return send_from_directory(conf.data_dir + '/qq/', filename)

@app.route('/top_hits')
def top_hits_page():
    return render_template('top_hits.html')

@app.route('/random')
def random_page():
    url = utils.get_random_page()
    if url is None:
        die("Sorry, it looks like no hits in this pheweb reached the significance threshold.")
    return redirect(url)

@app.route('/pheno/<phenocode>')
def pheno_page(phenocode):
    try:
        pheno = phenos[phenocode]
    except:
        die("Sorry, I couldn't find the pheno code {!r}".format(phenocode))
    return render_template('pheno.html',
                           phenocode=phenocode,
                           pheno=pheno,
    )

@app.route('/region/<phenocode>/<region>')
def region_page(phenocode, region):
    try:
        pheno = phenos[phenocode]
    except:
        die("Sorry, I couldn't find the phewas code {!r}".format(phenocode))
    pheno['phenocode'] = phenocode
    return render_template('region.html',
                           pheno=pheno,
                           region=region,
    )

@app.route('/api/region/<phenocode>/lz-results/') # This API is easier on the LZ side.
def api_region(phenocode):
    filter_param = request.args.get('filter')
    groups = re.match(r"analysis in 3 and chromosome in +'(.+?)' and position ge ([0-9]+) and position le ([0-9]+)", filter_param).groups()
    chrom, pos_start, pos_end = groups[0], int(groups[1]), int(groups[2])
    rv = region.get_rows(phenocode, chrom, pos_start, pos_end)
    return jsonify(rv)


@app.route('/')
def homepage():
    return render_template('index.html')

@app.route('/about')
def about_page():
    return render_template('about.html')

def die(message='no message', exception=None):
    if exception is not None:
        print(exception)
        traceback.print_exc()
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


def run(argv):

    import argparse
    import glob
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', default='0.0.0.0', help='the hostname to use to access this server')
    parser.add_argument('--port', type=int, default=5000, help='an integer for the accumulator')
    args = parser.parse_args(argv)
    app.run(host=args.host, port=args.port,
            threaded=True, # seems to be bad at dying when I ctrl-C / SIGTERM.
            debug=True, use_evalex=False,
            use_reloader=True,
    )
