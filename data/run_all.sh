#!/bin/bash
{
set -euo pipefail

text_highlight() { tput setab 3; tput setaf 0; }
text_default() { tput sgr0; }
run() {
    text_highlight; echo; echo "=> Starting $1"; text_default
    start_time=$(date +%s)
    set +e
    $1
    exit_code=$?
    set -e
    end_time=$(date +%s)
    text_highlight; echo "=> Completed $1 in $((end_time - start_time)) with exit code $exit_code"; text_default
    [[ $exit_code = 0 ]] || exit $exit_code
}

run ./0_0_make_phenos_json.py
run ./0_1_get_cpras_from_each_input_file.py
run ./0_2_get_cpras_to_show.py
run ./1_2_download_rsids.sh
run ./1_3_download_genes.sh
run ./1_4_make_cpra_rsids.py
run ./1_5_make_cpra_rsids_genes.sh
run ./1_6_make_sites_lexicographic.py
run ./1_7_make_sites.sh
run ./1_8_make_tries.py
run ./3_1_standardize_each_pheno.py
run ./3_2_make_manhattan_for_each_pheno.py
run ./3_3_make_QQ_for_each_pheno.py
run ./4_1_make_matrix.sh
run ./4_2_bgzip.sh
run ./5_1_bgzip_augmented_phenos.sh
}
