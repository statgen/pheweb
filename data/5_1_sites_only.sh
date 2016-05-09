#!/bin/bash

set -eou pipefail

data_dir="/var/pheweb_data/"

/net/mario/cluster/bin/pigz -dc "$data_dir/phewas_maf_gte_1e-2_ncases_gte_20.vcf.gz" |
cut -d $'\t' -f 1,2,3 |
/net/mario/cluster/bin/pigz > "$data_dir/phewas_maf_gte_1e-2_ncases_gte_20_sites.vcf.gz"
