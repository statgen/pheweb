from ..utils import get_phenolist, get_gene_tuples, pad_gene
from ..conf_utils import conf
from ..file_utils import common_filepaths
from .server_utils import get_variant, get_random_page, get_pheno_region
from .autocomplete import Autocompleter
from .auth import GoogleSignIn
from ..version import version as pheweb_version

from .data_access.db import Variant 

from flask import Flask, jsonify, render_template, request, redirect, abort, flash, send_from_directory, send_file, session, url_for,make_response
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
app = Flask(__name__)

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
if 'GOOGLE_ANALYTICS_TRACKING_ID' in conf:
    app.config['GOOGLE_ANALYTICS_TRACKING_ID'] = conf['GOOGLE_ANALYTICS_TRACKING_ID']
if 'SENTRY_DSN' in conf:
    app.config['SENTRY_DSN'] = conf['SENTRY_DSN']
app.config['PHEWEB_VERSION'] = pheweb_version
app.json_encoder = FGJSONEncoder

if os.path.isdir(conf.custom_templates):
    app.jinja_loader.searchpath.insert(0, conf.custom_templates)

phenos = {pheno['phenocode']: pheno for pheno in get_phenolist()}

dbs_fact = DataFactory( conf.database_conf  )
annotation_dao = dbs_fact.get_annotation_dao()
gnomad_dao = dbs_fact.get_gnomad_dao()
lof_dao = dbs_fact.get_lof_dao()
result_dao = dbs_fact.get_result_dao()
finemapping_dao = dbs_fact.get_finemapping_dao()
ukbb_dao = dbs_fact.get_UKBB_dao()
ukbb_matrixdao =dbs_fact.get_UKBB_dao(True)
threadpool = ThreadPoolExecutor(max_workers=4)

jeeves = ServerJeeves( conf )

def check_auth(func):
    """
    This decorator for routes checks that the user is authorized (or that no login is required).
    If they haven't, their intended destination is stored and they're sent to get authorized.
    It has to be placed AFTER @app.route() so that it can capture `request.path`.
    """
    if not conf.authentication:
        return func
    # inspired by <https://flask-login.readthedocs.org/en/latest/_modules/flask_login.html#login_required>
    @functools.wraps(func)
    def decorated_view(*args, **kwargs):
        if current_user.is_anonymous:
            print('unauthorized user visited {!r}'.format(request.path))
            session['original_destination'] = request.path
            return redirect(url_for('get_authorized'))
        print('{} visited {!r}'.format(current_user.email, request.path))
        if 'whitelist' in conf.login.keys():
            assert current_user.email.lower().endswith('@finngen.fi') or current_user.email.lower() in conf.login['whitelist'], current_user
        else:
            assert current_user.email.lower().endswith('@finngen.fi'), current_user
        return func(*args, **kwargs)
    return decorated_view

@app.route('/api/phenos')
@check_auth
def phenolist():
    return send_file(common_filepaths['phenolist'])

autocompleter = Autocompleter(phenos)
@app.route('/api/autocomplete')
@check_auth
def autocomplete():
    query = request.args.get('query', '')
    suggestions = autocompleter.autocomplete(query)
    if suggestions:
        return jsonify(sorted(suggestions, key=lambda sugg: sugg['display']))
    return jsonify([])

@app.route('/go')
@check_auth
def go():
    query = request.args.get('query', None)
    if query is None:
        die("How did you manage to get a null query?")
    best_suggestion = autocompleter.get_best_completion(query)
    if best_suggestion:
        return redirect(best_suggestion['url'])
    die("Couldn't find page for {!r}".format(query))

@app.route('/api/variant/<query>')
@check_auth
def api_variant(query):
    variant = get_variant(query)
    return jsonify(variant)

