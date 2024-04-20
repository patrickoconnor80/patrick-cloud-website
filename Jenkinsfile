node {

    stage('Clone Repository') {
        checkout scm
    }

    stage('Checkov Scan') {
       sh '''
            cd tf
            export CHECKOV_OUTPUT_CODE_LINE_LIMIT=100
            SKIPS=$(cat '.checkovignore.json' | jq -r 'keys[]' | sed 's/$/,/' | tr -d '\n' | sed 's/.$//')
            python3 -m venv checkov_venv
            . checkov_venv/bin/activate
            pip install checkov
            pip list
            checkov -d . --skip-check $SKIPS -o cli -o junitxml --output-file-path console,results.xml
        '''
    }

    stage('Apply Terraform') {
        sh '''
            cd tf
            terraform init -backend-config=./env/dev/backend.config -reconfigure
            terraform apply -var-file=./env/dev/dev.tfvars -lock=false -auto-approve
            terraform output -json > ../../config/terraform_outputs/tf_outputs_network.json
        '''
    }


}

