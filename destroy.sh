#!/usr/bin/env bash
set -euo pipefail

# load env variables from .env file if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

echo "Using environment variables:"
echo "  AWS_REGION: ${AWS_REGION}"
echo "  DEPLOY_ENV: ${DEPLOY_ENV}"

export AWS_PROFILE="soni-1214"
REPO_NAME="${PROJECT}-${DEPLOY_ENV}-backend"
STACK_NAME="${PROJECT}-${DEPLOY_ENV}"
INFRA_DIR="./infra"

# ──────────────── CDK DEPLOY (update stack with new image tag) ────────────────
echo "🚀 Destroying CloudFormation stack ${STACK_NAME}"

cd "${INFRA_DIR}"

cdk context --clear
cdk destroy \
  --require-approval never \
  --context stage="${DEPLOY_ENV}"

echo "✅ Backend destroyed successfully"
