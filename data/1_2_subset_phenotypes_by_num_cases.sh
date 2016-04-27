#!/bin/bash

set -eou pipefail

data_dir="/var/pheweb_data/"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

colnums="$($SCRIPT_DIR/get_colnumbers.py)"

/net/mario/cluster/bin/pigz -dc "$data_dir/phewas_maf_gte_1e-2.vcf.gz" |
cut -d $'\t' -f "$colnums" |
/net/mario/cluster/bin/bgzip > "$data_dir/phewas_maf_gte_1e-2_ncases_gte_20.vcf.gz"

/net/mario/cluster/bin/tabix "$data_dir/phewas_maf_gte_1e-2_ncases_gte_20.vcf.gz"
