#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

import psycopg2
import json
import os.path
import pysam
import itertools
import re

from flask import Flask, Response, jsonify, render_template, request, redirect, url_for, abort
app = Flask(__name__)

with open(os.path.join(app.root_path, 'data/phenos.json')) as f:
    phenos = json.load(f)

def parse_query(query, default_chrom_pos = True):
    if isinstance(query, unicode):
        query = query.encode('utf-8')
    chrom_pattern = r'(?:chr)?([0-9]+)'
    chrom_pos_pattern = chrom_pattern + r'[-_:/ ]([0-9]+)'
    chrom_pos_ref_alt_pattern = chrom_pos_pattern + r'[-_:/ ]([-ATCG]+)[-_:/ ]([-ATCG]+)'

    match = re.match(chrom_pos_ref_alt_pattern, query) or re.match(chrom_pos_pattern, query) or re.match(chrom_pattern, query)
    g = match.groups() if match else ()

    if default_chrom_pos:
        if len(g) == 0: g += ('1',)
        if len(g) == 1: g += (0,)
    if len(g) >= 2: g = (g[0], int(g[1])) + g[2:]
    return g + tuple(itertools.repeat(None, 4-len(g)))

def parse_marker_id(marker_id):
    chr1, pos1, ref, alt, chr2, pos2 = re.match(r'([^:]+):([0-9]+)_([-ATCG]+)/([-ATCG]+)_([^:]+):([0-9]+)', marker_id).groups()
    assert chr1 == chr2
    assert pos1 == pos2
    return chr1, pos1, ref, alt

@app.route('/api/autocomplete/<query>')
def autocomplete(query):
    chrom, pos, ref, alt = parse_query(query)
    if pos is None:
        pos = 1
    pos -= 1 # pysam skips variants at the start position.
    if chrom is None:
        chrom = '1'

    tabix_file = pysam.TabixFile('/var/pheweb_data/phewas_maf_gte_1e-2_ncases_gte_20_sites.vcf.gz')
    tabix_iter = tabix_file.fetch(chrom, pos, parser = pysam.asTuple())
    next_10 = [tuple(variant)[2] for variant in itertools.islice(tabix_iter, 0, 10)]
    next_10 = ['{}:{}-{}-{}'.format(*parse_marker_id(marker_id)) for marker_id in next_10]

    return Response(json.dumps(next_10), mimetype='application/json')

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
