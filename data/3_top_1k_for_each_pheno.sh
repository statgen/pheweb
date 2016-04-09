#!/bin/bash

set -eou pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

$SCRIPT_DIR/get_columns_for_each_pheno.py |
while read phewas_code columns; do
    echo $(date '+%Y-%m-%d %T') $phewas_code $columns
    /net/mario/cluster/bin/pigz -dc "/var/pheweb_data/phewas_maf_gte_1e-2_ncases_gte_20.vcf.gz" |
    cut -d $'\t' -f "$columns" |
    perl -nale 'print if $F[4] < 0.01' |
    /net/mario/cluster/bin/pigz > "/var/pheweb_data/gwas/$phewas_code.vcf.gz"
done
