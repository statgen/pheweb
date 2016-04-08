#!/bin/bash

/net/mario/cluster/bin/pigz -dc "/net/fantasia/home/schellen/PheWAS/epacts_multi/gwas_17March2016/gwas_17March2016.epacts.gz" |
grep -vP '^([^\t]*\t){8}0\.00' |
/net/mario/cluster/bin/pigz -2 > "/var/pheweb_data/phewas_maf_gte_1e-2.vcf.gz"