@app.route('/variant/<query>')
@check_auth
def variant_page(query):
    try:
        q=query.split("-")
        if len(q)!=4:
            die("Malformed variant query. Use chr-pos-ref-alt")
        v = Variant(q[0].replace('X', '23'),q[1],q[2], q[3])
        variantdat = jeeves.get_single_variant_data(v)
        if variantdat is None:
            die("Sorry, I couldn't find the variant {}".format(query))
        if finemapping_dao is not None:
            regions = finemapping_dao.get_regions(v)
        else:
            regions = []
        return render_template('variant.html',
                               variant=variantdat[0],
                               results=variantdat[1],
                               regions=regions,
                               tooltip_lztemplate=conf.parse.tooltip_lztemplate,
                               var_top_pheno_export_fields=conf.var_top_pheno_export_fields,
                               vis_conf=conf.vis_conf
        )
    except Exception as exc:
        die('Oh no, something went wrong', exc)

@app.route('/api/manhattan/pheno/<phenocode>')
@check_auth
def api_pheno(phenocode):
    try:
        return jsonify( jeeves.get_pheno(phenocode))
    except Exception as exc:
        die("Sorry, your manhattan request for phenocode {!r} didn't work".format(phenocode), exception=exc)

@app.route('/api/gene_phenos/<gene>')
@check_auth
def api_gene_phenos(gene):
        return jsonify( jeeves.gene_phenos(gene) )

@app.route('/api/gene_functional_variants/<gene>')
@check_auth
def api_gene_functional_variants(gene):
    pThreshold=1.1
    if ('p' in request.args):
        pThreshold= float(request.args.get('p'))
    annotations = jeeves.gene_functional_variants(gene, pThreshold)
    return jsonify(annotations)

@app.route('/api/lof')
@check_auth
def api_lof():
    lofs = lof_dao.get_all_lofs(conf.lof_threshold)
    for i in range( len(lofs)-1,-1,-1):
        ## lof data is retrieved externally so it can be out of sync with phenotypes that we want to show
        # TODO: alerting mechanism + test cases for installation to detect accidental out of sync issues.
        lof = lofs[i]
        if lof['gene_data']['pheno'] not in phenos:
            del lofs[i]
        else:
            lof['gene_data']['phenostring'] = phenos[lof['gene_data']['pheno']]['phenostring']
    return jsonify(sorted(lofs,  key=lambda lof: lof['gene_data']['p_value']))

@app.route('/api/lof/<gene>')
@check_auth
def api_lof_gene(gene):
    lofs = lof_dao.get_lofs(gene)
    lofs_use = []
    for lof in lofs:
        if lof['gene_data']['pheno'] in phenos.keys():
            lof['gene_data']['phenostring'] = phenos[lof['gene_data']['pheno']]['phenostring']
            lof['gene_data']['beta'] = '{:.3f}'.format(float(lof['gene_data']['beta']))
            lofs_use.append(lof)
    return jsonify(lofs_use)

@app.route('/api/top_hits.json')
@check_auth
def api_top_hits():
    return send_file(common_filepaths['top-hits-1k'])
@app.route('/download/top_hits.tsv')
@check_auth
def download_top_hits():
    return send_file(common_filepaths['top-hits-tsv'])

@app.route('/api/qq/pheno/<phenocode>')
@check_auth
def api_pheno_qq(phenocode):
    return send_from_directory(common_filepaths['qq'](''), phenocode)

@app.route('/top_hits')
@check_auth
def top_hits_page():
    return render_template('top_hits.html')

@app.route('/coding')
@check_auth
def coding_page():
    return render_template('coding.html')

@app.route('/api/coding_data')
@check_auth
def coding_data():
    return jsonify(jeeves.coding())

@app.route('/random')
@check_auth
def random_page():
    url = get_random_page()
    if url is None:
        die("Sorry, it looks like no hits in this pheweb reached the significance threshold.")
    return redirect(url)

@app.route('/pheno/<phenocode>')
@check_auth
def pheno_page(phenocode):
    try:
        pheno = phenos[phenocode]
    except KeyError:
        die("Sorry, I couldn't find the pheno code {!r}".format(phenocode))
    return render_template('pheno.html',
                           phenocode=phenocode,
                           pheno=pheno,
                           ukbb_ns= ukbb_dao.getNs(phenocode),
                           tooltip_underscoretemplate=conf.parse.tooltip_underscoretemplate,
                           var_export_fields=conf.var_export_fields,
                           vis_conf=conf.vis_conf,

    )

