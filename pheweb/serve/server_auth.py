from flask_login import LoginManager, UserMixin, login_user, logout_user, current_user
from flask import Flask, jsonify, render_template, request, redirect, abort, flash, send_from_directory, send_file, session, url_for,make_response
from ..conf_utils import conf
import functools
from .group_based_auth  import verify_membership

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
            print('anonymous user visited {!r}'.format(request.path))
            session['original_destination'] = request.path
            return redirect(url_for('get_authorized'))
        if not verify_membership(current_user.email):
            print('{} is unauthorized and visited {!r}'.format(current_user.email, request.path))
            session['original_destination'] = request.path
            return redirect(url_for('get_authorized'))
        print('{} visited {!r}'.format(current_user.email, request.path))
        return func(*args, **kwargs)
    return decorated_view

def before_request():
    if not conf.authentication:
        print('anonymous visited {!r}'.format(request.path))
        return None
    elif current_user is None or not hasattr(current_user, 'email'):
        return redirect(url_for('get_authorized'))
    elif not verify_membership(current_user.email):
        print('{} is unauthorized and visited {!r}'.format(current_user.email, request.path))
        session['original_destination'] = request.path
        return redirect(url_for('get_authorized'))
    else:
        print('{} visited {!r}'.format(current_user.email, request.path))
        return None
