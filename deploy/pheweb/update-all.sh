#!/bin/bash -x

# clusters=( r7 r8 results userresults metaresults )
# for cluster in "${clusters[@]}"
# do
#     echo $cluster
#     kubectl get pods
#     gcloud container clusters get-credentials "$cluster-pheweb" --region europe-west1-b # 2> /dev/null
#     helm upgrade "${cluster}-pheweb" . -f "${cluster}-values.yaml"
#     kubectl delete pods --all
# done

clusters=(metaresults-est-ukbb metaresults-ukbb)
for cluster in "${clusters[@]}"
do
    echo $cluster
    kubectl get pods
    gcloud container clusters get-credentials "$cluster" --region europe-west1-b # 2> /dev/null
    helm upgrade "${cluster}" . -f "${cluster}-values.yaml"
    kubectl delete pods --all
done
