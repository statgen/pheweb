pipeline {
  agent any
  stages {
    stage('Build') {
      steps {
        script {    c = docker.build("phewas-development/pheweb:test-${$BUILD_NUMBER}", "-f deploy/Dockerfile ./")
		    docker.withRegistry('http://gcr.io/phewas-development', 'gcr:phewas-development') {
			      c.push("build-${env.BUILD_NUMBER}")
		    }
		    docker.withRegistry('http://gcr.io/phewas-development', 'gcr:phewas-development') {
			      c.push("latest-ci")
		    }
		}
	    }
	}
    stage('Tests') {
      steps{
        script{
          c.inside("-u root"){sh """python3 -m pip install pytest
                                    cd /pheweb
                                    python3 -m pytest"""}
        }
      }
    }
    //stage for code metrics etc. Using sonar
    /*	
    stage('Metrics') {
      steps {
        withSonarQubeEnv('sonar') {
          sh "${tool("sonar")}/bin/sonar-scanner \
          -Dsonar.projectKey=${JOB_NAME} \
          -Dsonar.sources=. \
          -Dsonar.css.node=. \
          -Dsonar.host.url=${DEFAULT_SONAR_URL} \
          -Dsonar.login=${SONAR_LOGIN}"
        }
      }
    } 
    */
  }
}
