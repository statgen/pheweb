#!/bin/bash

set -eou pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

colnums="$($SCRIPT_DIR/get_colnumbers.py)"

/net/mario/cluster/bin/pigz -dc "/var/pheweb_data/phewas_maf_gte_1e-2.vcf.gz" |
cut -d $'\t' -f "$colnums" |
/net/mario/cluster/bin/bgzip > "/var/pheweb_data/phewas_maf_gte_1e-2_ncases_gte_20.vcf.gz"

/net/mario/cluster/bin/tabix "/var/pheweb_data/phewas_maf_gte_1e-2_ncases_gte_20.vcf.gz"
