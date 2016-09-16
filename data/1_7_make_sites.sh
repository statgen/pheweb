#!/bin/bash

set -euo pipefail

PROJECT_DIR="$( cd "$( dirname "$( dirname "$(readlink -f "${BASH_SOURCE[0]}" )" )" )" && pwd )"
source "$PROJECT_DIR/config.config"


grep -q -v '^[0-9]*\s' "$data_dir/sites/sites.lexicographic.tsv" &&
echo "$data_dir/sites/sites.lexicographic.tsv contains a line that doesn't start with a number.  This script can't currently handle anything but 1-22." &&
exit 1

cat "$data_dir/sites/sites.lexicographic.tsv" |
# Note: this uses a stable sort (-s) so that multiallelic variants (same chr:pos, different alt) will stay in the same order.
sort -k 1,1n -k2,2n -s \
> "$data_dir/sites/sites.tsv"

echo done!
