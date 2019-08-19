#!/usr/bin/env bash

SOURCE_DISK="finngen-r3-results-v2-0"
SNAPSHOT="finngen-r3-results-v2"
DISK_PREFIX="finngen-r3-results-v2"

gcloud compute disks snapshot $SOURCE_DISK --snapshot-names $SNAPSHOT --zone europe-west1-b
for ((i=1; i<4; i++)); do
 gcloud compute disks create ${DISK_PREFIX}-$i --type pd-ssd --zone europe-west1-b --source-snapshot $SNAPSHOT
 #gcloud compute disks create ${DISK_PREFIX}-dev --type pd-ssd --zone europe-west1-b --source-snapshot $SNAPSHOT
done
