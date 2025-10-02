#!/usr/bin/env bash
set -euo pipefail

# ──────────────── CONFIG ────────────────
: "${AWS_REGION:=us-east-1}"
: "${STAGE:=dev}"
PROJECT="whiplash"
export PROJECT
export AWS_PROFILE="soni-1214"
REPO_NAME="${PROJECT}-${STAGE}-backend"
STACK_NAME="${PROJECT}-${STAGE}"
INFRA_DIR="./infra"

# ──────────────── CDK DEPLOY (update stack with new image tag) ────────────────
echo "🚀 Updating CloudFormation stack ${STACK_NAME} with BackendImageTag=${VERSION}"

cd "${INFRA_DIR}"

cdk context --clear
cdk destroy \
  --require-approval never \
  --context stage="${STAGE}" \
  --context version="${VERSION}"

echo "✅ Backend ${VERSION} destroyed successfully"
