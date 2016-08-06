#!/bin/bash
{
set -euo pipefail

PROJECT_DIR="$( cd "$( dirname "$( dirname "$(readlink -f "${BASH_SOURCE[0]}" )" )" )" && pwd )"
source "$PROJECT_DIR/config.config"

mkdir -p "$data_dir/augmented_pheno_gz"

for infile in "$data_dir/augmented_pheno/"*; do
    outfile="$data_dir/augmented_pheno_gz/$(basename "$infile").gz"
    if ! [[ -e "$outfile" ]]; then
        echo "$infile -> $outfile"

        # Tabix expects the header line to start with a '#'
        (echo -n '#'; cat "$infile") |
        "$bgzip_path" > "$outfile"

        "$tabix_path" -p vcf "$outfile"
    fi
done

echo done!
# TODO: write to a tempfile and move that to the destination when done.
echo "please run \`ls -lhSr $data_dir/augmented_pheno_gz/*gz | less\` to check that no file is too small."
}
