#!/bin/bash
{
set -euo pipefail

PROJECT_DIR="$( cd "$( dirname "$( dirname "$(readlink -f "${BASH_SOURCE[0]}" )" )" )" && pwd )"
source "$PROJECT_DIR/config.config"

g++ "$PROJECT_DIR/data/matrixify.cpp" -O3 -o "$data_dir/tmp/matrixify"
cd "$data_dir/augmented_pheno"
"$data_dir/tmp/matrixify" > "$data_dir/matrix.tsv"

echo done!
}