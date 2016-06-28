#!/bin/bash

set -euo pipefail

PROJECT_DIR="$( cd "$( dirname "$( dirname "$(readlink -f "${BASH_SOURCE[0]}" )" )" )" && pwd )"
source "$PROJECT_DIR/config.config"

export PATH="$bedtools_path:$PATH"

mkdir -p "$data_dir/sites/genes/"

if ! [[ -e "$data_dir/sites/genes/genes.lexicographic.bed" ]]; then

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

    # Bedtools expects chromosomes to be in lexicographic order.
    cat "$data_dir/sites/genes/genes.bed" |
    bedtools sort -i \
    > "$data_dir/sites/genes/genes.lexicographic.bed"
fi

echo done!
