
from ..utils import get_phenolist, get_gene_tuples, pad_gene, PheWebError
from ..conf_utils import conf
from ..file_utils import common_filepaths
from .server_utils import get_variant, get_random_page, get_pheno_region
from .autocomplete import Autocompleter
from .auth import GoogleSignIn
from ..version import version as pheweb_version

from flask import Flask, jsonify, render_template, request, redirect, abort, flash, send_from_directory, send_file, session, url_for, Blueprint
from flask_compress import Compress
from flask_login import LoginManager, UserMixin, login_user, logout_user, current_user

import functools
import re
import traceback
import json
import os
import os.path


bp = Blueprint('bp', __name__, template_folder='templates', static_folder='static')
app = Flask(__name__)
Compress(app)
app.config['COMPRESS_LEVEL'] = 2 # Since we don't cache, faster=better
app.config['SECRET_KEY'] = conf.SECRET_KEY if hasattr(conf, 'SECRET_KEY') else 'nonsecret key'
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 9
if 'GOOGLE_ANALYTICS_TRACKING_ID' in conf:
    app.config['GOOGLE_ANALYTICS_TRACKING_ID'] = conf['GOOGLE_ANALYTICS_TRACKING_ID']
if 'SENTRY_DSN' in conf and not os.environ.get('PHEWEB_NO_SENTRY',''):
    app.config['SENTRY_DSN'] = conf['SENTRY_DSN']
app.config['PHEWEB_VERSION'] = pheweb_version
app.config['URLPREFIX'] = conf.urlprefix.rstrip('/')
if os.path.isdir(conf.custom_templates):
    app.jinja_loader.searchpath.insert(0, conf.custom_templates)

phenos = {pheno['phenocode']: pheno for pheno in get_phenolist()}


def check_auth(func):
    """
    This decorator for routes checks that the user is authorized (or that no login is required).
    If they haven't, their intended destination is stored and they're sent to get authorized.
    It has to be placed AFTER @bp.route() so that it can capture `request.path`.
    """
    if 'login' not in conf:
        return func
    # inspired by <https://flask-login.readthedocs.org/en/latest/_modules/flask_login.html#login_required>
    @functools.wraps(func)
    def decorated_view(*args, **kwargs):
        if current_user.is_anonymous:
            print('unauthorized user visited {!r}'.format(request.path))
            session['original_destination'] = request.path
            return redirect(url_for('.get_authorized'))
        print('{} visited {!r}'.format(current_user.email, request.path))
        assert current_user.email.lower() in conf.login['whitelist'], current_user
        return func(*args, **kwargs)
    return decorated_view


autocompleter = Autocompleter(phenos)
@bp.route('/api/autocomplete')
@check_auth
def autocomplete():
    query = request.args.get('query', '')
    suggestions = autocompleter.autocomplete(query)
    if suggestions:
        return jsonify(sorted(suggestions, key=lambda sugg: sugg['display']))
    return jsonify([])

@bp.route('/go')
@check_auth
def go():
    query = request.args.get('query', None)
    if query is None:
        die("How did you manage to get a null query?")
    best_suggestion = autocompleter.get_best_completion(query)
    if best_suggestion:
        return redirect(best_suggestion['url'])
    die("Couldn't find page for {!r}".format(query))

@bp.route('/api/variant/<query>')
@check_auth
def api_variant(query):
    variant = get_variant(query)
    return jsonify(variant)

@bp.route('/variant/<query>')
@check_auth
def variant_page(query):
    try:
        variant = get_variant(query)
        if variant is None:
            die("Sorry, I couldn't find the variant {}".format(query))
        return render_template('variant.html',
                               variant=variant,
                               tooltip_lztemplate=conf.parse.tooltip_lztemplate,
        )
    except Exception as exc:
        die('Oh no, something went wrong', exc)

@bp.route('/api/manhattan/pheno/<phenocode>')
@check_auth
def api_pheno(phenocode):
    return send_from_directory(common_filepaths['manhattan'](''), phenocode)

@bp.route('/top_hits')
@check_auth
def top_hits_page():
    return render_template('top_hits.html')
