#!/bin/bash
{
set -euo pipefail

# TODO move this into python
# TODO parallelize this

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
