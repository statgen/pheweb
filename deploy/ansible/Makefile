all:
	gcloud compute config-ssh --project phewas-development ;\
	gcloud compute config-ssh --project finngen-refinery-dev ;\
	ansible all -m ping -i inventory.ini

development-userresults:
	ansible-playbook site.yml -i inventory.ini -u ${USER}  --limit "green-development-userresults-instance-nfs,green-development-userresults-cromwell-instance,red-development-userresults-cromwell-instance"

production-userresults:
	ansible-playbook site.yml -i inventory.ini -u ${USER}  --limit "green-production-userresults-instance-nfs,green-production-userresults-cromwell-instance,red-production-userresults-cromwell-instance"
