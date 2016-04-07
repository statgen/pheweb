#!/bin/bash

set -eou pipefail

/net/mario/cluster/bin/pigz -dc "/var/pheweb_data/phewas_maf_gte_1e-2_ncases_gte_20.vcf.gz" |
cut -d $'\t' -f 1,2,3 |
/net/mario/cluster/bin/bgzip > "/var/pheweb_data/phewas_maf_gte_1e-2_ncases_gte_20_sites.vcf.gz"

/net/mario/cluster/bin/tabix "/var/pheweb_data/phewas_maf_gte_1e-2_ncases_gte_20_sites.vcf.gz"
