from ..utils import get_phenolist, get_use_phenos, get_gene_tuples, pad_gene
from ..conf_utils import conf
from ..file_utils import common_filepaths
from .server_utils import get_pheno_region
from .auth import GoogleSignIn
from ..version import version as pheweb_version

from flask import Blueprint

from .data_access.db import Variant

from flask import Flask, jsonify, render_template, request, redirect, abort, flash, current_app, send_from_directory, send_file, session, url_for,make_response
from flask_compress import Compress
from flask_login import LoginManager, UserMixin, login_user, logout_user, current_user
from .reporting import Report

import urllib
import urllib.parse as urlparse
from urllib.parse import urlencode
import functools
import importlib
import re
import math
import traceback
import json
import os.path
from .data_access import DataFactory
from concurrent.futures import ThreadPoolExecutor

from .server_jeeves  import ServerJeeves

from collections import defaultdict
from .encoder import FGJSONEncoder
from .group_based_auth  import verify_membership

from .server_auth import before_request

from pheweb_colocalization.view import colocalization
from .components.autocomplete.service import autocomplete
from .components.chip.service import chip
from flask_cors import CORS


app = Flask(__name__,
            # this is hack so this it doesn't get confused on the static subdirectory
            static_url_path='/55e2cb41-9305-4f09-97fd-b66c4141d245',
            static_folder='static')

# see: https://flask-cors.readthedocs.io/en/latest/
if 'cors_origins' in conf:
    resources = {r"/api/*": {"origins": conf['cors_origins']}}
    print(f'CORS : {resources}')
    cors = CORS(app, resources=resources)

## allows debug statements in jinja
@app.context_processor
def utility_functions():
    def print_in_console(message):
        print(str(message))

    return dict(mdebug=print_in_console)

Compress(app)

report = Report(app)

app.config['COMPRESS_LEVEL'] = 2 # Since we don't cache, faster=better
app.config['SECRET_KEY'] = conf.SECRET_KEY if hasattr(conf, 'SECRET_KEY') else 'nonsecret key'
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 9
app.config['PREFERRED_URL_SCHEME'] = 'https'

if 'GOOGLE_ANALYTICS_TRACKING_ID' in conf:
    app.config['GOOGLE_ANALYTICS_TRACKING_ID'] = conf['GOOGLE_ANALYTICS_TRACKING_ID']
if 'GLOBAL_SITE_TAG_ID' in conf:
    app.config['GLOBAL_SITE_TAG_ID'] = conf['GLOBAL_SITE_TAG_ID']
if 'SENTRY_DSN' in conf:
    app.config['SENTRY_DSN'] = conf['SENTRY_DSN']
app.config['PHEWEB_VERSION'] = pheweb_version
app.config['browser'] = conf['browser']
app.config['show_ukbb'] = conf['show_ukbb']
app.config['show_risteys'] = conf['show_risteys']
if 'noindex' in conf:
    app.config['noindex'] = conf['noindex']
app.config['release'] = conf['release']
app.config['logo'] = conf['logo']
if 'genome_build' in conf:
    app.config['genome_build'] = conf['genome_build']
else:
    app.config['genome_build'] = 38

app.config['release_prev'] = conf['release_prev']
app.config['title'] = conf['title']
app.config['page_title'] = conf['page_title']
if 'endpoint_def' in conf:
    app.config['endpoint_def'] = conf['endpoint_def']

app.config['ukbb'] = False
for c in conf.database_conf:
    if 'coding' in c:
        app.config['coding'] = True
    if 'chip' in c:
        app.config['chip'] = True
    if 'externalresult' in c and 'ExternalFileResultDao' in c['externalresult']:
        app.config['ukbb'] = True

app.json_encoder = FGJSONEncoder

if os.path.isdir(conf.custom_templates):
    app.jinja_loader.searchpath.insert(0, conf.custom_templates)

phenos = {pheno['phenocode']: pheno for pheno in get_phenolist()}
use_phenos = {phenocode: phenos[phenocode] for phenocode in get_use_phenos()}
app.use_phenos = use_phenos

threadpool = ThreadPoolExecutor(max_workers=4)

jeeves = ServerJeeves( conf )

app.jeeves = jeeves
app.register_blueprint(colocalization)
app.register_blueprint(autocomplete)
app.register_blueprint(chip)


