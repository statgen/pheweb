#!/bin/bash
{
set -euo pipefail

# Get the directory where this script is located
# Copied from <http://stackoverflow.com/a/246128/1166306>
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do # resolve $SOURCE until the file is no longer a symlink
  SCRIPT_DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$SCRIPT_DIR/$SOURCE" # if $SOURCE was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done
SCRIPT_DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
PROJECT_DIR="$(dirname $SCRIPT_DIR)"
source "$PROJECT_DIR/config.config"

g++ "$PROJECT_DIR/data/matrixify.cpp" -O3 -o "$data_dir/tmp/matrixify"
cd "$data_dir/augmented_pheno"
"$data_dir/tmp/matrixify" > "$data_dir/matrix.tsv"

echo done!
}
