grant read access to serviceAccount:pheweb@phewas-development.iam.gserviceaccount.com
your bucket this will be used to pull data down to the nfs.

gsutil iam ch serviceAccount:pheweb@phewas-development.iam.gserviceaccount.com:legacyObjectReader gs://r${release}_data_green
gsutil iam ch serviceAccount:pheweb@phewas-development.iam.gserviceaccount.com:legacyBucketReader gs://r${release}_data_green

gcloud deployment-manager deployments create r1-deployment --config r1-values.yaml --automatic-rollback-on-error
gcloud compute config-ssh

ssh into the box to exchange keys

```
ssh ${enviroment}-${release}-instance-nfs.${region}.${project}
```

add entry for the box to the inventory file for ${enviroment}-{release}-instance-nfs in
  - inventory.ini
  - host_vars/${enviroment}-{release}-instance-nfs

check entry

```
ansible -i inventory.ini  all -m ping -v
```

Provision nfs

```
ansible-playbook site.yml -i inventory.ini -u ${USER}
```

1. copy files
2. setup cron
3.


# Reference
  https://github.com/GoogleCloudPlatform/deploymentmanager-samples