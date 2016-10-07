#!/bin/bash
{
set -eu
PROJECT_DIR="$( cd "$( dirname "$( dirname "$(readlink -f "${BASH_SOURCE[0]}" )" )" )" && pwd )"
source "$PROJECT_DIR/config.config"
set -x

./phenolist.py glob-files "/net/fantasia/home/schellen/PheWAS/epacts/RESULTS/pheno.*/pheno.*.epacts.gz" "/net/fantasia/home/schellen/PheWAS/epacts/RESULTS_chrX/pheno.*/pheno.*.epacts.gz"
./phenolist.py extract-phenocode-from-fname 'pheno.([0-9\.]+).epacts.gz'
./phenolist.py unique-phenocode
./phenolist.py verify
./phenolist.py hide-small-numbers-of-samples --minimum-visible-number 50
./phenolist.py read-info-from-association-files
./phenolist.py filter-phenotypes --minimum-num-cases 20 --minimum-num-controls 20 --minimum-num-samples 20

./phenolist.py import-phenolist -f "$data_dir/pheno-list-phewascodes.json" "$PROJECT_DIR/unnecessary_things/PheWAS_code_translation_v1_2.txt"
./phenolist.py keep-only-columns -f "$data_dir/pheno-list-phewascodes.json" icd9_string category_string icd9 phewas_string phewas_code
./phenolist.py rename-columns -f "$data_dir/pheno-list-phewascodes.json"   icd9 icd9_code   phewas_string phenostring   phewas_code phenocode   category_string category
./phenolist.py unique-phenocode -f "$data_dir/pheno-list-phewascodes.json" --columns-are-related icd9_info

./phenolist.py merge-in-info "$data_dir/pheno-list-phewascodes.json"
./phenolist.py verify --required-columns icd9_info phenostring category
}