@bp.route('/api/top_hits.json')
@check_auth
def api_top_hits():
    return send_file(common_filepaths['top-hits-1k'])
@bp.route('/download/top_hits.tsv')
@check_auth
def download_top_hits():
    return send_file(common_filepaths['top-hits-tsv'])

@bp.route('/phenotypes')
@check_auth
def phenotypes_page():
    return render_template('phenotypes.html')
@bp.route('/api/phenotypes.json')
@check_auth
def api_phenotypes():
    return send_file(common_filepaths['phenotypes_summary'])

@bp.route('/api/qq/pheno/<phenocode>')
@check_auth
def api_pheno_qq(phenocode):
    return send_from_directory(common_filepaths['qq'](''), phenocode)


@bp.route('/random')
@check_auth
def random_page():
    url = get_random_page()
    if url is None:
        die("Sorry, it looks like no hits in this pheweb reached the significance threshold.")
    return redirect(url)

@bp.route('/pheno/<phenocode>')
@check_auth
def pheno_page(phenocode):
    try:
        pheno = phenos[phenocode]
    except KeyError:
        die("Sorry, I couldn't find the pheno code {!r}".format(phenocode))
    return render_template('pheno.html',
                           phenocode=phenocode,
                           pheno=pheno,
                           tooltip_underscoretemplate=conf.parse.tooltip_underscoretemplate,
    )



@bp.route('/region/<phenocode>/<region>')
@check_auth
def region_page(phenocode, region):
    try:
        pheno = phenos[phenocode]
    except KeyError:
        die("Sorry, I couldn't find the phewas code {!r}".format(phenocode))
    pheno['phenocode'] = phenocode
    return render_template('region.html',
                           pheno=pheno,
                           region=region,
                           tooltip_lztemplate=conf.parse.tooltip_lztemplate,
    )

@bp.route('/api/region/<phenocode>/lz-results/') # This API is easier on the LZ side.
@check_auth
def api_region(phenocode):
    filter_param = request.args.get('filter')
    groups = re.match(r"analysis in 3 and chromosome in +'(.+?)' and position ge ([0-9]+) and position le ([0-9]+)", filter_param).groups()
    chrom, pos_start, pos_end = groups[0], int(groups[1]), int(groups[2])
    rv = get_pheno_region(phenocode, chrom, pos_start, pos_end)
    return jsonify(rv)


@functools.lru_cache(None)
def get_gene_region_mapping():
    return {genename: (chrom, pos1, pos2) for chrom, pos1, pos2, genename in get_gene_tuples()}

@functools.lru_cache(None)
def get_best_phenos_by_gene():
    with open(common_filepaths['best-phenos-by-gene']) as f:
        return json.load(f)

@bp.route('/region/<phenocode>/gene/<genename>')
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
        )
    except Exception as exc:
        die("Sorry, your region request for phenocode {!r} and gene {!r} didn't work".format(phenocode, genename), exception=exc)


@bp.route('/gene/<genename>')
@check_auth
def gene_page(genename):
    phenos_in_gene = get_best_phenos_by_gene().get(genename, [])
    if not phenos_in_gene:
        die("Sorry, that gene doesn't appear to have any associations in any phenotype.")
    return gene_phenocode_page(phenos_in_gene[0]['phenocode'], genename)



