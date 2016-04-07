#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

import psycopg2
import json

from flask import Flask, Response, jsonify, render_template, request, redirect, url_for, abort
app = Flask(__name__)

# LATER: maybe put this in a caching function
with open('postgres_password_readonly') as f:
    postgres_password = f.read()
conn = psycopg2.connect(dbname="postgres", user="pheweb_reader", password=postgres_password, host="localhost")
curs = conn.cursor()

@app.route('/api/autocomplete/<query>')
def autocomplete(query):
    curs.execute("SELECT name FROM pheweb.variants WHERE name LIKE %s LIMIT 10",
                 (query + '%',))
    suggestions = [r[0] for r in curs]
    return Response(json.dumps(suggestions), mimetype='application/json')

@app.route('/api/icd9_info/<phewas_code>')
def api_icd9_info(phewas_code):
    curs.execute('SELECT icd9_info FROM pheweb.phenos WHERE phewas_code = %s', (phewas_code,))
    icd9_info = [r[0] for r in curs]
    if len(icd9_info) == 0:
        return 'bad phewas_code', 404
    assert len(icd9_info) == 1
    return Response(json.dumps(icd9_info[0], indent=2, sort_keys=True), mimetype='application/json')

@app.route('/api/variant/<variant_name>')
def api_variant(variant_name):
    variant = get_variant(variant_name)
    return Response(json.dumps(variant, indent=2, sort_keys=True), mimetype='application/json')

def get_variant(variant_name):
    # todo: handle rsids
    # todo: handle 22-1234-A-C -> :
    curs.execute('SELECT id FROM pheweb.variants WHERE name = %s', (variant_name,))
    variant_ids = [r[0] for r in curs]
    if len(variant_ids) == 0:
        raise Exception('bad variant name')
    assert len(variant_ids) == 1, variant_ids
    variant_id = variant_ids[0]

    curs.execute('SELECT '
                 'pheweb.categories.name, '
                 'pheweb.phenos.num_cases, pheweb.phenos.num_controls, pheweb.phenos.phewas_code, pheweb.phenos.phewas_string, '
                 'pheweb.associations.pval '
                 'FROM pheweb.associations '
                 'JOIN pheweb.phenos ON pheweb.associations.pheno_id = pheweb.phenos.id '
                 'JOIN pheweb.categories ON pheweb.categories.id = pheweb.phenos.category_id '
                 'WHERE pheweb.associations.variant_id = %s '
                 'ORDER BY pheweb.phenos.phewas_code',
                 (variant_id,))
    phenos = list(dict(zip('category_name num_cases num_controls phewas_code phewas_string pval'.split(),r)) for r in curs)
    assert len(phenos) > 0
    return {
        'variant_name': variant_name,
        'phenos': phenos,
    }

@app.route('/variant')
def variant_page_with_get_params():
    query = request.args.get('query', '')
    return redirect(url_for('variant_page', query=query))

@app.route('/variant/<query>')
def variant_page(query):
    try:
        variant = get_variant(query)
        return render_template('variant.html',
                               variant=variant)
    except:
        # abort(404) # TODO: use this.
        raise

@app.route('/')
def homepage():
    return render_template('index.html')

@app.route('/about')
def about_page():
    return render_template('about.html')

@app.errorhandler(404)
def error_page(message):
    return render_template(
        'error.html',
        message=message
    ), 404


if __name__ == '__main__':
    app.run(host='browser.sph.umich.edu', port=5000, debug=True)