@app.route('/region/<phenocode>/<region>')
@check_auth
def region_page(phenocode, region):
    try:
        pheno = phenos[phenocode]
    except KeyError:
        die("Sorry, I couldn't find the phewas code {!r}".format(phenocode))
    chr_se = region.split(':')
    chrom = chr_se[0]
    if finemapping_dao is not None:
        start_end = finemapping_dao.get_max_region(phenocode, chrom, chr_se[1].split('-')[0], chr_se[1].split('-')[1])
        cond_fm_regions = finemapping_dao.get_regions_for_pheno('all', phenocode, chrom, start_end['start'], start_end['end'])
    else:
        cond_fm_regions = []
    pheno['phenocode'] = phenocode
    return render_template('region.html',
                           pheno=pheno,
                           region=region,
                           cond_fm_regions=cond_fm_regions,
                           lz_p_threshold=conf.locuszoom_conf['p_threshold'],
                           tooltip_lztemplate=conf.parse.tooltip_lztemplate,
                           vis_conf=conf.vis_conf
    )

@app.route('/api/region/<phenocode>/lz-results/') # This API is easier on the LZ side.
@check_auth
def api_region(phenocode):
    filter_param = request.args.get('filter')
    groups = re.match(r"analysis in 3 and chromosome in +'(.+?)' and position ge ([0-9]+) and position le ([0-9]+)", filter_param).groups()
    chrom, pos_start, pos_end = groups[0], int(groups[1]), int(groups[2])
    rv = get_pheno_region(phenocode, chrom, pos_start, pos_end, conf.locuszoom_conf['p_threshold'])
    jeeves.add_annotations(chrom, pos_start, pos_end, [rv])
    return jsonify(rv)

@app.route('/api/conditional_region/<phenocode>/lz-results/')
@check_auth
def api_conditional_region(phenocode):
    filter_param = request.args.get('filter')
    groups = re.match(r"analysis in 3 and chromosome in +'(.+?)' and position ge ([0-9]+) and position le ([0-9]+)", filter_param).groups()
    chrom, pos_start, pos_end = groups[0], int(groups[1]), int(groups[2])
    rv = jeeves.get_conditional_regions_for_pheno(phenocode, chrom, pos_start, pos_end)
    return jsonify(rv)

@app.route('/api/finemapped_region/<phenocode>/lz-results/')
@check_auth
def api_finemapped_region(phenocode):
    filter_param = request.args.get('filter')
    groups = re.match(r"analysis in 3 and chromosome in +'(.+?)' and position ge ([0-9]+) and position le ([0-9]+)", filter_param).groups()
    chrom, pos_start, pos_end = groups[0], int(groups[1]), int(groups[2])
    rv = jeeves.get_finemapped_regions_for_pheno(phenocode, chrom, pos_start, pos_end, conf.locuszoom_conf['prob_threshold'])
    return jsonify(rv)

@functools.lru_cache(None)
def get_gene_region_mapping():
    return {genename: (chrom, pos1, pos2) for chrom, pos1, pos2, genename in get_gene_tuples()}

@functools.lru_cache(None)
def get_best_phenos_by_gene():
    with open(common_filepaths['best-phenos-by-gene']) as f:
        return json.load(f)

@app.route('/region/<phenocode>/gene/<genename>')
@check_auth
def gene_phenocode_page(phenocode, genename):
    try:
        gene_region_mapping = get_gene_region_mapping()
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
        for pheno_in_gene in get_best_phenos_by_gene().get(genename, []):
            phenos_in_gene.append({
                'pheno': {k:v for k,v in phenos[pheno_in_gene['phenocode']].items() if k not in ['assoc_files', 'colnum']},
                'assoc': {k:v for k,v in pheno_in_gene.items() if k != 'phenocode'},
            })

        return render_template('gene.html',
                               pheno=pheno,
                               significant_phenos=phenos_in_gene,
                               gene_symbol=genename,
                               region='{}:{}-{}'.format(chrom, start, end),
                               tooltip_lztemplate=conf.parse.tooltip_lztemplate,
                               gene_pheno_export_fields=conf.gene_pheno_export_fields,
                               drug_export_fields=conf.drug_export_fields,
                               lof_export_fields=conf.lof_export_fields,
                               func_var_report_p_threshold = conf.report_conf["func_var_assoc_threshold"]
        )
    except Exception as exc:
        die("Sorry, your region request for phenocode {!r} and gene {!r} didn't work".format(phenocode, genename), exception=exc)


