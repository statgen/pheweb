Assuming your are starting off with a new cluster created with e.g.

```
gcloud container clusters create <clustername> --num-nodes=1 --machine-type=n1-standard-1 --zone=europe-west1-b --project phewas-development
```

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
	
	gcloud beta secrets versions access latest --secret=<cert name> > cert.pem
	gcloud beta secrets versions access latest --secret=<key name> > cert_key.pem
	
```

4. install certificate

```
	kubectl create secret tls finngen-tls --cert=cert.pem --key=cert_key.pem
```

5. create configuration


From the root of this repo `cd deploy/pheweb` and create

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
	helm upgrade ${pheweb.subdomain}_pheweb . -f ${pheweb.subdomain}_values.yaml
```



# Configure 

Below is the full configuration will all fields specified

```
# Default values are found in values.yaml                                                                                                                                                                          

replicaCount: 3                  # (required) replica count                                                                                                                                                        

pheweb:
  mount: /mnt/nfs                # (required) nfs mount point                                                                                                                                                      
  subdomain: r6                  # (required) sub domain name                                                                                                                                                      
  ipName: finngen-r6-ip          # (required) ip address name                                                                                                                                                      

  # (optional) pheweb directory this defaults to                                                                                                                                                                   
  # ${pheweb.mount}/pheweb/{pheweb.subdomain}                                                                                                                                                                      
  directory : /mnt/nfs/pheweb/r6

persistentVolume:
  path: /vol1                    # (required) nfs path                                                                                                                                                             
  server: 10.179.247.250         # (required) nfs server                                                                                                                                                           
  storage: 11T                   # (optional)                                                                                                                                                                      

image: # pheweb image                                                                                                                                                                                              
  repository: gcr.io/phewas-development/pheweb     # (optional) docker repository                                                                                                                                  
  pullPolicy: IfNotPresent                         # (optional)                                                                                                                                                    

  # (optional) tag defaults to the current release set                                                                                                                                                             
  # in values.yaml                                                                                                                                                                                                 
  tag: ci-bc3e2881d43ad7ff4c2820c58a68bbaf128a0d60

service:
  type: NodePort # (optional)                                                                                                                                                                                      
  port: 80       # (optional)                                 ```
