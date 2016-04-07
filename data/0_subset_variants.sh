#!/bin/bash

zgrep -vP '^([^\t]*\t){8}0\.00' /net/fantasia/home/schellen/PheWAS/epacts_multi/gwas_17March2016/gwas_17March2016.epacts.gz | gzip -2 > /var/pheweb_data/phewas_maf_gte_1e-2.vcf.gz
