#!/bin/bash

python3 "$(which gunicorn)" --error-logfile=- --access-logfile=- -w4 --reload --pythonpath ../../ pheweb.serve.server:app
