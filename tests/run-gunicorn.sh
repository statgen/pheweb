#!/bin/bash
set -euo pipefail
_readlinkf() { perl -MCwd -le 'print Cwd::abs_path shift' "$1"; }
script_dir="$(cd "$(dirname "$(_readlinkf "${BASH_SOURCE[0]}")")" && echo "$PWD")"

data_dir="$TMPDIR/pytest-of-$USER/pytest-$USER/"
ln -s -f "$script_dir/input_files/config.py"  "$data_dir/"
ln -s -f "$script_dir/input_files/fake-cache" "$data_dir/"
ln -s -f "$script_dir/input_files/custom_templates" "$data_dir/"

cd "$data_dir"
python3 "$(which gunicorn)" --error-logfile=- --access-logfile=- --access-logformat="%(s)s | %(L)ss | %(f)s | %(m)s %(U)s %(q)s" -w4 --reload --pythonpath "$script_dir/.." pheweb.serve.server:app

#pheweb conf data_dir="$data_dir" serve --host='localhost' --port=8000 --num-workers=2
