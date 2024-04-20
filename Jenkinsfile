node {

    stage('Clone Repository') {
        checkout scm
    }

    stage('Checkov Scan') {
       sh '''
            export CHECKOV_OUTPUT_CODE_LINE_LIMIT=100
            SKIPS=$(cat 'tf/.checkovignore.json' | jq -r 'keys[]' | sed 's/$/,/' | tr -d '\n' | sed 's/.$//')
            [ -d "checkov_venv" ] && python3 -m venv checkov_venv
            . checkov_venv/bin/activate
            pip install checkov
            pip list
            checkov -d ./tf --skip-check $SKIPS
            deactivate
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

