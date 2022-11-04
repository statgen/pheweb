# Creating a release

  These resources will be created independently of
  the deployment

  ip - the dns is tied to the ip
  bucket - data is archived here
  oauth - currently not part of deloyment manager so has to be done manually

  These resource will be managed by the deployment manger.

  nfs - a nfs server
  kubernettes - a k8 cluster

## Setup your environment

  For consistency the release will be referred to

  ${release} e.g ${release}="r9","userresults"
  ${environment} e.g. ${environment}=production,development,staging
  ${project} e.g. phewas-development
  ${region} this should be 'europe-west1-b'

  Below is an example for a fictional release r100


```
export release=r100
export environment=production
export project=phewas-development
export region=europe-west1-b
```

## Create bucker for data

```
	gsutil mb -p phewas-development -c STANDARD -l ${region} -b on gs://${release}_data_green
```

   Place data for release in the following directory.
   The nfs will synch from this directory.

   gs://${release}_data_green/${environment}/pheweb


## Create IP
   https://console.cloud.google.com/networking/addresses/list

   Reserve a static address

   Name: production-${release}-pheweb-ip
   Network Service Tier : Premium
   IP version : IPv4
   Type : Global
   Region : ${europe-west1-b}

## Request DNS

   Request the domain name for release.

   ${release}.finngen.fi to resolve to the ip address
   just created.

## Create Oauth

   https://console.cloud.google.com/apis/credentials

   Create credentials

   Oauth clientId
   Application Type : Web Application
   Name : PheWeb ${release}
   Authorized JavaScript origins : https://${release}.finngen.fi
   Authorized redirect URIs :

   When saving oauth credential look at a previous verison to
   see how to format it and how to enable group authentication.
   
   Specific to FINNGEN project.  Get a list of previous secrets
   ```
   gcloud beta secrets list | grep -e 'production_.*oauth'
   ```
   
   ```
   gcloud beta secrets versions access latest --secret=<<secret name from above step>>
   ```
   
## Create Deployment

  Create deployment
```
   gcloud deployment-manager deployments create ${environment}-${release} --config=${environment}-${release}-pheweb-values.yaml
```

## Log into kubernettes cluster

	Setup the credentials for the kubernettes cluster.

```
   gcloud container clusters get-credentials ${environment}-${release}-pheweb --region ${region}
```

## Setup nfs


update keys

```
gcloud compute config-ssh
```

Ssh into the box to exchange keys.  This will enter the
machine into your known-hosts.

```
ssh ${enviroment}-${release}-instance-nfs.${region}.${project}
```

Setup bucket for files:

Add entry for the box to the inventory file for ${enviroment}-{release}-instance-nfs in
- inventory.ini
- host_vars/${enviroment}-{release}-instance-nfs (use previous release or template as a guide)

Check ansible version is >= core 2.12.4

```
ansible --version
```

Check _inventory.ini_  entry.  this should successfully ping your server.

```
ansible -i inventory.ini  all -m ping -v
```

Provision the server

```
ansible-playbook site.yml -i inventory.ini -u ${USER} -vvvv
```

The above command runs for all servers and
can be speed up but limiting it to the new
server.

```
ansible-playbook site.yml -i inventory.ini -u ${USER}  --limit ${enviroment}-{release}-instance-nfs
```

## Install secrets

   Back up credentials in google cloud secrets

   oauth.conf                                   ${environment}_${release}_oauth
   pheweb-group-oauth.json                      pheweb_group_oauth
   service-account-credentials.json             service_account_credentials
   cloud-sql-credentials.json                   cloud_sql_credentials
   mysql.conf                                   ${environment}_${release}_mysql.conf



   NOTE : pheweb_group_oauth, service_account_credentials,
   cloud_sql_credentials
   should be also populated by previous releases

```
   # oauth.conf
   gcloud beta secrets create ${environment}_${release}_oauth --replication-policy="user-managed" --locations=europe-west1
   gcloud beta secrets versions add ${environment}_${release}_oauth --data-file=oauth.conf


   # pheweb_group_oauth          : populated in previous releases
   # service_account_credentials : populated in previous releases

   # mysql.conf
   gcloud beta secrets create ${environment}_${release}_mysql_conf --replication-policy="user-managed" --locations=europe-west1
   gcloud beta secrets versions add ${environment}_${release}_mysql_conf --data-file=mysql.conf
```

   NOTE : It is mandatory to add the appropriate groups to make the secret assible to all developers and roles
   see the secrets in the to find the appropriate groups.
   
   e.g. gcloud beta secrets add-iam-policy-binding my_secret --member=group:my_group --role=roles/secretmanager.viewer

   Pull the secrets you just installed. This step ensures the cluster can be recovered with the necessary secrets.

```
   gcloud beta secrets versions access latest --secret=${environment}_${release}_oauth       > oauth.conf
   gcloud beta secrets versions access latest --secret=pheweb_group_oauth                    > pheweb-group-oauth.json
   gcloud beta secrets versions access latest --secret=service_account_credentials           > service-account-credentials.json
   gcloud beta secrets versions access latest --secret=cloud_sql_credentials                 > cloud-sql-credentials.json
   gcloud beta secrets versions access latest --secret=${environment}_${release}_mysql_conf  > mysql.conf

```

   gcloud container clusters get-credentials ${environment}-${release}-pheweb --region europe-west1-b

   Install secrets in the cluster.
   NOTE : the names should remained unchanged.


```
         kubectl create secret generic ${environment}-${release}-secrets \
           --from-file=oauth.conf \
           --from-file=pheweb-group-oauth.json \
           --from-file=service-account-credentials.json \
           --from-file=mysql.conf \
           --from-file=cloud-sql-credentials.json
```

   Check secrets are installed.

```
   kubectl describe secret ${environment}-${release}-secrets
```

## Install Pheweb


   Create values file ${release}-values.yaml . Use the older release
   files have

```
   helm install ${environment}-${release} .  -f ${environment}-${release}-pheweb-values.yaml
```

## Upgrading pheweb

  To upgrade, edit the appropriate yaml
  file and then upgrade using helm.

```
   helm upgrade ${environment}-${release} .  -f ${environment}-${release}-pheweb-values.yaml
```

## Admin Pheweb

   Various helm commands for cluster administration

### Take down pheweb

To take down pheweb and keep the helm history

```
helm uninstall ${release}-pheweb --keep-history
```

### Restore older version


# Deleting deployment

```
   gcloud deployment-manager deployments delete ${environment}-${release}-pheweb
```

# Backup directories

```
  gsutil -m rsync -r /mnt/nfs/pheweb/${release} gs://${release}_data_green/${environment}/pheweb
```

# Reference
	[deployment manager](https://github.com/GoogleCloudPlatform/deploymentmanager-samples)
	[ansible](https://docs.ansible.com/ansible_community.html)
