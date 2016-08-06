#!/bin/bash

set -euo pipefail

PROJECT_DIR="$( cd "$( dirname "$( dirname "$(readlink -f "${BASH_SOURCE[0]}" )" )" )" && pwd )"
source "$PROJECT_DIR/config.config"

mkdir -p "$data_dir/gwas-catalog/"

if ! [[ -e "$data_dir/gwas-catalog/gwas-catalog.tsv" ]]; then
    echo downloading!
    wget -O "$data_dir/gwas-catalog/gwas-catalog.tsv" "http://www.ebi.ac.uk/gwas/api/search/downloads/alternative"
fi

echo done!