# static resources
resource_dir = None
if "resource_dir" in conf:
    resource_dir = conf['resource_dir']
elif "data_dir" in conf:
    resource_dir = os.path.join(conf['data_dir'], "resources")

if resource_dir:
    static_resources = Blueprint('static_resources',
                                 __name__,
                                 static_url_path='/static/resources',
                                 static_folder=resource_dir)
    app.register_blueprint(static_resources)

# see discussion
# https://stackoverflow.com/questions/13428708/best-way-to-make-flask-logins-login-required-the-default
def is_public(function):
    function.is_public = True
    return function

@app.before_request
def check_auth():
    # check if endpoint is mapped then
    # check if endpoint has is public annotation
    if request.endpoint and (request.endpoint in app.view_functions) and getattr(app.view_functions[request.endpoint], 'is_public', False) :
        result = None
    else: # check authentication
        result = before_request()
    return result

@app.route('/health')
@is_public
def health():
    return jsonify({'health': 'ok'})

# see : https://stackoverflow.com/questions/44209978/serving-a-front-end-created-with-create-react-app-with-flask
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def homepage(path):
    if path != '' and os.path.exists(f'{app.static_folder}/{path}'):
        print(f'{app.static_folder}/{path}')
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/autoreport/<phenocode>')
def autoreport(phenocode):
    return jsonify(jeeves.get_autoreport(phenocode))

@app.route('/api/autoreport_variants/<phenocode>/<locus_id>')
def autoreport_variants(phenocode,locus_id):
    return jsonify(jeeves.get_autoreport_variants(phenocode,locus_id))

@app.route('/api/ld')
def ld():
    url = conf.ld_server + '/api/ld?'
    url_parts = list(urlparse.urlparse(url))
    query = {param: request.args.get(param) for param in request.args}
    url_parts[3] = urlencode(query)
    print(urlparse.urlunparse(url_parts).replace(';', '?'))
    return urllib.request.urlopen(urlparse.urlunparse(url_parts).replace(';', '?')).read()

@app.route('/api/pheno/<phenocode>')
def pheno(phenocode):
    if phenocode not in use_phenos:
        abort(404)
    return jsonify(phenos[phenocode])

@app.route('/api/phenos')
def phenolist():
    return jsonify([pheno for pheno in get_phenolist() if pheno['phenocode'] in use_phenos])

@app.route('/api/variant/<query>')
def api_variant(query):
    try:
        q=re.split('-|:|/|_',query)
        if len(q)!=4:
            die("Malformed variant query. Use chr-pos-ref-alt")
        v = Variant(q[0].replace('X', '23'),q[1],q[2], q[3])
        variantdat = jeeves.get_single_variant_data(v)
        if variantdat is None:
            die("Sorry, I couldn't find the variant {}".format(query))
        variantdat = (variantdat[0], [pheno for pheno in variantdat[1] if pheno.phenocode in use_phenos])
        regions = jeeves.get_finemapped_regions(v)
        if regions is not None:
            regions = [region for region in regions if region['phenocode'] in use_phenos]
        result = { "variant" : variantdat[0] ,
                   "results" : variantdat[1] ,
                   "regions" : regions ,
                   "tooltip_lztemplate" : conf.parse.tooltip_lztemplate ,
                   "var_top_pheno_export_fields" : conf.var_top_pheno_export_fields ,
                   "vis_conf" : conf.vis_conf }
        return result
    except Exception as exc:
        die('Oh no, something went wrong', exc)

@app.route('/api/manhattan/pheno/<phenocode>')
def api_pheno(phenocode):
    if phenocode not in use_phenos:
        abort(404)
    try:
        return jeeves.get_pheno_manhattan(phenocode)
    except Exception as exc:
        die("Sorry, your manhattan request for phenocode {!r} didn't work".format(phenocode), exception=exc)

@app.route('/api/gene_phenos/<gene>')
def api_gene_phenotypes(gene):
    gene_region_mapping = jeeves.get_gene_region_mapping()
    chrom, start, end = gene_region_mapping[gene]
    start, end = pad_gene(start, end)
    phenotypes = [res for res in jeeves.gene_phenos(gene) if res.pheno['phenocode'] in use_phenos]
    region = { "chrom" : chrom ,
               "start" : start ,
               "end" : end }
    result = { "phenotypes" : phenotypes ,
               "region" : region }
    return jsonify( result )

