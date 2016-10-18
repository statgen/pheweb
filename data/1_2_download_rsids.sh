#!/bin/bash

set -euo pipefail

# Get the directory where this script is located
# Copied from <http://stackoverflow.com/a/246128/1166306>
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do # resolve $SOURCE until the file is no longer a symlink
  SCRIPT_DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$SCRIPT_DIR/$SOURCE" # if $SOURCE was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done
SCRIPT_DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
PROJECT_DIR="$(dirname $SCRIPT_DIR)"
source "$PROJECT_DIR/config.config"

mkdir -p "$data_dir/sites/dbSNP"

if ! [[ -e "$data_dir/sites/dbSNP/rsids.vcf.gz" ]]; then

    if ! [[ -e "$data_dir/sites/dbSNP/dbsnp-b147-GRCh37.gz" ]]; then
        echo downloading!
        #    wget -O "$data_dir/sites/dbSNP/dbsnp-b147-GRCh37.gz" "ftp://ftp.ncbi.nlm.nih.gov/snp/organisms/human_9606_b147_GRCh37p13/database/organism_data/b147_SNPChrPosOnRef_105.bcp.gz"
        wget -O "$data_dir/sites/dbSNP/dbsnp-b147-GRCh37.gz" "ftp://ftp.ncbi.nlm.nih.gov/snp/organisms/human_9606_b147_GRCh37p13/VCF/All_20160601.vcf.gz"
    fi

    gzip -cd "$data_dir/sites/dbSNP/dbsnp-b147-GRCh37.gz" |
    grep -v '^#' |
    perl -F'\t' -nale 'print "$F[0]\t$F[1]\t$F[2]\t$F[3]\t$F[4]"' | # Gotta declare that it's tab-delimited, else it's '\s'-delimited I think.
    gzip > "$data_dir/sites/dbSNP/rsids.vcf.gz"

else
    echo "$data_dir/sites/dbSNP/rsids.vcf.gz already exists"
fi

echo done!
