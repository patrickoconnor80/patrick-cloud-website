node {

    stage('Clone Repository') {
        checkout scm
    }

    stage('Checkov Scan') {
       sh '''
            ls tf
            export CHECKOV_OUTPUT_CODE_LINE_LIMIT=100
            ls tf
            SKIPS=$(cat 'tf/.checkovignore.json' | jq -r 'keys[]' | sed 's/$/,/' | tr -d '\n' | sed 's/.$//')
            ls tf
            [ ! -d "checkov_venv" ] && python3 -m venv checkov_venv
            ls tf
            . checkov_venv/bin/activate
            ls tf
            pip install checkov
            ls tf
            pip list
            ls tf
            checkov -d ./tf --skip-check $SKIPS
            ls tf
            deactivate
            ls tf
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