@app.route('/api/gene_functional_variants/<gene>')
def api_gene_functional_variants(gene):
    pThreshold=1.1
    if ('p' in request.args):
        pThreshold= float(request.args.get('p'))
    annotations = jeeves.gene_functional_variants(gene, pThreshold)
    for anno in annotations:
        anno['significant_phenos'] = [pheno for pheno in anno['significant_phenos'] if pheno.phenocode in use_phenos]
    return jsonify(annotations)

@app.route('/api/lof')
def api_lof():
    lofs = [lof for lof in jeeves.get_all_lofs(conf.lof_threshold) if lof['gene_data']['pheno'] in use_phenos]
    if lofs is None:
        die("LoF data not available")
    return jsonify(sorted(lofs,  key=lambda lof: lof['gene_data']['p_value']))

@app.route('/api/lof/<gene>')
def api_lof_gene(gene):
    lofs = jeeves.get_gene_lofs(gene)
    lofs_use = []
    for lof in lofs:
        if lof['gene_data']['pheno'] in use_phenos:
            lof['gene_data']['phenostring'] = phenos[lof['gene_data']['pheno']]['phenostring']
            lof['gene_data']['beta'] = '{:.3f}'.format(float(lof['gene_data']['beta']))
            lofs_use.append(lof)
    return jsonify(lofs_use)

@app.route('/api/top_hits.json')
def api_top_hits():
    return send_file(common_filepaths['top-hits-1k'])

@app.route('/download/top_hits.tsv')
def download_top_hits():
    return send_file(common_filepaths['top-hits-tsv'])

@app.route('/api/qq/pheno/<phenocode>')
def api_pheno_qq(phenocode):
    if phenocode not in use_phenos:
        abort(404)
    return send_from_directory(common_filepaths['qq'](''), phenocode + '.json')

@app.route('/api/coding_data')
def coding_data():
    data = [d for d in jeeves.coding() if d['pheno'] in use_phenos]
    return jsonify(data)

@app.route('/api/chip_data')
def chip_data():
    data = [d for d in jeeves.chip() if d['pheno'] in use_phenos]
    return jsonify(data)

@app.route('/api/ukbb_n/<phenocode>')
def ukbb_ns(phenocode):
    if phenocode not in use_phenos:
        abort(404)
    return jsonify(jeeves.get_UKBB_n(phenocode))

@app.route('/api/region/<phenocode>/<region>')
def api_region_page(phenocode, region):
    if phenocode not in use_phenos:
        abort(404)
    pheno = phenos[phenocode]
    chr_se = region.split(':')
    chrom = chr_se[0]
    chrom = 23 if str(chrom) == 'X' else int(chrom)
    start_end = jeeves.get_max_finemapped_region(phenocode, chrom, chr_se[1].split('-')[0], chr_se[1].split('-')[1])
    if start_end is not None:
        cond_fm_regions = jeeves.get_finemapped_region_boundaries_for_pheno('all', phenocode, chrom, int(chr_se[1].split('-')[0]), int(chr_se[1].split('-')[1]))
    else:
        cond_fm_regions = []
    print(cond_fm_regions)
    pheno['phenocode'] = phenocode
    data = { 'pheno' : pheno ,
             'region' : region,
             'cond_fm_regions' : cond_fm_regions ,
             'tooltip_lztemplate' : conf.parse.tooltip_lztemplate,
             'lz_conf' : conf.locuszoom_conf,
             'ld_panel_version' : conf.ld_panel_version,
             'vis_conf' : conf.vis_conf ,
             'genome_build' : app.config['genome_build'] ,
             'browser' : app.config['browser'] }
    return jsonify(data)

@app.route('/api/region/<phenocode>/lz-results/') # This API is easier on the LZ side.
def api_region(phenocode):
    if phenocode not in use_phenos:
        abort(404)
    filter_param = request.args.get('filter')
    groups = re.match(r"analysis in 3 and chromosome in +'(.+?)' and position ge ([0-9]+) and position le ([0-9]+)", filter_param).groups()
    chrom, pos_start, pos_end = groups[0], int(groups[1]), int(groups[2])
    chrom = '23' if str(chrom) == 'X' else chrom
    rv = get_pheno_region(phenocode, chrom, pos_start, pos_end, conf.locuszoom_conf['p_threshold'])
    jeeves.add_annotations(chrom, pos_start, pos_end, [rv])
    return jsonify(rv)

