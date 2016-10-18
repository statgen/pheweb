#!/bin/bash
{
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

# Tabix expects the header line to start with a '#'
(echo -n '#'; cat "$data_dir/matrix.tsv") |
"$bgzip" > "$data_dir/matrix.tsv.gz"

"$tabix" -p vcf "$data_dir/matrix.tsv.gz"

echo done!
}
