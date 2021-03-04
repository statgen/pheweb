#!/bin/bash
set -euo pipefail
readlinkf() { perl -MCwd -le 'print Cwd::abs_path shift' "$1"; }
SCRIPTDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# This script loads data and runs a server using the globally installed `pheweb`.
# It's helpful when you're modifying the code and want to quick see the results.

f() {
set -x
data_dir=$(mktemp -d)
indir="$SCRIPTDIR/input_files"
cache_dir="$indir/fake-cache"
echo "data_dir = $data_dir"

cp "$indir/correlations/pheno-correlations.txt" "$data_dir/pheno-correlations.txt"
pheweb conf data_dir="$data_dir" cache="$cache_dir" disallow_downloads=true -h
pheweb conf data_dir="$data_dir" cache="$cache_dir" disallow_downloads=true conf
pheweb conf data_dir="$data_dir" cache="$cache_dir" disallow_downloads=true phenolist glob --simple-phenocode "$indir/assoc-files/*"
pheweb conf data_dir="$data_dir" cache="$cache_dir" disallow_downloads=true phenolist unique-phenocode
pheweb conf data_dir="$data_dir" cache="$cache_dir" disallow_downloads=true phenolist read-info-from-association-files
pheweb conf data_dir="$data_dir" cache="$cache_dir" disallow_downloads=true phenolist filter-phenotypes --minimum-num-cases=20 --minimum-num-controls=20 --minimum-num-samples=20
pheweb conf data_dir="$data_dir" cache="$cache_dir" disallow_downloads=true phenolist hide-small-numbers-of-samples --minimum-visible-number=50
pheweb conf data_dir="$data_dir" cache="$cache_dir" disallow_downloads=true phenolist import-phenolist -f "$data_dir/pheno-list-categories.json" "$indir/categories.csv"
pheweb conf data_dir="$data_dir" cache="$cache_dir" disallow_downloads=true phenolist merge-in-info "$data_dir/pheno-list-categories.json"
pheweb conf data_dir="$data_dir" cache="$cache_dir" disallow_downloads=true phenolist verify --required-columns=category
pheweb conf data_dir="$data_dir" cache="$cache_dir" disallow_downloads=true process
pheweb conf data_dir="$data_dir" cache="$cache_dir" disallow_downloads=true top-loci
pheweb conf data_dir="$data_dir" cache="$cache_dir" disallow_downloads=true best-of-pheno

echo "Try http://localhost:5000/variant/1:869334-G-A"
echo "Try http://localhost:5000/pheno/snowstorm"
echo "Try http://localhost:5000/gene/SAMD11"

pheweb conf data_dir="$data_dir" cache="$cache_dir" disallow_downloads=true custom_templates="$indir/custom_templates" show_correlations=true show_manhattan_filter_button=true serve
}; f
