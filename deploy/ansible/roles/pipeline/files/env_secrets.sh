#!/usr/bin/env bash

secret_name="$1"; shift

json=$(gcloud beta secrets versions access latest --secret="$secret_name")
for KEY in $(echo ${json} | jq -r '. | keys[]'); do
    export ${KEY}=$(echo ${json} | jq -r .${KEY})
done

"$@"
