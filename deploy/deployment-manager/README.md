grant read access to serviceAccount:pheweb@phewas-development.iam.gserviceaccount.com
your bucket this will be used to pull data down to the nfs.

gsutil iam ch serviceAccount:pheweb@phewas-development.iam.gserviceaccount.com:legacyObjectReader gs://r${release}_data_green
gsutil iam ch serviceAccount:pheweb@phewas-development.iam.gserviceaccount.com:legacyBucketReader gs://r${release}_data_green

gcloud deployment-manager deployments create r1-deployment --config r1-values.yaml --automatic-rollback-on-error
gcloud compute config-ssh
ansible-playbook site.yml -i inventory.ini -u ${USER}

1. copy files
2. setup cron
3. 