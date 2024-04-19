 pipeline {
     agent any
        
     stages {
         stage('Checkout') {
             steps {
                 git branch: 'master', url: 'https://github.com/bridgecrewio/terragoat'
                 stash includes: '**/*', name: 'terragoat'
             }
         }
         stage('Checkov') {
             steps {
                 script {
                     docker.image('bridgecrew/checkov:latest').inside("--entrypoint=''") {
                         unstash 'terragoat'
                         try {
                             sh 'checkov -d . -o cli -o junitxml --output-file-path console,results.xml --repo-id patrickoconnor80/patrick-cloud-website --branch main'
                             junit skipPublishingChecks: true, testResults: 'results.xml'
                         } catch (err) {
                             junit skipPublishingChecks: true, testResults: 'results.xml'
                             throw err
                         }
                     }
                 }
             }
         }
     }
     options {
         preserveStashes()
         timestamps()
     }
 }