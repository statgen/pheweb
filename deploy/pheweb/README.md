Assuming your are starting off with a new cluster
0. Check version of gcloud
   gcloud --version

   Requires at least : beta 2020.01.31

1. install helm
   https://helm.sh/docs/intro/install/
2. get gcloud credentials for your cluster

```
	gcloud container clusters get-credentials <clustername> --zone europe-west1-b
```

3. get certificates

```
	gcloud beta secrets list
	
	gvalues.yaml
cloud beta secrets versions access latest --secret=<cert name> > cert.pem
	gcloud beta secrets versions access latest --secret=<key name> > cert_key.pem
	
```

4. install certificate

```
	kubectl create secret tls finngen-tls --cert=cert.pem --key=cert_key.pem
```

5. create configuration


in this folder create

${subdomain name}_values.yml

```
replicaCount: 3          # number of replicas

pheweb:
  mount: /mnt/nfs        # path of mount
  subdomain: r6          # domain name
  ipName: finngen-r6-ip  # name of ip
  
persistentVolume:
  path: /vol1            # nfs path
  server: 10.179.247.250 # nfs server
```

It is assumed the path of the pheweb folder 
is ${pheweb.mount}/pheweb/${pheweb.subdomain}

Setup you pheweb directory

${pheweb.mount}/pheweb/${pheweb.subdomain}

You can override using

${pheweb.directory}

6. install

   To install

```
	helm install ${pheweb.subdomain}_pheweb . -f ${pheweb.subdomain}_values.yaml
```
7. check

   To check status of install

```
   helm ls
```


8. update

If you have to install

```
	helm install ${pheweb.subdomain}_pheweb . -f ${pheweb.subdomain}_values.yaml
```


# Configure 

Don't use these variables 
Additional configuration variables if needed.

Pheweb image :
image.repository # repository image
image.pullPolicy # pull policy
image.tag:       # tag to use

Service :
service.type     # type of service
service.port     # port to bind on

Replica count :
replicaCount:    # replica count

Pheweb properties:
pheweb.mount     # mount point 
pheweb.subdomain # subdomain of finngen
pheweb.directory # directory of pheweb

NFS
persistentVolume.storage # nfs size
persistentVolume.path    # nfs path
persistentVolume.server  # nfs server


