node {

    stage('Clone Repository') {
        checkout scm
    }

    stage('Checkov Scan') {
       sh '''
            cd tf
            python3 -m site
            export CHECKOV_OUTPUT_CODE_LINE_LIMIT=100
            SKIPS=$(cat '.checkovignore.json' | jq -r 'keys[]' | sed 's/$/,/' | tr -d '\n' | sed 's/.$//')
            python3 -c 'import sys;print(sys.path)'
            pip install checkov
            pip show checkov
            checkov -d . --skip-check $SKIPS -o cli -o junitxml --output-file-path console,results.xml
        '''
    }

    stage('Apply Terraform') {
        sh '''
            terraform init -backend-config=./env/dev/backend.config -reconfigure
            terraform apply -var-file=./env/dev/dev.tfvars -lock=false -auto-approve
            terraform output -json > ../../config/terraform_outputs/tf_outputs_network.json
        '''
    }


}

