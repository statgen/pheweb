from flask_login import LoginManager, UserMixin, login_user, logout_user, current_user
from flask import Flask, jsonify, render_template, request, redirect, abort, flash, send_from_directory, send_file, session, url_for,make_response
from ..conf_utils import conf
import functools
from .group_based_auth  import verify_membership
from flask import g

def before_request():
    
    if not conf.authentication:
        print('anonymous visited {!r}'.format(request.path))
        return None
    elif getattr(g, 'is_test', None) == True:
        return None
    elif current_user is None or not hasattr(current_user, 'email'):
        return redirect(url_for('get_authorized',
                                _scheme='https',
                                _external=True))
    elif not verify_membership(current_user.email):
        print('{} is unauthorized and visited {!r}'.format(current_user.email, request.path))
        session['original_destination'] = request.path
        return redirect(url_for('get_authorized',
                                _scheme='https',
                                _external=True))
    else:
        print('{} visited {!r}'.format(current_user.email, request.path))
        return None

# see discussion
# https://stackoverflow.com/questions/13428708/best-way-to-make-flask-logins-login-required-the-default
def is_public(function):
    function.is_public = True
    return function

def do_check_auth(app):
    # check if endpoint is mapped then
    # check if endpoint has is public annotation
    if request.endpoint and (request.endpoint in app.view_functions) and getattr(app.view_functions[request.endpoint], 'is_public', False) :
        result = None
    else: # check authentication
        result = before_request()
    return result
