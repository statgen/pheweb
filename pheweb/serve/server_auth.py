from flask_login import LoginManager, UserMixin, login_user, logout_user, current_user
from flask import Flask, jsonify, render_template, request, redirect, abort, flash, send_from_directory, send_file, session, url_for,make_response
from ..conf_utils import conf
import functools
from .group_based_auth  import verify_membership

def before_request():
    if not conf.authentication:
        print('anonymous visited {!r}'.format(request.path))
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
