#!/bin/bash

set -euo pipefail

PROJECT_DIR="$( cd "$( dirname "$( dirname "${BASH_SOURCE[0]}" )" )" && pwd )"
source "$PROJECT_DIR/config.config"

/net/mario/cluster/bin/pigz -dc "$epacts_source_filename" |
grep -vP '^([^\t]*\t){8}0\.00' |
/net/mario/cluster/bin/pigz -2 > "$data_dir/phewas_maf_gte_1e-2.vcf.gz"
