#!/bin/bash
set -euo pipefail
readlinkf() { perl -MCwd -le 'print Cwd::abs_path shift' "$1"; }
SCRIPTDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

set -x

## This script should get run from the directory that contains `generated-by-pheweb`.
## It needs `generated-by-pheweb/sites/sites.tsv`, so it should get run after `pheweb add-genes` and its preceeding steps.
## You can see the list of steps with `pheweb process -h`.
## Then you should be able to continue with the rest of the steps.  I think `pheweb process` should pick up at the right spot.
## To use these VEP consequences to filter the filterable manhattan plot, set `show_manhattan_filter_consequence = True` in `config.py`.

## Uncomment your build:
#build="GRCh38"
build="GRCh37"

## Setting parallel="yes" splits the input into chunks of 3 million variants and annotates them in parallel.
## None of this is super robust, and parallel is even less.
parallel="no"

# This script needs a version of python that has pheweb installed.
python_exe="/data/pheweb/pheweb-installs/pheweb1.3/venv/bin/python3"
#python_exe="python3"


mkdir -p vep_data/input
chmod a+rwx vep_data
if ! [[ -e input.vcf.gz ]]; then
   "$python_exe" "$SCRIPTDIR/make_vcf.py" generated-by-pheweb/sites/sites.tsv input.vcf.gz
fi

if ! [[ $parallel = "yes" ]]; then
   cp input.vcf.gz vep_data/input/
else
    zcat input.vcf|grep -v '^##'| split --lines=$((3*1000*1000)) - split_
    for file in split_*; do
        zcat input.vcf|head -n3 > "vep_data/input/$file"
        cat "$file" >> "vep_data/input/$file"
        rm "$file"
    done
fi

sudo docker pull ensemblorg/ensembl-vep
sudo docker run -v "$PWD/vep_data":/opt/vep/.vep ensemblorg/ensembl-vep perl INSTALL.pl -a cfp -s homo_sapiens -y "$build" -g all  # Do we really need `-g all`?

if ! [[ $parallel = "yes" ]]; then
    sudo docker run -v "$PWD/vep_data":/opt/vep/.vep ensemblorg/ensembl-vep ./vep --input_file=/opt/vep/.vep/input/input.vcf.gz --output_file=/opt/vep/.vep/output.tsv --force_overwrite --compress_output=gzip --cache --offline --assembly="$build" --regulatory --most_severe --check_existing
    mv vep_data/output.tsv out-raw-vep.tsv

else
    for f in vep_data/input/split_*; do
        name=$(basename "$f")
        sudo docker run -v "$PWD/vep_data":/opt/vep/.vep ensemblorg/ensembl-vep ./vep --input_file=/opt/vep/.vep/input/$name --output_file=/opt/vep/.vep/output-$name.tsv --force_overwrite --compress_output=gzip --cache --offline --assembly="$build" --regulatory --most_severe --check_existing &
    done
    wait  # Wait for child processes to exit (hopefully sucessfully)
    zcat vep_data/output-split_aa.tsv | grep '^#' | gzip > out-raw-vep.tsv
    for f in $(echo vep_data/output-split_a*tsv|tr " " "\n"|sort); do
        zcat $f | grep -v '^#' | gzip >> out-raw-vep.tsv
    done
fi

"$python_exe" "$SCRIPTDIR/merge.py" generated-by-pheweb/sites/sites.tsv out-raw-vep.tsv sites-vep.tsv


echo "Now check that sites-vep.tsv looks good."
echo 'It should have the same variants as `generated-by-pheweb/sites/sites.tsv`.'
echo "It should have the same columns, plus 'consequence'."
echo 'Then run `mv sites-vep.tsv generated-by-pheweb/sites/sites.tsv`.'
