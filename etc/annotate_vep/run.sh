#!/bin/bash
set -euo pipefail

## This script should get run from the directory containing `generated-by-pheweb`.
## It needs `generated-by-pheweb/sites/sites.tsv`, so it should get run after `pheweb add-genes` and its preceeding steps.
## You can see the list of steps with `pheweb process -h`.
## Then you should be able to continue with the rest of the steps.  I think `pheweb process` should pick up at the right spot.

## This script only works on hg38.
## If It will probably work on hg19 if you replace GRCh38 with GRCh37.

## This script installs VEP in docker.

## To use these VEP consequences to filter the filterable manhattan plot, set `show_manhattan_filter_consequence = True` in `config.py`.

## Setting parallel="yes" splits the input into chunks of 3 million variants and annotates them in parallel.
## None of this is super robust, and parallel is even less.
parallel="no"


mkdir -p vep_data/input
chmod a+rwx vep_data
python3 make_vcf.py

if ! [[ $parallel = "yes" ]]; then
   mv input.vcf.gz vep_data/input/
else
    zcat input.vcf|grep -v '^##'| split --lines=$((3*1000*1000)) - split_
    for file in split_*; do
        zcat input.vcf|head -n3 > "vep_data/input/$file"
        cat "$file" >> "vep_data/input/$file"
        rm "$file"
    done
fi

docker pull ensemblorg/ensembl-vep
docker run -t -i -v vep_data:/opt/vep/.vep ensemblorg/ensembl-vep
sudo docker run -t -i -v $PWD/vep_data:/opt/vep/.vep ensemblorg/ensembl-vep perl INSTALL.pl -a cfp -s homo_sapiens -y GRCh38 -g all


if ! [[ $parallel = "yes" ]]; then
    sudo docker run -v $PWD/vep_data:/opt/vep/.vep ensemblorg/ensembl-vep ./vep --input_file=/opt/vep/.vep/input/input.vcf.gz --output_file=/opt/vep/.vep/output-$name.tsv --force_overwrite --compress_output=gzip --cache --offline --assembly=GRCh38 --regulatory --most_severe --check_existing

else
    for f in vep_data/input/split_*; do
        name=$(basename "$f")
        sudo docker run -v $PWD/vep_data:/opt/vep/.vep ensemblorg/ensembl-vep ./vep --input_file=/opt/vep/.vep/input/$name --output_file=/opt/vep/.vep/output-$name.tsv --force_overwrite --compress_output=gzip --cache --offline --assembly=GRCh38 --regulatory --most_severe --check_existing &
    done
    zcat vep_data/output-split_aa.tsv | grep '^#' | gzip > out-raw-vep.tsv
    for f in $(echo vep_data/output-split_a*tsv|tr " " "\n"|sort); do
        zcat $f | grep -v '^#' | gzip >> out-raw-vep.tsv
    done
fi

python3 merge.py


echo "Now check that sites-vep.tsv looks good."
echo "It should have the same variants as `generated-by-pheweb/sites/sites.tsv`."
echo "It should have the same columns, plus 'consequence'."
echo "Then run `mv sites-vep.tsv generated-by-pheweb/sites/sites.tsv`."
