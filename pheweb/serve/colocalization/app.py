import typing
import click
from flask import Flask, send_from_directory, request, g
import logging
import json
import os
from .cli import data_cli
from .model_db import ColocalizationDB
import atexit
import sys

db_url = os.getenv('SQLALCHEMY_DATABASE_URI', 'sqlite:////tmp/tmp.db')

app = Flask(__name__, static_folder='static')

app.cli.add_command(data_cli)
