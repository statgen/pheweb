pipeline {
  agent any
  stages {
    stage('Build') {
	    steps {
		script {    sh(script:"""printenv""")
		            sh(script:"""sed -i "s/COMMIT_SHA/PHEWEB VERSION : \$(git log -n 1 --format=format:"%H")/" ui/src/common/commonConstants.tsx""")
		            c = docker.build("phewas-development/pheweb:ci-${env.$GIT_COMMIT}", "-f deploy/Dockerfile ./")
		  	    docker.withRegistry('http://eu.gcr.io/phewas-development', 'gcr:phewas-development') { c.push("ci-${env.GIT_COMMIT}") }
			    docker.withRegistry('http://eu.gcr.io/phewas-development', 'gcr:phewas-development') { c.push("ci-latest") }
		}

	    }
	}

    stage('Staging') {
            when { expression { env.GIT_BRANCH == 'origin/master' } }
	    steps {
                withCredentials([file(credentialsId: 'jenkins-sa', variable: 'gcp')]) {
		    sh '''helm plugin list | grep gcs || helm plugin install https://github.com/hayorov/helm-gcs.git --version 0.4.0'''
                    sh '''/root/google-cloud-sdk/bin/gcloud auth activate-service-account --key-file=$gcp'''
		    sh '''helm repo add production_jenkins_storage_green gs://production_jenkins_storage_green/helm/charts'''
		    sh '''helm repo update'''
		    sh '''helm fetch production_jenkins_storage_green/finngen-pheweb'''
                    sh '''/root/google-cloud-sdk/bin/gcloud container clusters get-credentials development-staging-pheweb --zone europe-west1-b'''
                    sh '''if helm ls | grep development-staging > /dev/null  ; then
		          helm get values development-staging | grep -v USER-SUPPLIED > ./staging-values.yaml ;
			  helm upgrade development-staging production_jenkins_storage_green/finngen-pheweb -f ./staging-values.yaml  --set image.tag=ci-${GIT_COMMIT} ;
			  kubectl delete pods --all --wait=false
			  fi'''
		}

	    }
	}

    }
}
