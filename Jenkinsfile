pipeline {
  agent any
  stages {
    stage('Build') {
	    steps {
		script {    sh(script:"""sed -i "s/COMMIT_SHA/PHEWEB VERSION : \$(git log -n 1 --format=format:"%H")/" pheweb/serve/react/js/common/constants.tsx""")
			    sh(script:"""sed -i "s/hidden//" pheweb/serve/templates/about.html""")
		            c = docker.build("phewas-development/pheweb:ci-${env.$GIT_COMMIT}", "-f deploy/Dockerfile ./")
		  	    docker.withRegistry('http://eu.gcr.io/phewas-development', 'gcr:phewas-development') { c.push("ci-${env.GIT_COMMIT}") }
			    docker.withRegistry('http://eu.gcr.io/phewas-development', 'gcr:phewas-development') { c.push("ci-latest") }
		}

	    }
	}
    stage('Deploy') {
	    steps {
                withCredentials([file(credentialsId: 'jenkins-sa', variable: 'gcp')]) {
                    sh '''/root/google-cloud-sdk/bin/gcloud auth activate-service-account --key-file=$gcp'''
                    sh '''/root/google-cloud-sdk/bin/gcloud auth configure-docker'''
                    sh '''/root/google-cloud-sdk/bin/gcloud container clusters get-credentials staging-pheweb --zone europe-west1-b'''
                    sh '''if helm ls | grep pheweb > /dev/null  ; then  helm upgrade staging-pheweb ./deploy/pheweb -f ./deploy/pheweb/staging-values.yaml --set image.tag=ci-${GIT_COMMIT} ; else helm install staging-pheweb ./deploy/pheweb  -f ./deploy/pheweb/staging-values.yaml --set image.tag=ci-${GIT_COMMIT} ; fi ; '''
                    sh '''kubectl delete pods --all --wait=false'''
		}
	    }
	}
    }
}
