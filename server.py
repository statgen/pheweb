#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

import psycopg2
import json
import os.path
import pysam
import itertools
import re
import gzip

from utils import parse_variant, parse_marker_id, make_marker_id
from autocomplete import get_autocompletion

from flask import Flask, Response, jsonify, render_template, request, redirect, url_for, abort, flash, send_from_directory
app = Flask(__name__)
app.config.from_object('flask_config')

with open(os.path.join(app.root_path, 'data/phenos.json')) as f:
    phenos = json.load(f)

with gzip.open('/var/pheweb_data/phewas_maf_gte_1e-2_ncases_gte_20.vcf.gz') as f:
    header = f.readline().rstrip('\n').split('\t')
    assert header[:4] == ['#CHROM', 'BEG', 'MARKER_ID', 'MAF']
    for colnum, colname in enumerate(header):
        if colnum <= 3: continue
        elif colnum % 2 == 0:
            phewas_code = colname.rstrip('.P')
            phenos[phewas_code]['colnum_pval'] = colnum
        else:
            phewas_code = colname.rstrip('.B')
            phenos[phewas_code]['colnum_beta'] = colnum
for phewas_code in phenos:
    assert 'colnum_pval' in phenos[phewas_code] and 'colnum_beta' in phenos[phewas_code]

def get_phenos(): # TODO why can't I use `phenos` in routes?
    return phenos

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
    suggestions = get_autocompletion(query, phenos)
    if suggestions:
        return redirect(suggestions[0]['url'])
    die("Couldn't find page for {!r}".format(query))

def get_variant(query):
    # todo: differentiate between parse errors and variants-not-found
    chrom, pos, ref, alt = parse_variant(query)
    assert None not in [chrom, pos, ref, alt]
    marker_id = make_marker_id(chrom, pos, ref, alt)

    tabix_file = pysam.TabixFile('/var/pheweb_data/phewas_maf_gte_1e-2_ncases_gte_20.vcf.gz')
    tabix_iter = tabix_file.fetch(chrom, pos, pos+1, parser = pysam.asTuple())
    for variant_row in tabix_iter:
        if variant_row[2] == marker_id:
            matching_variant_row = tuple(variant_row)
            break
    else: # didn't break
        return None

    rv = {
        'variant_name': '{} : {:,} {}>{}'.format(chrom, pos, ref, alt),
        'chrom': chrom,
        'pos': pos,
        'ref': ref,
        'alt': alt,
        'phenos': [],
    }
    for phewas_code, pheno in get_phenos().iteritems():
        rv['phenos'].append({
            'phewas_code': phewas_code,
            'phewas_string': pheno['phewas_string'],
            'category_name': pheno['category_string'],
            'num_cases': pheno['num_cases'],
            'num_controls': pheno['num_controls'],
            'pval': float(matching_variant_row[pheno['colnum_pval']]),
            # 'beta': float(matching_variant_row[pheno['colnum_beta']]),
        })

    return rv

@app.route('/api/variant/<query>')
def api_variant(query):
    variant = get_variant(query)
    return Response(json.dumps(variant), mimetype='application/json')

@app.route('/variant')
def variant_page_with_get_params():
    # TODO: instead of this route, make the form submit to the right url.
    query = request.args.get('query', '')
    return redirect(url_for('variant_page', query=query))

@app.route('/variant/<query>')
def variant_page(query):
    try:
        variant = get_variant(query)
        if variant is None:
            die("Sorry, I couldn't find the variant {}".format(query))
        return render_template('variant.html',
                               variant=variant)
    except:
        abort(404)

@app.route('/api/pheno/<path:path>')
def api_pheno(path):
    return send_from_directory('/var/pheweb_data/gwas-json/', path)

@app.route('/pheno/<phewas_code>')
def pheno_page(phewas_code):
    try:
        pheno = phenos[phewas_code]
    except:
        die("Sorry, I couldn't find the phewas code {!r}".format(phewas_code))
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

def die(message):
    flash(message)
    abort(404)

@app.errorhandler(404)
def error_page(message):
    return render_template(
        'error.html',
        message=message
    ), 404


if __name__ == '__main__':
    extra_files = 'templates/about.html templates/error.html templates/index.html templates/layout.html templates/variant.html templates/pheno.html'.split()
    app.run(host='browser.sph.umich.edu', port=5000, threaded=True, debug=False, use_reloader=True, extra_files=extra_files)
