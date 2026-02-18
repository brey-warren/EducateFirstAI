# EducateFirstAI

AI-powered web application to help students understand complex FAFSA forms through an intuitive chat interface.

## Project Structure

```
educate-first-ai/
├── src/                    # React TypeScript frontend
├── cdk/                    # AWS CDK infrastructure code
├── amplify.yml            # AWS Amplify build configuration
├── package.json           # Frontend dependencies
└── README.md             # This file
```

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- AWS CLI configured with appropriate credentials
- AWS CDK CLI installed globally

### Frontend Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

### Infrastructure Deployment

```bash
# Navigate to CDK directory
cd cdk

# Install CDK dependencies
npm install

# Bootstrap CDK (first time only)
npx cdk bootstrap

# Deploy infrastructure
npm run deploy

# Destroy infrastructure
npm run destroy
```

## Architecture

- **Frontend**: React TypeScript with Vite
- **Hosting**: AWS Amplify
- **Backend**: AWS Lambda functions
- **Database**: Amazon DynamoDB
- **AI**: Amazon Bedrock
- **Authentication**: Amazon Cognito
- **Storage**: Amazon S3
- **Infrastructure**: AWS CDK

## Testing

The project uses a dual testing approach:

- **Unit Tests**: Vitest with React Testing Library
- **Property-Based Tests**: fast-check for universal property validation

## AWS Services Used

- **AWS Amplify**: Static web hosting and CI/CD
- **Amazon Cognito**: User authentication and management
- **Amazon DynamoDB**: NoSQL database for user data and conversations
- **Amazon S3**: Storage for FAFSA knowledge base documents
- **AWS Lambda**: Serverless backend functions
- **Amazon Bedrock**: AI/ML services for natural language processing
- **API Gateway**: REST API management
- **CloudWatch**: Monitoring and logging

## Free Tier Compliance

The application is designed to stay within AWS Free Tier limits:

- DynamoDB: Pay-per-request billing
- Lambda: Optimized for minimal execution time
- S3: Efficient storage usage
- Amplify: Free tier hosting limits
- Cognito: Free tier user limits

## Getting Started

1. Clone the repository
2. Install frontend dependencies: `npm install`
3. Install CDK dependencies: `cd cdk && npm install`
4. Configure AWS credentials
5. Deploy infrastructure: `cd cdk && npm run deploy`
6. Start development server: `npm run dev`

## Environment Variables

The following environment variables will be set after CDK deployment:

- `VITE_USER_POOL_ID`: Cognito User Pool ID
- `VITE_USER_POOL_CLIENT_ID`: Cognito User Pool Client ID
- `VITE_API_GATEWAY_URL`: API Gateway endpoint URL
- `VITE_KNOWLEDGE_BASE_BUCKET`: S3 bucket name for knowledge base

## Contributing

1. Follow TypeScript and React best practices
2. Write tests for new functionality
3. Use ESLint and Prettier for code formatting
4. Ensure accessibility compliance (WCAG 2.1 AA)
5. Test on both mobile and desktop devices