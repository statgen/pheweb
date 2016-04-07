#!/bin/bash

set -euo pipefail

export PGPASSWORD="$(cat postgres_password)"

./print_associations.py |
psql -U pheweb_writer -d postgres -h localhost -c "COPY pheweb.associations (variant_id, pheno_id, beta, sebeta, maf, pval) FROM STDIN WITH DELIMITER ' ';"
