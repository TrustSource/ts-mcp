#!/usr/bin/env bash
set -euo pipefail

# Deploy TrustSource MCP Server via CloudFormation
#
# Uses AWS CLI profiles:
#   dev → RA@ts.dev
#   prd → RA@ts.prod
#
# Usage:
#   ./deploy/deploy.sh dev          # deploy to DEV
#   ./deploy/deploy.sh prd          # deploy to PRD
#   ./deploy/deploy.sh dev delete   # tear down DEV stack

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STACK_PREFIX="ts-mcp"

ENV="${1:-}"
ACTION="${2:-deploy}"

if [[ -z "$ENV" || ! "$ENV" =~ ^(dev|prd)$ ]]; then
  echo "Usage: $0 <dev|prd> [deploy|delete]"
  exit 1
fi

# Map environment to AWS profile
if [[ "$ENV" == "dev" ]]; then
  export AWS_PROFILE="RA@ts.dev"
elif [[ "$ENV" == "prd" ]]; then
  export AWS_PROFILE="RA@ts.prod"
fi

STACK_NAME="${STACK_PREFIX}-${ENV}"
PARAMS_FILE="${SCRIPT_DIR}/params4${ENV^^}.json"
TEMPLATE="${SCRIPT_DIR}/cfn-ecs-service.yaml"

if [[ ! -f "$PARAMS_FILE" ]]; then
  echo "Error: Parameter file not found: $PARAMS_FILE"
  exit 1
fi

# Check for placeholder values
if grep -q "REPLACE_WITH\|XXXXXXXXX\|YYYYYYY\|ACCOUNT" "$PARAMS_FILE"; then
  echo "Error: $PARAMS_FILE contains placeholder values. Please fill in actual values first."
  exit 1
fi

echo "Environment: $ENV"
echo "AWS Profile: $AWS_PROFILE"
echo "Stack:       $STACK_NAME"
echo "Template:    $TEMPLATE"
echo "Parameters:  $PARAMS_FILE"
echo ""

if [[ "$ACTION" == "delete" ]]; then
  echo "Deleting stack $STACK_NAME..."
  aws cloudformation delete-stack --stack-name "$STACK_NAME"
  echo "Waiting for deletion..."
  aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME"
  echo "Stack $STACK_NAME deleted."
  exit 0
fi

# Validate template
echo "Validating template..."
aws cloudformation validate-template --template-body "file://$TEMPLATE" > /dev/null

# Check if stack exists
STACK_EXISTS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" 2>/dev/null && echo "yes" || echo "no")

if [[ "$STACK_EXISTS" == "yes" ]]; then
  echo "Updating existing stack $STACK_NAME..."
  aws cloudformation update-stack \
    --stack-name "$STACK_NAME" \
    --template-body "file://$TEMPLATE" \
    --parameters "file://$PARAMS_FILE" \
    --capabilities CAPABILITY_NAMED_IAM \
    2>&1 || {
      # "No updates are to be performed" is not a real error
      if [[ $? -ne 0 ]]; then
        echo "No updates needed or update failed."
        exit 0
      fi
    }
  echo "Waiting for update..."
  aws cloudformation wait stack-update-complete --stack-name "$STACK_NAME"
else
  echo "Creating new stack $STACK_NAME..."
  aws cloudformation create-stack \
    --stack-name "$STACK_NAME" \
    --template-body "file://$TEMPLATE" \
    --parameters "file://$PARAMS_FILE" \
    --capabilities CAPABILITY_NAMED_IAM
  echo "Waiting for creation..."
  aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME"
fi

echo ""
echo "Stack $STACK_NAME deployed successfully."
echo ""

# Show outputs
aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs" \
  --output table
