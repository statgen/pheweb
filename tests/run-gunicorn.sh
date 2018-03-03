#!/bin/bash

dir1="$(pwd)/.."
cd "$TMPDIR/pytest-of-$USER/pytest-$USER/"
python3 "$(which gunicorn)" --error-logfile=- --access-logfile=- --access-logformat="%(s)s | %(L)ss | %(f)s | %(m)s %(U)s %(q)s" -w4 --reload --pythonpath "$dir1" pheweb.serve.server:app
