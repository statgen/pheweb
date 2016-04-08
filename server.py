#!/usr/bin/env python2

from __future__ import print_function, division, absolute_import

import psycopg2
import json
import os.path
import pysam
import itertools
import re
import gzip

from flask import Flask, Response, jsonify, render_template, request, redirect, url_for, abort, flash
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

def make_marker_id(chrom, pos, ref, alt):
    return '{chrom}:{pos}_{ref}/{alt}_{chrom}:{pos}'.format(chrom=chrom, pos=pos, ref=ref, alt=alt)

@app.route('/api/autocomplete/<query>')
def autocomplete(query):
    chrom, pos, ref, alt = parse_query(query)
    pos = max(0, pos-1) # pysam skips variants at the start position.

    tabix_file = pysam.TabixFile('/var/pheweb_data/phewas_maf_gte_1e-2_ncases_gte_20_sites.vcf.gz')
    tabix_iter = tabix_file.fetch(chrom, pos, parser = pysam.asTuple())
    next_10 = [variant[2] for variant in itertools.islice(tabix_iter, 0, 10)]
    next_10 = ['{}:{}-{}-{}'.format(*parse_marker_id(marker_id)) for marker_id in next_10]

    return Response(json.dumps(next_10), mimetype='application/json')

def get_variant(query):
    # todo: handle rsids
    # todo: differentiate between parse errors and variants-not-found (and later, rsid-not-found)
    chrom, pos, ref, alt = parse_query(query)
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
        'variant_name': '{}:{} {}>{}'.format(chrom, pos, ref, alt),
        'phenos': []
    }
    for phewas_code, pheno in get_phenos().items():
        rv['phenos'].append({
            'phewas_code': phewas_code,
            'phewas_string': pheno['phewas_string'],
            'category_name': pheno['category_string'],
            'num_cases': pheno['num_cases'],
            'num_controls': pheno['num_controls'],
            'pval': float(matching_variant_row[pheno['colnum_pval']]),
            'beta': float(matching_variant_row[pheno['colnum_beta']]),
        })

    return rv

@app.route('/api/variant/<query>')
def api_variant_page(query):
    variant = get_variant(query)
    return Response(json.dumps(variant), mimetype='application/json')

@app.route('/variant')
def variant_page_with_get_params():
    # TODO: instead of this route, make the form submit to the right url.
    query = request.args.get('query', '')
    return redirect(url_for('variant_page', query=query))

@app.route('/variant/<query>')
def variant_page(query):
    variant = get_variant(query)
    if variant is None:
        flash("Sorry, I couldn't find the variant {}".format(query))
        abort(404)
    return render_template('variant.html',
                           variant=variant)

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
