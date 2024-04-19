node {

    stage('Clone Repository') {
        checkout scm
    }

    stage('Checkov Scan') {
       sh "export CHECKOV_OUTPUT_CODE_LINE_LIMIT=100"
       sh "SKIPS=$(cat '.checkovignore.json' | jq -r 'keys[]' | sed 's/$/,/' | tr -d '\n' | sed 's/.$//')"
       sh "pipenv run pip install checkov"
       sh "pipenv run checkov -d . --skip-check $SKIPS --use-enforcement-rules -o cli -o junitxml --output-file-path console,results.xml --branch main"
    }

    stage('Apply Terraform') {
        sh "terraform init -backend-config=./env/dev/backend.config -reconfigure"
        sh "terraform apply -var-file=./env/dev/dev.tfvars -lock=false -auto-approve"
        sh "terraform output -json > ../../config/terraform_outputs/tf_outputs_network.json"
    }


}