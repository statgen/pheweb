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

mkdir -p "$data_dir/sites/genes/"

if ! [[ -e "$data_dir/sites/genes/genes.bed" ]]; then

    if ! [[ -e "$data_dir/sites/genes/gencode.gtf.gz" ]]; then
        # Link from <http://www.gencodegenes.org/releases/19.html>
        wget -O "$data_dir/sites/genes/gencode.gtf.gz" "ftp://ftp.sanger.ac.uk/pub/gencode/Gencode_human/release_19/gencode.v19.annotation.gtf.gz"
    fi

    gzip -cd "$data_dir/sites/genes/gencode.gtf.gz" |
    # Remove pseudogenes and other unwanted types of genes.
    grep -E '; gene_type "(protein_coding|IG_V_gene|TR_V_gene|TR_J_gene|IG_C_gene|IG_D_gene|IG_J_gene|TR_C_gene|TR_D_gene)";' |
    # Remove `chr` from the beginning of the lines and print out `chr startpos endpos genename`.
    perl -F'\t' -nale '$F[0] =~ s{chr}{}; print "$F[0]\t$F[3]\t$F[4]\t", m{gene_name "(.*?)";} if $F[2] eq "gene"' \
        > "$data_dir/sites/genes/genes.bed"

else
    echo "$data_dir/sites/genes/genes.bed already exists"
fi

echo done!
