pipeline {
  agent any
  stages {
    stage('Build') {
	    steps {
		script {    sh(script:"""sed -i "s/COMMIT_SHA/PHEWEB VERSION : \$(git log -n 1 --format=format:"%H")/" pheweb/serve/templates/about.html""")
			    sh(script:"""sed -i "s/hidden//" pheweb/serve/templates/about.html""")
		            c = docker.build("phewas-development/pheweb:ci-${env.$GIT_COMMIT}", "-f deploy/Dockerfile ./")
		  	    docker.withRegistry('http://gcr.io/phewas-development', 'gcr:phewas-development') { c.push("ci-${env.GIT_COMMIT}") }
			    docker.withRegistry('http://gcr.io/phewas-development', 'gcr:phewas-development') { c.push("ci-latest") }
		}
		script {    c_import = docker.build("phewas-development/pheweb:ci-import-${env.$GIT_COMMIT}", "-f deploy/Dockerfile ./")
		  	    docker.withRegistry('http://gcr.io/phewas-development', 'gcr:phewas-development') { c_import.push("ci-import-${env.GIT_COMMIT}") }
			    docker.withRegistry('http://gcr.io/phewas-development', 'gcr:phewas-development') { c_import.push("ci-import-latest") }
		}
	    }
	}
    stage('Deploy') {
	    steps {
                withCredentials([file(credentialsId: 'jenkins-sa', variable: 'gcp')]) {
                    sh '''/root/google-cloud-sdk/bin/gcloud auth activate-service-account --key-file=$gcp'''
                    sh '''/root/google-cloud-sdk/bin/gcloud auth configure-docker'''
                    sh '''/root/google-cloud-sdk/bin/gcloud container clusters get-credentials staging-pheweb --zone europe-west1-b'''
                    
                    sh '''if helm ls | grep bstaging > /dev/null  ; then COMMAND=upgrade ; else  COMMAND=install ; fi ;'''
		    sh '''helm ${COMMAND} ${SUBDOMAIN} ./deploy/pheweb --set pheweb.subdomain=${SUBDOMAIN} --set pheweb.mount=${MOUNT}'''
		}
	    }
	}
    }
}
