#!/bin/bash
{
set -euo pipefail

# TODO move this into python
# TODO parallelize this

PROJECT_DIR="$( cd "$( dirname "$( dirname "$(readlink -f "${BASH_SOURCE[0]}" )" )" )" && pwd )"
source "$PROJECT_DIR/config.config"

if [[ -n $(type -t tabix) ]]; then
    tabix='tabix'
elif [[ -n "${tabix_path:-}" ]]; then
    tabix="$tabix_path"
else
    echo "Failed to find a path for tabix.  Please specify 'tabix_path' in 'config.config'."
    exit 1
fi

if [[ -n $(type -t bgzip) ]]; then
    bgzip='bgzip'
elif [[ -n "${bgzip_path:-}" ]]; then
    bgzip="$bgzip_path"
else
    echo "Failed to find a path for bgzip.  Please specify 'tabix_path' in 'config.config'."
    exit 1
fi

mkdir -p "$data_dir/augmented_pheno_gz"

for infile in "$data_dir/augmented_pheno/"*; do
    outfile="$data_dir/augmented_pheno_gz/$(basename "$infile").gz"
    if ! [[ -e "$outfile" ]]; then
        echo "$infile -> $outfile"

        # Tabix expects the header line to start with a '#'
        (echo -n '#'; cat "$infile") |
        "$bgzip" > "$outfile"

        "$tabix" -p vcf "$outfile"
    fi
done

echo done!
# TODO: write to a tempfile and move that to the destination when done.
echo "please run \`ls -lhSr $data_dir/augmented_pheno_gz/*gz | less\` to check that no file is too small."
}
