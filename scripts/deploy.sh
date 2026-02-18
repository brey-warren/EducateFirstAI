#!/bin/bash

# EducateFirstAI Deployment Script

set -e

echo "🚀 Starting EducateFirstAI deployment..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Deploy CDK infrastructure
echo "📦 Deploying AWS infrastructure..."
cd cdk
npm install
npx cdk bootstrap --require-approval never
npx cdk deploy --require-approval never

# Get outputs from CDK deployment
echo "📋 Retrieving deployment outputs..."
USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name EducateFirstAiStack --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' --output text)
USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name EducateFirstAiStack --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' --output text)
API_GATEWAY_URL=$(aws cloudformation describe-stacks --stack-name EducateFirstAiStack --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' --output text)
KNOWLEDGE_BASE_BUCKET=$(aws cloudformation describe-stacks --stack-name EducateFirstAiStack --query 'Stacks[0].Outputs[?OutputKey==`KnowledgeBaseBucketName`].OutputValue' --output text)

# Create environment file
cd ..
echo "📝 Creating environment configuration..."
cat > .env.local << EOF
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=$USER_POOL_ID
VITE_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
VITE_API_GATEWAY_URL=$API_GATEWAY_URL
VITE_KNOWLEDGE_BASE_BUCKET=$KNOWLEDGE_BASE_BUCKET
EOF

echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Configuration:"
echo "   User Pool ID: $USER_POOL_ID"
echo "   Client ID: $USER_POOL_CLIENT_ID"
echo "   API URL: $API_GATEWAY_URL"
echo "   S3 Bucket: $KNOWLEDGE_BASE_BUCKET"
echo ""
echo "🎯 Next steps:"
echo "   1. Run 'npm install' to install frontend dependencies"
echo "   2. Run 'npm run dev' to start development server"
echo "   3. Configure Amplify hosting for production deployment"