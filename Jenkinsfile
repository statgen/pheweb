pipeline {
  agent any
  stages {
    stage('Build') {
      steps {
        script {    c = docker.build("phewas-development/pheweb:ci-${env.$GIT_COMMIT}", "-f deploy/Dockerfile ./")
		    docker.withRegistry('http://gcr.io/phewas-development', 'gcr:phewas-development') {
			      c.push("ci-${env.GIT_COMMIT}")
		    }
		    docker.withRegistry('http://gcr.io/phewas-development', 'gcr:phewas-development') {
			      c.push("ci-latest")
		    }
		}
	    }
	}
    }
}