@app.route('/api/conditional_region/<phenocode>/lz-results/')
def api_conditional_region(phenocode):
    if phenocode not in use_phenos:
        abort(404)
    filter_param = request.args.get('filter')
    groups = re.match(r"analysis in 3 and chromosome in +'(.+?)' and position ge ([0-9]+) and position le ([0-9]+)", filter_param).groups()
    chrom, pos_start, pos_end = groups[0], int(groups[1]), int(groups[2])
    rv = jeeves.get_conditional_regions_for_pheno(phenocode, chrom, pos_start, pos_end)
    return jsonify(rv)

@app.route('/api/finemapped_region/<phenocode>/lz-results/')
def api_finemapped_region(phenocode):
    if phenocode not in use_phenos:
        abort(404)
    filter_param = request.args.get('filter')
    groups = re.match(r"analysis in 3 and chromosome in +'(.+?)' and position ge ([0-9]+) and position le ([0-9]+)", filter_param).groups()
    chrom, pos_start, pos_end = groups[0], int(groups[1]), int(groups[2])
    chrom = 23 if str(chrom) == 'X' else int(chrom)
    rv = jeeves.get_finemapped_regions_for_pheno(phenocode, chrom, pos_start, pos_end, prob_threshold=conf.locuszoom_conf['prob_threshold'])
    return jsonify(rv)

@app.route('/api/gene/<genename>')
def gene_api(genename):
    phenos_in_gene = [pheno for pheno in jeeves.get_best_phenos_by_gene().get(genename, []) if pheno['phenocode'] in use_phenos]
    if not phenos_in_gene:
        die("Sorry, that gene doesn't appear to have any associations in any phenotype")
    try:
        phenocode=phenos_in_gene[0]['phenocode']
        gene_region_mapping = jeeves.get_gene_region_mapping()
        chrom, start, end = gene_region_mapping[genename]

        include_string = request.args.get('include', '')
        if include_string:
            include_chrom, include_pos = include_string.split('-')
            include_pos = int(include_pos)
            assert include_chrom == chrom
            if include_pos < start:
                start = include_pos - (end - start) * 0.01
            elif include_pos > end:
                end = include_pos + (end - start) * 0.01
        start, end = pad_gene(start, end)

        pheno = phenos[phenocode]

        phenos_in_gene = []
        for pheno_in_gene in jeeves.get_best_phenos_by_gene().get(genename, []):
            if pheno_in_gene['phenocode'] in use_phenos:
                phenos_in_gene.append({
                    'pheno': {k:v for k,v in phenos[pheno_in_gene['phenocode']].items() if k not in ['assoc_files', 'colnum']},
                    'assoc': {k:v for k,v in pheno_in_gene.items() if k != 'phenocode'},
                })

        gene_information = { "pheno" :  pheno,
                             "significant_phenos" : phenos_in_gene,
                             "gene_symbol" : genename,
                             "region" : f'{chrom}-{start}-{end}',
                             "start" : start ,
                             "end" : end ,
                             "tooltip_lztemplate" : conf.parse.tooltip_lztemplate,
                             "lz_conf" : conf.locuszoom_conf,
                             "ld_panel_version" : conf.ld_panel_version,
                             "gene_pheno_export_fields" : conf.gene_pheno_export_fields,
                             "drug_export_fields" : conf.drug_export_fields,
                             "lof_export_fields" : conf.lof_export_fields,
                              "func_var_report_p_threshold" : conf.report_conf["func_var_assoc_threshold"] }

        return jsonify(gene_information)
    except Exception as exc:
        die("Sorry, your region request for phenocode {!r} and gene {!r} didn't work".format(phenocode, genename), exception=exc)

