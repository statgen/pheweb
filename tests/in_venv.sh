#!/bin/bash
set -euo pipefail
readlinkf() { perl -MCwd -le 'print Cwd::abs_path shift' "$1"; }
SCRIPTDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPTDIR/.."
pwd

f() {
# 0. Run pre-commit checks
./etc/pre-commit

py="/usr/bin/python3"

# 1. Make venv
venv_dir="/tmp/test-pheweb-venv-$USER"  # $(mktemp -d)
echo "venv_dir = $venv_dir"
"$py" -m venv "$venv_dir"
"$venv_dir/bin/pip3" install wheel pip pytest
"$venv_dir/bin/pip3" install -e .

# 2. pytest
"$venv_dir/bin/pytest"
}; f
