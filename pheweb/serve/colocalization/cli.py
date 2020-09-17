import typing
import click
import os
import typing
import csv
from colocalization.model_db import ColocalizationDAO
from flask.cli import AppGroup, with_appcontext

# TOOO : write documentation
# TODO : fix name of dump

data_cli = AppGroup('colocalization')

def wrap(path,f):
    dao = ColocalizationDAO(db_url=path, parameters={})
    try:
        f(dao)
    finally:
        del dao
    

@data_cli.command("init")
@click.argument("path", required=True, type=str)
@with_appcontext
def init(path) -> None:
    wrap(path,lambda dao: dao.create_schema())


@data_cli.command("schema")
@click.argument("path", required=True, type=str)
@with_appcontext
def dump(path) -> None:
    wrap(path,lambda dao: dao.dump())

    
@data_cli.command("delete")
@click.argument("path", required=True, type=str)
@with_appcontext
def init(path) -> None:
    wrap(path,lambda dao: dao.delete_all())

@data_cli.command("debug")
@with_appcontext
def harness() -> None:
    import pdb; pdb.set_trace()


@data_cli.command("load")
@click.argument("path", required=True, type=str)
@click.argument("data", required=True, type=str)
@click.option('--header/--no-header', default=True)
@with_appcontext
def cli_load(path: str, data: str, header: bool) -> None:
    wrap(path,lambda dao: dao.load_data(data, header = header))
