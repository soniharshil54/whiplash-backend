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

# ──────────────── VERSION & IMAGE ────────────────
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
VERSION=$(cat VERSION)
IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:${VERSION}"

echo "🚀 Deploying backend version: ${VERSION}"
echo "📦 Image URI: ${IMAGE_URI}"
echo "📂 Infra stack: ${STACK_NAME}"

# ──────────────── DOCKER BUILD & PUSH ────────────────
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

export IMAGE_URI
docker compose -f docker-compose.build.yml build
docker push "${IMAGE_URI}"

# ──────────────── CDK DEPLOY (update stack with new image tag) ────────────────
echo "🚀 Updating CloudFormation stack ${STACK_NAME} with BackendImageTag=${VERSION}"

cd "${INFRA_DIR}"

cdk context --clear
cdk deploy \
  --require-approval never \
  --context stage="${STAGE}" \
  --context version="${VERSION}"

echo "✅ Backend ${VERSION} deployed successfully"
