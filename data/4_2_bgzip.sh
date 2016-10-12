#!/bin/bash
{
set -euo pipefail

PROJECT_DIR="$( cd "$( dirname "$( dirname "$(readlink -f "${BASH_SOURCE[0]}" )" )" )" && pwd )"
source "$PROJECT_DIR/config.config"

if [[ -n $(type -t tabix) ]]; then
    tabix='tabix'
elif [[ -n "${tabix_path:-}" ]]; then
    tabix="$tabix_path"
else
    echo "Failed to find a path for tabix.  Please specify 'tabix_path' in 'config.config'."
    exit 1
fi

if [[ -n $(type -t bgzip) ]]; then
    bgzip='bgzip'
elif [[ -n "${bgzip_path:-}" ]]; then
    bgzip="$bgzip_path"
else
    echo "Failed to find a path for bgzip.  Please specify 'tabix_path' in 'config.config'."
    exit 1
fi

# Tabix expects the header line to start with a '#'
(echo -n '#'; cat "$data_dir/matrix.tsv") |
"$bgzip" > "$data_dir/matrix.tsv.gz"

"$tabix" -p vcf "$data_dir/matrix.tsv.gz"

echo done!
}
