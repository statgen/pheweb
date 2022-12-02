all:list

list:
	echo "finngen-refinery-dev"
	gcloud deployment-manager deployments list --project finngen-refinery-dev
	echo "phewas-development"
	gcloud deployment-manager deployments list --project phewas-development

create-red-development-userresults-pheweb:
	gcloud deployment-manager deployments create red-development-pipeline-pheweb   --config red-development-pipeline-pheweb-values.yaml   --project finngen-refinery-dev -q --automatic-rollback-on-error

delete-red-development-userresults-pheweb:
	gsutil -m rm -r gs://red-development-userresults-cromwell-storage ;\
	gcloud deployment-manager deployments delete red-development-pipeline-pheweb --project finngen-refinery-dev -q

create-green-development-userresults-pheweb:
	gcloud deployment-manager deployments create green-development-userresults-pheweb --config green-development-userresults-pheweb-values.yaml --project phewas-development -q --automatic-rollback-on-error

delete-green-development-userresults-pheweb:
	gsutil -m rm -r gs://green-development-userresults-cromwell-storage ;\
	gcloud deployment-manager deployments delete green-development-userresults-pheweb --project phewas-development -q

create-red-production-userresults-pheweb:
	gcloud deployment-manager deployments create red-production-userresults-pheweb --config red-production-userresults-pheweb-values.yaml --project finngen-refinery-dev -q --automatic-rollback-on-error

delete-red-production-userresults-pheweb:
	gsutil -m rm -r gs://red-production-userresults-cromwell-storage ;\
	gcloud deployment-manager deployments delete red-production-userresults-pheweb --project finngen-refinery-dev -q


create-green-production-userresults-pheweb:
	gcloud deployment-manager deployments create green-production-userresults-pheweb --config green-production-userresults-pheweb-values.yaml --project phewas-development -q --automatic-rollback-on-error

delete-green-production-userresults-pheweb:
	gsutil -m rm -r gs://green-production-userresults-cromwell-storage ;\
	gcloud deployment-manager deployments delete green-production-userresults-pheweb --project finngen-refinery-dev -q --automatic-rollback-on-error
