#!/bin/bash

set -eou pipefail

cols="$(seq 5 2 3001 | sed 's_$_,_' | tr -d "\n" | sed 's_,$__')"

echo $cols

/net/mario/cluster/bin/pigz -dc "/var/pheweb_data/phewas_maf_gte_1e-2_ncases_gte_20.vcf.gz" |
head -100000 |
cut -d $'\t' -f "$cols" |
grep -F $'\t0.00' |
wc -l