@app.route('/gene/<genename>')
@check_auth
def gene_page(genename):
    phenos_in_gene = get_best_phenos_by_gene().get(genename, [])
    if not phenos_in_gene:
        die("Sorry, that gene doesn't appear to have any associations in any phenotype")
    return gene_phenocode_page(phenos_in_gene[0]['phenocode'], genename)


@app.route('/genereport/<genename>')
@check_auth
def gene_report(genename):
    phenos_in_gene = get_best_phenos_by_gene().get(genename, [])
    if not phenos_in_gene:
        die("Sorry, that gene doesn't appear to have any associations in any phenotype")
    func_vars = jeeves.gene_functional_variants( genename,  conf.report_conf["func_var_assoc_threshold"])
    funcvar = []
    chunk_size = 10

    def matching_ukbb(res):
        ukbline = ""
        ukbdat = res.get_matching_result("ukbb")
        if( ukbdat is not None):
            pval = float( ukbdat["pval"] )
            beta = float( ukbdat["beta"] )
            ukbline = " \\newline UKBB: " + (" $\\Uparrow$ " if beta>=0 else " $\Downarrow$ ") + ", p:" + "{:.2e}".format(pval)
        return ukbline

    for var in func_vars:
        i = 0
        if len(var["significant_phenos"])==0:
            funcvar.append( { 'rsid': var['var'].get_annotation('rsids'), 'variant':var['var'].id.replace(':', ' '), 'gnomad':var['var'].get_annotation('gnomad'),
                              "consequence": var['var'].get_annotation("annot")["most_severe"].replace('_', ' ').replace(' variant', ''),
                             'nSigPhenos':len(var["significant_phenos"]), "maf": var["var"].get_annotation('annot')["AF"], "info": var["var"].get_annotation("annot")["INFO"] ,
                              "sigPhenos": "NONE" })
            continue

        while i < len(var["significant_phenos"]):
            phenos = var["significant_phenos"][i:min(i+chunk_size,len(var["significant_phenos"]))]
            sigphenos = "\\newline \\medskip ".join( list(map(lambda x: (x.phenostring if x.phenostring!="" else x.phenocode if x.phenocode!="" else "NA") + " \\newline (OR:" + "{:.2f}".format( math.exp(x.beta)) + ",p:"  + "{:.2e}".format(x.pval) + ")" +  matching_ukbb(x) + " " , phenos)))
            if i+chunk_size < len(var["significant_phenos"]):
                sigphenos = sigphenos + "\\newline ..."
            funcvar.append( { 'rsid': var['var'].get_annotation('rsids'), 'variant':var['var'].id.replace(':', ' '), 'gnomad':var['var'].get_annotation('gnomad'),
                              "consequence": var['var'].get_annotation("annot")["most_severe"].replace('_', ' ').replace(' variant', ''),
                             'nSigPhenos':len(var["significant_phenos"]), "maf": var["var"].get_annotation('annot')["AF"], "info": var["var"].get_annotation("annot")["INFO"] ,
                              "sigPhenos": sigphenos })
            i = i + chunk_size
    top_phenos = jeeves.gene_phenos(genename)
    top_assoc = [ assoc for assoc in top_phenos if assoc.assoc.pval<  conf.report_conf["gene_top_assoc_threshold"]  ]
    ukbb_match=[]
    for assoc in top_assoc:
        ukbb_match.append(matching_ukbb(assoc.assoc))
    gi_dao = dbs_fact.get_geneinfo_dao()
    genedata = gi_dao.get_gene_info(genename)
    gene_region_mapping = get_gene_region_mapping()
    chrom, start, end = gene_region_mapping[genename]

    knownhits = dbs_fact.get_knownhits_dao().get_hits_by_loc(chrom,start,end)
    drugs = dbs_fact.get_drug_dao().get_drugs(genename)

    ta = list(zip(top_assoc,ukbb_match))
    print(ta[1:4])
    pdf =  report.render_template('gene_report.tex',imp0rt = importlib.import_module,
                                  gene=genename, functionalVars=funcvar, topAssoc=ta, geneinfo=genedata, knownhits=knownhits, drugs=drugs,
                                  gene_top_assoc_threshold=conf.report_conf["gene_top_assoc_threshold"], func_var_assoc_threshold=conf.report_conf["func_var_assoc_threshold"] )
    response = make_response( pdf.readb())
    response.headers.set('Content-Disposition', 'attachment', filename=genename + '_report.pdf')
    response.headers.set('Content-Type', 'application/pdf')
    return response

