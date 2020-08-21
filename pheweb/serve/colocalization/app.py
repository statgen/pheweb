import typing
import click
from flask import Flask, send_from_directory, request, g
import logging
import json
import os
from .cli import data_cli
from .model_db import ColocalizationDAO
from .view import colocalization, development
import atexit
import sys

class Jeeves():
     def __init__(self, colocalization):
         self.colocalization = colocalization

db_url = os.getenv('SQLALCHEMY_DATABASE_URI', 'sqlite:////tmp/tmp.db')

app = Flask(__name__, static_folder='static')
app.register_blueprint(colocalization)
app.register_blueprint(development)

@app.before_first_request
def setup_datastore():
     app.jeeves = Jeeves(ColocalizationDAO(db_url))

app.cli.add_command(data_cli)
