#!/bin/bash

set -euo pipefail

PROJECT_DIR="$( cd "$( dirname "$( dirname "$(readlink -f "${BASH_SOURCE[0]}" )" )" )" && pwd )"
source "$PROJECT_DIR/config.config"

mkdir -p "$data_dir/sites/dbSNP"

if ! [[ -e "$data_dir/sites/dbSNP/rsids.vcf.gz" ]]; then

    if ! [[ -e "$data_dir/sites/dbSNP/dbsnp-b147-GRCh37.gz" ]]; then
        echo downloading!
        #    wget -O "$data_dir/sites/dbSNP/dbsnp-b147-GRCh37.gz" "ftp://ftp.ncbi.nlm.nih.gov/snp/organisms/human_9606_b147_GRCh37p13/database/organism_data/b147_SNPChrPosOnRef_105.bcp.gz"
        wget -O "$data_dir/sites/dbSNP/dbsnp-b147-GRCh37.gz" "ftp://ftp.ncbi.nlm.nih.gov/snp/organisms/human_9606_b147_GRCh37p13/VCF/All_20160601.vcf.gz"
    fi

    gzip -cd "$data_dir/sites/dbSNP/dbsnp-b147-GRCh37.gz" |
    perl -F'\t' -nale 'print "$F[0]\t$F[1]\t$F[2]\t$F[3]\t$F[4]"' | # Gotta declare that it's tab-delimited, else it's '\s'-delimited I think.
    grep '^[0-9]' | # We only have chr1-22, so throw away X, Y, MT, etc.
    gzip > "$data_dir/sites/dbSNP/rsids.vcf.gz"

else
    echo "$data_dir/sites/dbSNP/rsids.vcf.gz already exists"
fi

echo done!
