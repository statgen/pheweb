import typing
import click
import os
from colocalization.model_db import ColocalizationDB
from flask.cli import AppGroup, with_appcontext

data_cli = AppGroup('data')

@data_cli.command("init")
@with_appcontext
def init() -> None:
    db_url = os.getenv('SQLALCHEMY_DATABASE_URI', 'sqlite:////tmp/tmp.db')
    colocalization_db = ColocalizationDB(db_url=db_url)
    colocalization_db.create_schema()


@data_cli.command("harness")
@with_appcontext
def harness() -> None:
    import pdb; pdb.set_trace()


@data_cli.command("load")
@click.argument("path")
@with_appcontext
def cli_load(path: str) -> None:
    db_url = os.getenv('SQLALCHEMY_DATABASE_URI', 'sqlite:////tmp/tmp.db')
    colocalization_db = ColocalizationDB(db_url=db_url)
    colocalization_db.load_data(path)
