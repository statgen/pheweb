#!/bin/bash
set -euo pipefail
_readlinkf() { perl -MCwd -le 'print Cwd::abs_path shift' "$1"; }
script_dir="$(cd "$(dirname "$(_readlinkf "${BASH_SOURCE[0]}")")" && echo "$PWD")"

data_dir="$TMPDIR/pytest-of-$USER/pytest-$USER/"
if ! [[ -d "$data_dir" ]]; then
   data_dir="$TMPDIR/pytest-of-$USER/pytest-current/test_all0/" # I've seen this format but I'm not sure where
fi
ln -s -f "$script_dir/input_files/config.py"  "$data_dir/"
ln -s -f "$script_dir/input_files/fake-cache" "$data_dir/"
ln -s -f "$script_dir/input_files/custom_templates" "$data_dir/"
if ! [[ -f "$data_dir/pheno-list.json" ]]; then ln -s -f "$script_dir/pheno-list.json" "$data_dir/"; fi
for f in "$script_dir"/generated-by-pheweb/*; do ln -s -f "$f" "$data_dir/generated-by-pheweb/"; done;

echo "http://localhost:8000/test/"

cd "$data_dir"
python3 "$(which gunicorn)" --error-logfile=- --access-logfile=- --access-logformat="%(s)s | %(L)ss | %(f)s | %(m)s %(U)s %(q)s" -w4 --reload --pythonpath "$script_dir/.." pheweb.serve.server:app

#pheweb conf data_dir="$data_dir" serve --host='localhost' --port=8000 --num-workers=2