@app.route('/api/genereport/<genename>')
def gene_report(genename):
    phenos_in_gene = [pheno for pheno in jeeves.get_best_phenos_by_gene().get(genename, []) if pheno['phenocode'] in use_phenos]
    if not phenos_in_gene:
        die("Sorry, that gene doesn't appear to have any associations in any phenotype")
    func_vars = jeeves.gene_functional_variants( genename,  conf.report_conf['func_var_assoc_threshold'])
    for func_var in func_vars:
        func_var['significant_phenos'] = [pheno for pheno in func_var['significant_phenos'] if pheno.phenocode in use_phenos]
    funcvar = []
    chunk_size = 10

    def matching_ukbb(res):
        ukbline = ''
        ukbdat = res.get_matching_result('ukbb')
        if( ukbdat is not None):
            pval = float( ukbdat['pval'] )
            beta = float( ukbdat['beta'] )
            ukbline = ' \\newline UKBB: ' + (' $\\Uparrow$ ' if beta>=0 else ' $\Downarrow$ ') + ', p:' + '{:.2e}'.format(pval)
        return ukbline

    for var in func_vars:
        i = 0
        if len(var['significant_phenos'])==0:
            funcvar.append( { 'rsid': var['var'].get_annotation('rsids'),
                              'variant': var['var'].id.replace(':', ' '),
                              'gnomad': var['var'].get_annotation('gnomad'),
                              'consequence': var['var'].get_annotation('annot')['most_severe'].replace('_', ' ').replace(' variant', ''),
                              'nSigPhenos': len(var['significant_phenos']),
                              'maf': var['var'].get_annotation('annot')['AF'],
                              'info': var['var'].get_annotation('annot')['INFO'] ,
                              'sigPhenos': 'NONE' })
            continue

        while i < len(var['significant_phenos']):
            phenos = var['significant_phenos'][i:min(i+chunk_size,len(var['significant_phenos']))]
            sigphenos = '\\newline \\medskip '.join( list(map(lambda x: (x.phenostring if x.phenostring!='' else x.phenocode if x.phenocode!='' else 'NA') + ' \\newline (OR:' + '{:.2f}'.format( math.exp(x.beta)) + ',p:'  + '{:.2e}'.format(x.pval) + ')' +  matching_ukbb(x) + ' ' , phenos)))
            if i+chunk_size < len(var['significant_phenos']):
                sigphenos = sigphenos + '\\newline ...'
            funcvar.append( { 'rsid': var['var'].get_annotation('rsids'),
                              'variant': var['var'].id.replace(':', ' '),
                              'gnomad': var['var'].get_annotation('gnomad'),
                              'consequence': var['var'].get_annotation('annot')['most_severe'].replace('_', ' ').replace(' variant', ''),
                              'nSigPhenos': len(var['significant_phenos']),
                              'maf': var['var'].get_annotation('annot')['AF'],
                              'info': var['var'].get_annotation('annot')['INFO'],
                              'sigPhenos': sigphenos })
            i = i + chunk_size
    top_phenos = [res for res in jeeves.gene_phenos(genename) if res.pheno['phenocode'] in use_phenos]
    top_assoc = [ assoc for assoc in top_phenos if assoc.assoc.pval < conf.report_conf['gene_top_assoc_threshold']  ]
    ukbb_match=[]
    for assoc in top_assoc:
        ukbb_match.append(matching_ukbb(assoc.assoc))
    genedata = jeeves.get_gene_data(genename)
    gene_region_mapping = jeeves.get_gene_region_mapping()
    chrom, start, end = gene_region_mapping[genename]

    knownhits = jeeves.get_known_hits_by_loc(chrom,start,end)
    drugs = jeeves.get_gene_drugs(genename)

    ta = list(zip(top_assoc,ukbb_match))
    pdf =  report.render_template('gene_report.tex',
                                  imp0rt = importlib.import_module,
                                  gene=genename,
                                  functionalVars=funcvar,
                                  topAssoc=ta,
                                  geneinfo=genedata,
                                  knownhits=knownhits,
                                  drugs=drugs,
                                  gene_top_assoc_threshold=conf.report_conf['gene_top_assoc_threshold'],
                                  func_var_assoc_threshold=conf.report_conf['func_var_assoc_threshold'] )
    response = make_response( pdf.readb())
    response.headers.set('Content-Disposition', 'attachment', filename=genename + '_report.pdf')
    response.headers.set('Content-Type', 'application/pdf')
    return response

@app.route('/api/drugs/<genename>')
def drugs(genename):
    try:
        drugs = jeeves.get_gene_drugs(genename)
        return jsonify(drugs)
    except Exception as exc:
        die("Could not fetch drugs for gene {!r}".format(genename), exception=exc)

