# install plugins

```
ansible-galaxy collection install community.mysql
ansible-galaxy collection install community.docker
ansible-galaxy collection install ansible.posix
```

# provision server

Update ssh keys

```
gcloud compute config-ssh --project phewas-development
gcloud compute config-ssh --project finngen-refinery-dev
```

```
ansible-playbook site.yml -i inventory.ini -u ${USER}  --limit <<your host>>
```

# configuration for roles

## nfs

share\_directory: directory to share
pheweb\_directory: directory to place pheweb
bucket\_directory: bucket backup

## restart_pods

restart\_pods\_nfs\_mount: directory to mount
restart\_pods\_data\_dir: data directory
restart\_pods\_artifact: restart pods executable
restart\_pods\_configuration\_secret\_name: name of restart pod secret the format is given bellow

```
{  "fs_root": ...
   "mysql_host": ...
   "mysql_user": ...
   "mysql_password": ...
   "mysql_db_name": ...
   "cluster_id": ...
   "project_id": ...
   "project_zone": ... }

```