@app.route('/api/drugs/<genename>')
@check_auth
def drugs(genename):
    try:
        drugs = dbs_fact.get_drug_dao().get_drugs(genename)
        return jsonify(drugs)
    except Exception as exc:
        die("Could not fetch drugs for gene {!r}".format(genename), exception=exc)

@app.route('/')
def homepage():
    return render_template('index.html')

@app.route('/about')
def about_page():
    return render_template('about.html')

# NCBI sometimes doesn't like cross-origin requests so do them here and not in the browser
@app.route('/api/ncbi/<endpoint>')
@check_auth
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
        if 'whitelist' in conf.login.keys():
            if id.endswith('@finngen.fi') or id in conf.login['whitelist']:
                return User(email=id)
        else:
            if id.endswith('@finngen.fi'):
                return User(email=id)
        return None

    @app.route('/logout')
    def logout():
        print(current_user.email, 'logged out')
        logout_user()
        return redirect(url_for('homepage'))

    @app.route('/login_with_google')
    def login_with_google():
        "this route is for the login button"
        session['original_destination'] = url_for('homepage')
        return redirect(url_for('get_authorized'))

    @app.route('/get_authorized')
    def get_authorized():
        "This route tries to be clever and handle lots of situations."
        if current_user.is_anonymous:
            return google_sign_in.authorize()
        else:
            if 'original_destination' in session:
                orig_dest = session['original_destination']
                del session['original_destination'] # We don't want old destinations hanging around.  If this leads to problems with re-opening windows, disable this line.
            else:
                orig_dest = url_for('homepage')
            return redirect(orig_dest)

    @app.route('/callback/google')
    def oauth_callback_google():
        if not current_user.is_anonymous:
            return redirect(url_for('homepage'))
        try:
            username, email = google_sign_in.callback() # oauth.callback reads request.args.
        except Exception as exc:
            print('Error in google_sign_in.callback():')
            print(exc)
            print(traceback.format_exc())
            flash('Something is wrong with authentication. Please contact humgen-servicedesk@helsinki.fi')
            return redirect(url_for('homepage'))
        if email is None:
            # I need a valid email address for my user identification
            flash('Authentication failed by failing to get an email address.')
            return redirect(url_for('homepage'))

        if 'whitelist' in conf.login.keys():
            if not email.lower().endswith('@finngen.fi') and email.lower() not in conf.login['whitelist']:
                flash('{!r} is not allowed to access FinnGen results. If you think this is an error, please contact humgen-servicedesk@helsinki.fi'.format(email))
                return redirect(url_for('homepage'))
        else:
            if not email.lower().endswith('@finngen.fi'):
                flash('{!r} is not allowed to access FinnGen results. If you think this is an error, please contact humgen-servicedesk@helsinki.fi'.format(email))
                return redirect(url_for('homepage'))

        # Log in the user, by default remembering them for their next visit.
        user = User(username, email)
        login_user(user, remember=True)

        print(user.email, 'logged in')
        return redirect(url_for('get_authorized'))