# NCBI sometimes doesn't like cross-origin requests so do them here and not in the browser
@app.route('/api/ncbi/<endpoint>')
def ncbi(endpoint):
    url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/' + endpoint + '?'
    url_parts = list(urlparse.urlparse(url))
    query = dict(urlparse.parse_qsl(url_parts[3]))
    query.update({param: request.args.get(param) for param in request.args})
    url_parts[3] = urlencode(query)
    return urllib.request.urlopen(urlparse.urlunparse(url_parts).replace(';', '?')).read()

def die(message='no message', exception=None):
    if exception is not None:
        print(exception)
        traceback.print_exc()
    print(message)
    flash(message)
    abort(404)

# Resist some CSRF attacks
@app.after_request
def apply_caching(response):
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    return response


### OAUTH2
if 'login' in conf:
    google_sign_in = GoogleSignIn(app)


    lm = LoginManager(app)
    lm.login_view = 'homepage'

    class User(UserMixin):
        "A user's id is their email address."
        def __init__(self, username=None, email=None):
            self.username = username
            self.email = email
        def get_id(self):
            return self.email
        def __repr__(self):
            return "<User email={!r}>".format(self.email)

    @lm.user_loader
    def load_user(id):
        if id.endswith('@finngen.fi') or id in (conf.login['whitelist'] if 'whitelist' in conf.login.keys() else []):
            return User(email=id)
        return None

    # /api/authentication # GET
    @app.route('/api/authentication', methods=['GET'])
    def api_get_authentication():
        """Get authenticated user information."""
        user_info = { 'email' : current_user.email,
                      'username' : current_user.username }
        return user_info

    # /api/authentication # DELETE
    @app.route('/api/authentication', methods=['DELETE'])
    def api_delete_authentication():
        """Log out by a delete call."""
        logout_user()
        return { 'status' : 'success' ,
                 'message' : 'logged out' }


    @app.route('/logout')
    @is_public
    def logout():
        print(current_user.email, 'logged out')
        logout_user()
        return redirect(url_for('homepage',
                                _scheme='https',
                                _external=True))

    @app.route('/login_with_google')
    @is_public
    def login_with_google():
        "this route is for the login button"
        session['original_destination'] = url_for('homepage',
                                                  _scheme='https',
                                                  _external=True)
        return redirect(url_for('get_authorized',
                                _scheme='https',
                                _external=True))

    @app.route('/get_authorized')
    @is_public
    def get_authorized():
        "This route tries to be clever and handle lots of situations."
        if current_user.is_anonymous or not verify_membership(current_user.email):
            return google_sign_in.authorize()
        else:
            if 'original_destination' in session:
                orig_dest = session['original_destination']
                del session['original_destination'] # We don't want old destinations hanging around.  If this leads to problems with re-opening windows, disable this line.
            else:
                orig_dest = url_for('homepage',
                                    _scheme='https',
                                    _external=True)
            return redirect(orig_dest)

    @app.route('/callback/google')
    @is_public
    def oauth_callback_google():
        if not current_user.is_anonymous and verify_membership(current_user.email):
            return redirect(url_for('homepage',
                                    _scheme='https',
                                    _external=True))
        try:
            username, email = google_sign_in.callback() # oauth.callback reads request.args.
        except Exception as exc:
            print('Error in google_sign_in.callback():')
            print(exc)
            print(traceback.format_exc())
            flash('Something is wrong with authentication. Please contact humgen-servicedesk@helsinki.fi')
            return redirect(url_for('auth',
                                    _scheme='https',
                                    _external=True))
        if email is None:
            # I need a valid email address for my user identification
            flash('Authentication failed by failing to get an email address.')
            return redirect(url_for('auth',
                                    _scheme='https',
                                    _external=True))

        if not verify_membership(email):
            flash('{!r} is not allowed to access FinnGen results. If you think this is an error, please contact humgen-servicedesk@helsinki.fi'.format(email))
            return redirect(url_for('auth',
                                    _scheme='https',
                                    _external=True))

        # Log in the user, by default remembering them for their next visit.
        user = User(username, email)
        login_user(user, remember=True)

        print(user.email, 'logged in')
        return redirect(url_for('get_authorized',
                                _scheme='https',
                                _external=True))
