#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

import psycopg2
import json

from flask import Flask, Response, jsonify
app = Flask(__name__)

# LATER: maybe put this in a caching function
with open('postgres_password_readonly') as f:
    postgres_password = f.read()
conn = psycopg2.connect(dbname="postgres", user="pheweb_reader", password=postgres_password, host="localhost")
curs = conn.cursor()

@app.route('/autocomplete/<query>')
def autocomplete(query):
    curs.execute("SELECT name FROM pheweb.variants WHERE name LIKE %s LIMIT 10",
                 (query + '%',))
    suggestions = [r[0] for r in curs]
    return Response(json.dumps(suggestions), mimetype='application/json')

@app.route('/icd9_info/<phewas_code>')
def icd9_info(phewas_code):
    curs.execute('SELECT icd9_info FROM pheweb.phenos WHERE phewas_code = %s', (phewas_code,))
    icd9_info = [r[0] for r in curs]
    if len(icd9_info) == 0:
        return 'bad phewas_code', 404
    assert len(icd9_info) == 1
    return Response(json.dumps(icd9_info[0], indent=2, sort_keys=True), mimetype='application/json')

@app.route('/phewas/<variant_name>')
def phewas(variant_name):
    curs.execute('SELECT id FROM pheweb.variants WHERE name = %s', (variant_name,))
    variant_ids = [r[0] for r in curs]
    if len(variant_ids) == 0:
        return 'bad variant name', 404
    assert len(variant_ids) == 1
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
    rv = list(dict(zip('name num_cases num_controls phewas_code phewas_string pval'.split(),r)) for r in curs)
    return Response(json.dumps(rv, indent=2, sort_keys=True), mimetype='application/json')


if __name__ == '__main__':
    app.run(host='browser.sph.umich.edu', port=5000, debug=True)