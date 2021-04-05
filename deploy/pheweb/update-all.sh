#!/bin/bash
clusters=( metaresults r5 r6 results staging userresults )

for cluster in "${clusters[@]}"
do
    echo $cluster
    gcloud container clusters get-credentials "$cluster-pheweb" --region europe-west1-b 2> /dev/null
    helm upgrade "${cluster}-pheweb" . -f "${cluster}-values.yaml"
done