if conf.get('download_pheno_sumstats', '') == 'secret':
    if app.config['SECRET_KEY'] == 'nonsecret key':
        raise PheWebError('you must set a SECRET_KEY in config.py to use download_pheno_sumstats = "secret"')
    class Hasher:
        _hash_length = 15
        @classmethod
        def get_hash(cls, plaintext):
            import hashlib
            return hashlib.blake2b(plaintext.encode('utf8'), digest_size=cls._hash_length, key=app.config['SECRET_KEY'].encode('utf8')).hexdigest()
        @classmethod
        def check_hash(cls, hash_, plaintext):
            if len(hash_) != cls._hash_length * 2: return False
            import hmac
            return hmac.compare_digest(cls.get_hash(plaintext), hash_)

    @bp.route('/download/<phenocode>/<token>')
    def download_pheno(phenocode, token):
        if phenocode not in phenos:
            die("Sorry, that phenocode doesn't exist")
        if not Hasher.check_hash(token, phenocode):
            die("Sorry, that token is incorrect")
        try:
            return send_from_directory(common_filepaths['pheno_gz'](''), '{}.gz'.format(phenocode),
                                       as_attachment=True,
                                       attachment_filename='phenocode-{}.tsv.gz'.format(phenocode))
        except Exception as exc:
            die("Sorry, that file doesn't exist.", exception=exc)

    download_list_secret_token = Hasher.get_hash('|'.join(sorted(phenos.keys()))) # Shouldn't change when we restart the server.
    print('download page:', '/download-list/{}'.format(download_list_secret_token))

    @bp.route('/download-list/<token>')
    def download_list(token):
        if token != download_list_secret_token:
            print(url_for('.download_list', token=Hasher.get_hash('download-list'), _external=True))
            die('Wrong token.')
        ret = ''
        for phenocode, pheno in phenos.items():
            url = url_for('.download_pheno', phenocode=phenocode, token=Hasher.get_hash(phenocode), _external=True)
            ret += '{} {} <a href={url!r}>{url!r}</a><br>\n'.format(phenocode, pheno.get('phenostring',''), url=url)
        return ret, 200

else:
    app.config['DOWNLOAD_PHENO_SUMSTATS_BUTTON'] = True
    @bp.route('/download/<phenocode>')
    def download_pheno(phenocode):
        if phenocode not in phenos:
            die("Sorry, that phenocode doesn't exist")
        return send_from_directory(common_filepaths['pheno_gz'](''), '{}.gz'.format(phenocode),
                                   as_attachment=True,
                                   attachment_filename='phenocode-{}.tsv.gz'.format(phenocode))


@bp.route('/')
def homepage():
    return render_template('index.html')

@bp.route('/about')
def about_page():
    return render_template('about.html')

def die(message='no message', exception=None):
    if exception is not None:
        print(exception)
        traceback.print_exc()
    print(message)
    flash(message)
    abort(404)

@bp.errorhandler(404)
def error_page(message):
    return render_template(
        'error.html',
        message=message
    ), 404

# Resist some CSRF attacks
@bp.after_request
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
        if id in conf.login['whitelist']:
            return User(email=id)
        return None


    @bp.route('/logout')
    def logout():
        print(current_user.email, 'logged out')
        logout_user()
        return redirect(url_for('.homepage'))

    @bp.route('/login_with_google')
    def login_with_google():
        "this route is for the login button"
        session['original_destination'] = url_for('.homepage')
        return redirect(url_for('.get_authorized'))

    @bp.route('/get_authorized')
    def get_authorized():
        "This route tries to be clever and handle lots of situations."
        if current_user.is_anonymous:
            return google_sign_in.authorize()
        else:
            if 'original_destination' in session:
                orig_dest = session['original_destination']
                del session['original_destination'] # We don't want old destinations hanging around.  If this leads to problems with re-opening windows, disable this line.
            else:
                orig_dest = url_for('.homepage')
            return redirect(orig_dest)

    @bp.route('/callback/google')
    def oauth_callback_google():
        if not current_user.is_anonymous:
            return redirect(url_for('.homepage'))
        try:
            username, email = google_sign_in.callback() # oauth.callback reads request.args.
        except Exception as exc:
            print('Error in google_sign_in.callback():')
            print(exc)
            print(traceback.format_exc())
            flash('Something is wrong with authentication.  Please email pjvh@umich.edu')
            return redirect(url_for('.homepage'))
        if email is None:
            # I need a valid email address for my user identification
            flash('Authentication failed by failing to get an email address.  Please email pjvh@umich.edu')
            return redirect(url_for('.homepage'))

        if email.lower() not in conf.login['whitelist']:
            flash('Your email, {!r}, is not in the list of allowed emails.'.format(email))
            return redirect(url_for('.homepage'))

        # Log in the user, by default remembering them for their next visit.
        user = User(username, email)
        login_user(user, remember=True)

        print(user.email, 'logged in')
        return redirect(url_for('.get_authorized'))

app.register_blueprint(bp, url_prefix = app.config['URLPREFIX'])
