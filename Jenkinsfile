pipeline {
  agent any
  stages {
    stage('Build') {
      steps {
        script {    c = docker.build("phewas-development/pheweb:test-${env.$BUILD_NUMBER}", "-f deploy/Dockerfile ./")
		    docker.withRegistry('http://gcr.io/phewas-development', 'gcr:phewas-development') {
			      c.push("build-${env.BUILD_NUMBER}")
		    }
		    docker.withRegistry('http://gcr.io/phewas-development', 'gcr:phewas-development') {
			      c.push("latest-ci")
		    }
		}
	    }
	}
    }
}
