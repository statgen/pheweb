#!/bin/bash

set -eou pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

colnums="$($SCRIPT_DIR/get_colnumbers.py)"

zcat "/var/pheweb_data/phewas_maf_gte_1e-2.vcf.gz" |
# head -n 100000 |
cut -d $'\t' -f "$colnums" |
gzip -2 > "/var/pheweb_data/phewas_maf_gte_1e-2_ncases_gte_20.vcf.gz"
