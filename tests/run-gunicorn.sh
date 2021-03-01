#!/bin/bash
set -euo pipefail
_readlinkf() { perl -MCwd -le 'print Cwd::abs_path shift' "$1"; }
script_dir="$(cd "$(dirname "$(_readlinkf "${BASH_SOURCE[0]}")")" && echo "$PWD")"

# This script runs a pheweb server.
# It uses the data loaded when you ran `pytest` (or `./setup.py test`) last.
# It's useful for modifying the server code and immediately seeing the results.
# It should use the local files instead of the globally installed pheweb, but who knows.

data_dir="$TMPDIR/pytest-of-$USER/pytest-$USER/"
if ! [[ -d "$data_dir" ]]; then
   data_dir="$TMPDIR/pytest-of-$USER/pytest-current/test_all0/" # I've seen this format but I'm not sure where
fi
ln -s -f "$script_dir/input_files/config.py"  "$data_dir/"
ln -s -f "$script_dir/input_files/fake-cache" "$data_dir/"
ln -s -f "$script_dir/input_files/custom_templates" "$data_dir/"
if ! [[ -f "$data_dir/pheno-list.json" ]]; then ln -s -f "$script_dir/pheno-list.json" "$data_dir/"; fi
for f in "$script_dir"/generated-by-pheweb/*; do ln -s -f "$f" "$data_dir/generated-by-pheweb/"; done;

echo "http://localhost:5000/"

cd "$data_dir"
python3 "$(which gunicorn)" --bind="localhost:5000" --error-logfile=- --access-logfile=- --access-logformat="%(s)s | %(L)ss | %(f)s | %(m)s %(U)s %(q)s" -w4 --reload --pythonpath "$script_dir/.." pheweb.serve.server:app

#pheweb conf data_dir="$data_dir" serve --host='localhost' --port=5000 --num-workers=2
