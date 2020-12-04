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
	    }
	}
    stage('Deploy') {
	    steps {
		script {
		    sh(script:"""kubectl delete all --all""")
		    sh(script:"""kubectl delete pvc --all""")
                    sh(script:"""kubectl delete ingress --all""")

		    sh(script:"""kubectl apply -f deploy/staging/pv-nfs.yml""")
		    sh(script:"""kubectl apply -f deploy/staging/deployment.yaml""")
		    sh(script:"""ubectl apply -f deploy/staging/ingress.yaml""")
		}
	    }
	}
    }
}
