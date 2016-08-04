#!/bin/bash
{
set -euo pipefail

PROJECT_DIR="$( cd "$( dirname "$( dirname "$(readlink -f "${BASH_SOURCE[0]}" )" )" )" && pwd )"
source "$PROJECT_DIR/config.config"

# Tabix expects the header line to start with a '#'
(echo -n '#'; cat "$data_dir/matrix.tsv") |
$bgzip_path > "$data_dir/matrix.tsv.gz"

$tabix_path -p vcf "$data_dir/matrix.tsv.gz"

echo done!
}
