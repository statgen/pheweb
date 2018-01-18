#!/bin/bash

shopt -s nullglob

if [ $# -eq 0 ]
then
    echo "Usage: bash reformat_all.sh dir"
    exit 1
fi

FILES=$1/*.tsv*
for f in $FILES
do
    echo "Processing $f"
    node --max_old_space_size=10000 reformat.js $f
done
