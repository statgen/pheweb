#!/bin/bash

set -euo pipefail

export PGPASSWORD="$(cat postgres_password)"

psql -U pheweb_writer -d postgres -h localhost <<EOF
CREATE INDEX IF NOT EXISTS idx_association_variantid ON pheweb.associations (variant_id);
CREATE INDEX IF NOT EXISTS idx_pheno_phewascode ON pheweb.phenos (phewas_code);
EOF
