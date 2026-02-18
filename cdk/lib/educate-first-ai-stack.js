"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EducateFirstAiStack = void 0;
const cdk = require("aws-cdk-lib");
const amplify = require("aws-cdk-lib/aws-amplify");
const cognito = require("aws-cdk-lib/aws-cognito");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
const s3 = require("aws-cdk-lib/aws-s3");
const lambda = require("aws-cdk-lib/aws-lambda");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const iam = require("aws-cdk-lib/aws-iam");
const path = require("path");
class EducateFirstAiStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // S3 Bucket for FAFSA Knowledge Base
        const knowledgeBaseBucket = new s3.Bucket(this, 'FAFSAKnowledgeBase', {
            bucketName: `fafsa-knowledge-base-${this.account}`,
            versioned: true,
            encryption: s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
        });
        // Cognito User Pool for Authentication
        const userPool = new cognito.UserPool(this, 'EducateFirstAiUserPool', {
            userPoolName: 'EducateFirstAi-Users',
            selfSignUpEnabled: true,
            signInAliases: {
                email: true,
            },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: false,
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        const userPoolClient = new cognito.UserPoolClient(this, 'EducateFirstAiUserPoolClient', {
            userPool,
            authFlows: {
                userPassword: true,
                userSrp: true,
                adminUserPassword: true,
            },
            generateSecret: false,
        });
        // DynamoDB Tables
        const usersTable = new dynamodb.Table(this, 'UsersTable', {
            tableName: 'EducateFirstAi-Users',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        const conversationsTable = new dynamodb.Table(this, 'ConversationsTable', {
            tableName: 'EducateFirstAi-Conversations',
            partitionKey: { name: 'conversationId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'messageTimestamp', type: dynamodb.AttributeType.NUMBER },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            timeToLiveAttribute: 'expiresAt',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        conversationsTable.addGlobalSecondaryIndex({
            indexName: 'userId-timestamp-index',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'messageTimestamp', type: dynamodb.AttributeType.NUMBER },
        });
        const userProgressTable = new dynamodb.Table(this, 'UserProgressTable', {
            tableName: 'EducateFirstAi-UserProgress',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        const responseCacheTable = new dynamodb.Table(this, 'ResponseCacheTable', {
            tableName: 'EducateFirstAi-ResponseCache',
            partitionKey: { name: 'queryHash', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            timeToLiveAttribute: 'expiresAt',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Lambda Layer for shared dependencies
        const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
            code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
            compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
            description: 'Shared dependencies for EducateFirstAI Lambda functions',
        });
        // Environment variables for Lambda functions
        const lambdaEnvironment = {
            AWS_REGION: this.region,
            USER_POOL_ID: userPool.userPoolId,
            USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
            USERS_TABLE_NAME: usersTable.tableName,
            CONVERSATIONS_TABLE_NAME: conversationsTable.tableName,
            USER_PROGRESS_TABLE_NAME: userProgressTable.tableName,
            RESPONSE_CACHE_TABLE_NAME: responseCacheTable.tableName,
            KNOWLEDGE_BASE_BUCKET: knowledgeBaseBucket.bucketName,
        };
        // Chat Lambda Functions
        const chatMessageFunction = new lambda.Function(this, 'ChatMessageFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'chat/handler.chatMessage',
            code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
            layers: [sharedLayer],
            environment: lambdaEnvironment,
            timeout: cdk.Duration.seconds(30),
            memorySize: 512,
        });
        const chatHistoryFunction = new lambda.Function(this, 'ChatHistoryFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'chat/handler.chatHistory',
            code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
            layers: [sharedLayer],
            environment: lambdaEnvironment,
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
        });
        // Auth Lambda Functions
        const signUpFunction = new lambda.Function(this, 'SignUpFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'auth/handler.signUp',
            code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
            layers: [sharedLayer],
            environment: lambdaEnvironment,
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
        });
        const signInFunction = new lambda.Function(this, 'SignInFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'auth/handler.signIn',
            code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
            layers: [sharedLayer],
            environment: lambdaEnvironment,
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
        });
        const forgotPasswordFunction = new lambda.Function(this, 'ForgotPasswordFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'auth/handler.forgotPassword',
            code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
            layers: [sharedLayer],
            environment: lambdaEnvironment,
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
        });
        const guestModeFunction = new lambda.Function(this, 'GuestModeFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'auth/handler.guestMode',
            code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
            layers: [sharedLayer],
            environment: lambdaEnvironment,
            timeout: cdk.Duration.seconds(5),
            memorySize: 128,
        });
        const getUserProfileFunction = new lambda.Function(this, 'GetUserProfileFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'auth/handler.getUserProfile',
            code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
            layers: [sharedLayer],
            environment: lambdaEnvironment,
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
        });
        // Progress Lambda Functions
        const getProgressFunction = new lambda.Function(this, 'GetProgressFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'progress/handler.getProgress',
            code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
            layers: [sharedLayer],
            environment: lambdaEnvironment,
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
        });
        const updateProgressFunction = new lambda.Function(this, 'UpdateProgressFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'progress/handler.updateProgress',
            code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
            layers: [sharedLayer],
            environment: lambdaEnvironment,
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
        });
        const getProgressSummaryFunction = new lambda.Function(this, 'GetProgressSummaryFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'progress/handler.getProgressSummary',
            code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
            layers: [sharedLayer],
            environment: lambdaEnvironment,
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
        });
        const getFAFSASectionsFunction = new lambda.Function(this, 'GetFAFSASectionsFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'progress/handler.getFAFSASections',
            code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
            layers: [sharedLayer],
            environment: lambdaEnvironment,
            timeout: cdk.Duration.seconds(5),
            memorySize: 128,
        });
        // Grant permissions to Lambda functions
        const lambdaFunctions = [
            chatMessageFunction,
            chatHistoryFunction,
            signUpFunction,
            signInFunction,
            forgotPasswordFunction,
            guestModeFunction,
            getUserProfileFunction,
            getProgressFunction,
            updateProgressFunction,
            getProgressSummaryFunction,
            getFAFSASectionsFunction,
        ];
        lambdaFunctions.forEach(func => {
            // DynamoDB permissions
            usersTable.grantReadWriteData(func);
            conversationsTable.grantReadWriteData(func);
            userProgressTable.grantReadWriteData(func);
            responseCacheTable.grantReadWriteData(func);
            // S3 permissions
            knowledgeBaseBucket.grantRead(func);
            // Bedrock permissions
            func.addToRolePolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'bedrock:InvokeModel',
                    'bedrock:InvokeModelWithResponseStream',
                ],
                resources: ['*'],
            }));
            // Cognito permissions
            func.addToRolePolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'cognito-idp:AdminCreateUser',
                    'cognito-idp:AdminSetUserPassword',
                    'cognito-idp:AdminInitiateAuth',
                    'cognito-idp:AdminRespondToAuthChallenge',
                    'cognito-idp:ForgotPassword',
                    'cognito-idp:ConfirmForgotPassword',
                ],
                resources: [userPool.userPoolArn],
            }));
        });
        // API Gateway
        const api = new apigateway.RestApi(this, 'EducateFirstAiApi', {
            restApiName: 'EducateFirstAi API',
            description: 'API for EducateFirstAI application',
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
            },
        });
        // API Routes
        // Chat routes
        const chatResource = api.root.addResource('chat');
        chatResource.addMethod('POST', new apigateway.LambdaIntegration(chatMessageFunction));
        const chatHistoryResource = chatResource.addResource('history').addResource('{userId}');
        chatHistoryResource.addMethod('GET', new apigateway.LambdaIntegration(chatHistoryFunction));
        // Auth routes
        const authResource = api.root.addResource('auth');
        authResource.addResource('signup').addMethod('POST', new apigateway.LambdaIntegration(signUpFunction));
        authResource.addResource('signin').addMethod('POST', new apigateway.LambdaIntegration(signInFunction));
        authResource.addResource('forgot-password').addMethod('POST', new apigateway.LambdaIntegration(forgotPasswordFunction));
        authResource.addResource('guest').addMethod('POST', new apigateway.LambdaIntegration(guestModeFunction));
        const userResource = authResource.addResource('user').addResource('{userId}');
        userResource.addMethod('GET', new apigateway.LambdaIntegration(getUserProfileFunction));
        // Progress routes
        const progressResource = api.root.addResource('progress');
        const userProgressResource = progressResource.addResource('{userId}');
        userProgressResource.addMethod('GET', new apigateway.LambdaIntegration(getProgressFunction));
        userProgressResource.addMethod('PUT', new apigateway.LambdaIntegration(updateProgressFunction));
        const progressSummaryResource = userProgressResource.addResource('summary');
        progressSummaryResource.addMethod('GET', new apigateway.LambdaIntegration(getProgressSummaryFunction));
        const fafsaSectionsResource = progressResource.addResource('sections');
        fafsaSectionsResource.addMethod('GET', new apigateway.LambdaIntegration(getFAFSASectionsFunction));
        // Amplify App for hosting
        const amplifyApp = new amplify.CfnApp(this, 'EducateFirstAiApp', {
            name: 'EducateFirstAI',
            description: 'AI-powered FAFSA assistance application',
            buildSpec: JSON.stringify({
                version: '1.0',
                frontend: {
                    phases: {
                        preBuild: {
                            commands: ['npm ci'],
                        },
                        build: {
                            commands: ['npm run build'],
                        },
                    },
                    artifacts: {
                        baseDirectory: 'dist',
                        files: ['**/*'],
                    },
                    cache: {
                        paths: ['node_modules/**/*'],
                    },
                },
            }),
        });
        const mainBranch = new amplify.CfnBranch(this, 'MainBranch', {
            appId: amplifyApp.attrAppId,
            branchName: 'main',
            enableAutoBuild: true,
        });
        // Output important values
        new cdk.CfnOutput(this, 'UserPoolId', {
            value: userPool.userPoolId,
            description: 'Cognito User Pool ID',
        });
        new cdk.CfnOutput(this, 'UserPoolClientId', {
            value: userPoolClient.userPoolClientId,
            description: 'Cognito User Pool Client ID',
        });
        new cdk.CfnOutput(this, 'ApiGatewayUrl', {
            value: api.url,
            description: 'API Gateway URL',
        });
        new cdk.CfnOutput(this, 'AmplifyAppUrl', {
            value: `https://main.${amplifyApp.attrDefaultDomain}`,
            description: 'Amplify App URL',
        });
        new cdk.CfnOutput(this, 'KnowledgeBaseBucketName', {
            value: knowledgeBaseBucket.bucketName,
            description: 'S3 Bucket for FAFSA Knowledge Base',
        });
    }
}
exports.EducateFirstAiStack = EducateFirstAiStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWR1Y2F0ZS1maXJzdC1haS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImVkdWNhdGUtZmlyc3QtYWktc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLG1EQUFtRDtBQUNuRCxtREFBbUQ7QUFDbkQscURBQXFEO0FBQ3JELHlDQUF5QztBQUN6QyxpREFBaUQ7QUFDakQseURBQXlEO0FBQ3pELDJDQUEyQztBQUUzQyw2QkFBNkI7QUFFN0IsTUFBYSxtQkFBb0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUNoRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLHFDQUFxQztRQUNyQyxNQUFNLG1CQUFtQixHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDcEUsVUFBVSxFQUFFLHdCQUF3QixJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ2xELFNBQVMsRUFBRSxJQUFJO1lBQ2YsVUFBVSxFQUFFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVO1lBQzFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ2pELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxrQkFBa0I7U0FDN0QsQ0FBQyxDQUFDO1FBRUgsdUNBQXVDO1FBQ3ZDLE1BQU0sUUFBUSxHQUFHLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUU7WUFDcEUsWUFBWSxFQUFFLHNCQUFzQjtZQUNwQyxpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLGFBQWEsRUFBRTtnQkFDYixLQUFLLEVBQUUsSUFBSTthQUNaO1lBQ0QsY0FBYyxFQUFFO2dCQUNkLFNBQVMsRUFBRSxDQUFDO2dCQUNaLGdCQUFnQixFQUFFLElB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bXBvcnQgKiBhcyBhbXBsaWZ5IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hbXBsaWZ5JztcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nO1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5JztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuZXhwb3J0IGNsYXNzIEVkdWNhdGVGaXJzdEFpU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBTMyBCdWNrZXQgZm9yIEZBRlNBIEtub3dsZWRnZSBCYXNlXG4gICAgY29uc3Qga25vd2xlZGdlQmFzZUJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ0ZBRlNBS25vd2xlZGdlQmFzZScsIHtcbiAgICAgIGJ1Y2tldE5hbWU6IGBmYWZzYS1rbm93bGVkZ2UtYmFzZS0ke3RoaXMuYWNjb3VudH1gLFxuICAgICAgdmVyc2lvbmVkOiB0cnVlLFxuICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIEZvciBkZXZlbG9wbWVudFxuICAgIH0pO1xuXG4gICAgLy8gQ29nbml0byBVc2VyIFBvb2wgZm9yIEF1dGhlbnRpY2F0aW9uXG4gICAgY29uc3QgdXNlclBvb2wgPSBuZXcgY29nbml0by5Vc2VyUG9vbCh0aGlzLCAnRWR1Y2F0ZUZpcnN0QWlVc2VyUG9vbCcsIHtcbiAgICAgIHVzZXJQb29sTmFtZTogJ0VkdWNhdGVGaXJzdEFpLVVzZXJzJyxcbiAgICAgIHNlbGZTaWduVXBFbmFibGVkOiB0cnVlLFxuICAgICAgc2lnbkluQWxpYXNlczoge1xuICAgICAgICBlbWFpbDogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBwYXNzd29yZFBvbGljeToge1xuICAgICAgICBtaW5MZW5ndGg6IDgsXG4gICAgICAgIHJlcXVpcmVMb3dlcmNhc2U6IHRydWUsXG4gICAgICAgIHJlcXVpcmVVcHBlcmNhc2U6IHRydWUsXG4gICAgICAgIHJlcXVpcmVEaWdpdHM6IHRydWUsXG4gICAgICAgIHJlcXVpcmVTeW1ib2xzOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgICBhY2NvdW50UmVjb3Zlcnk6IGNvZ25pdG8uQWNjb3VudFJlY292ZXJ5LkVNQUlMX09OTFksXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgY29uc3QgdXNlclBvb2xDbGllbnQgPSBuZXcgY29nbml0by5Vc2VyUG9vbENsaWVudCh0aGlzLCAnRWR1Y2F0ZUZpcnN0QWlVc2VyUG9vbENsaWVudCcsIHtcbiAgICAgIHVzZXJQb29sLFxuICAgICAgYXV0aEZsb3dzOiB7XG4gICAgICAgIHVzZXJQYXNzd29yZDogdHJ1ZSxcbiAgICAgICAgdXNlclNycDogdHJ1ZSxcbiAgICAgICAgYWRtaW5Vc2VyUGFzc3dvcmQ6IHRydWUsXG4gICAgICB9LFxuICAgICAgZ2VuZXJhdGVTZWNyZXQ6IGZhbHNlLFxuICAgIH0pO1xuXG4gICAgLy8gRHluYW1vREIgVGFibGVzXG4gICAgY29uc3QgdXNlcnNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnVXNlcnNUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogJ0VkdWNhdGVGaXJzdEFpLVVzZXJzJyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndXNlcklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgY29uc3QgY29udmVyc2F0aW9uc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdDb252ZXJzYXRpb25zVGFibGUnLCB7XG4gICAgICB0YWJsZU5hbWU6ICdFZHVjYXRlRmlyc3RBaS1Db252ZXJzYXRpb25zJyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnY29udmVyc2F0aW9uSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnbWVzc2FnZVRpbWVzdGFtcCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgdGltZVRvTGl2ZUF0dHJpYnV0ZTogJ2V4cGlyZXNBdCcsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgY29udmVyc2F0aW9uc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ3VzZXJJZC10aW1lc3RhbXAtaW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd1c2VySWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnbWVzc2FnZVRpbWVzdGFtcCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCB1c2VyUHJvZ3Jlc3NUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnVXNlclByb2dyZXNzVGFibGUnLCB7XG4gICAgICB0YWJsZU5hbWU6ICdFZHVjYXRlRmlyc3RBaS1Vc2VyUHJvZ3Jlc3MnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd1c2VySWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICBjb25zdCByZXNwb25zZUNhY2hlVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1Jlc3BvbnNlQ2FjaGVUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogJ0VkdWNhdGVGaXJzdEFpLVJlc3BvbnNlQ2FjaGUnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdxdWVyeUhhc2gnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIHRpbWVUb0xpdmVBdHRyaWJ1dGU6ICdleHBpcmVzQXQnLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIC8vIExhbWJkYSBMYXllciBmb3Igc2hhcmVkIGRlcGVuZGVuY2llc1xuICAgIGNvbnN0IHNoYXJlZExheWVyID0gbmV3IGxhbWJkYS5MYXllclZlcnNpb24odGhpcywgJ1NoYXJlZExheWVyJywge1xuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9sYW1iZGEnKSksXG4gICAgICBjb21wYXRpYmxlUnVudGltZXM6IFtsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWF0sXG4gICAgICBkZXNjcmlwdGlvbjogJ1NoYXJlZCBkZXBlbmRlbmNpZXMgZm9yIEVkdWNhdGVGaXJzdEFJIExhbWJkYSBmdW5jdGlvbnMnLFxuICAgIH0pO1xuXG4gICAgLy8gRW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciBMYW1iZGEgZnVuY3Rpb25zXG4gICAgY29uc3QgbGFtYmRhRW52aXJvbm1lbnQgPSB7XG4gICAgICBBV1NfUkVHSU9OOiB0aGlzLnJlZ2lvbixcbiAgICAgIFVTRVJfUE9PTF9JRDogdXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgIFVTRVJfUE9PTF9DTElFTlRfSUQ6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgICBVU0VSU19UQUJMRV9OQU1FOiB1c2Vyc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIENPTlZFUlNBVElPTlNfVEFCTEVfTkFNRTogY29udmVyc2F0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIFVTRVJfUFJPR1JFU1NfVEFCTEVfTkFNRTogdXNlclByb2dyZXNzVGFibGUudGFibGVOYW1lLFxuICAgICAgUkVTUE9OU0VfQ0FDSEVfVEFCTEVfTkFNRTogcmVzcG9uc2VDYWNoZVRhYmxlLnRhYmxlTmFtZSxcbiAgICAgIEtOT1dMRURHRV9CQVNFX0JVQ0tFVDoga25vd2xlZGdlQmFzZUJ1Y2tldC5idWNrZXROYW1lLFxuICAgIH07XG5cbiAgICAvLyBDaGF0IExhbWJkYSBGdW5jdGlvbnNcbiAgICBjb25zdCBjaGF0TWVzc2FnZUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQ2hhdE1lc3NhZ2VGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ2NoYXQvaGFuZGxlci5jaGF0TWVzc2FnZScsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2xhbWJkYScpKSxcbiAgICAgIGxheWVyczogW3NoYXJlZExheWVyXSxcbiAgICAgIGVudmlyb25tZW50OiBsYW1iZGFFbnZpcm9ubWVudCxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgIG1lbW9yeVNpemU6IDUxMixcbiAgICB9KTtcblxuICAgIGNvbnN0IGNoYXRIaXN0b3J5RnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdDaGF0SGlzdG9yeUZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAnY2hhdC9oYW5kbGVyLmNoYXRIaXN0b3J5JyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vbGFtYmRhJykpLFxuICAgICAgbGF5ZXJzOiBbc2hhcmVkTGF5ZXJdLFxuICAgICAgZW52aXJvbm1lbnQ6IGxhbWJkYUVudmlyb25tZW50LFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTApLFxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxuICAgIH0pO1xuXG4gICAgLy8gQXV0aCBMYW1iZGEgRnVuY3Rpb25zXG4gICAgY29uc3Qgc2lnblVwRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdTaWduVXBGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ2F1dGgvaGFuZGxlci5zaWduVXAnLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9sYW1iZGEnKSksXG4gICAgICBsYXllcnM6IFtzaGFyZWRMYXllcl0sXG4gICAgICBlbnZpcm9ubWVudDogbGFtYmRhRW52aXJvbm1lbnQsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxMCksXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXG4gICAgfSk7XG5cbiAgICBjb25zdCBzaWduSW5GdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1NpZ25JbkZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAnYXV0aC9oYW5kbGVyLnNpZ25JbicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2xhbWJkYScpKSxcbiAgICAgIGxheWVyczogW3NoYXJlZExheWVyXSxcbiAgICAgIGVudmlyb25tZW50OiBsYW1iZGFFbnZpcm9ubWVudCxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSxcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcbiAgICB9KTtcblxuICAgIGNvbnN0IGZvcmdvdFBhc3N3b3JkRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdGb3Jnb3RQYXNzd29yZEZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAnYXV0aC9oYW5kbGVyLmZvcmdvdFBhc3N3b3JkJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vbGFtYmRhJykpLFxuICAgICAgbGF5ZXJzOiBbc2hhcmVkTGF5ZXJdLFxuICAgICAgZW52aXJvbm1lbnQ6IGxhbWJkYUVudmlyb25tZW50LFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTApLFxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxuICAgIH0pO1xuXG4gICAgY29uc3QgZ3Vlc3RNb2RlRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdHdWVzdE1vZGVGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ2F1dGgvaGFuZGxlci5ndWVzdE1vZGUnLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9sYW1iZGEnKSksXG4gICAgICBsYXllcnM6IFtzaGFyZWRMYXllcl0sXG4gICAgICBlbnZpcm9ubWVudDogbGFtYmRhRW52aXJvbm1lbnQsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg1KSxcbiAgICAgIG1lbW9yeVNpemU6IDEyOCxcbiAgICB9KTtcblxuICAgIGNvbnN0IGdldFVzZXJQcm9maWxlRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdHZXRVc2VyUHJvZmlsZUZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAnYXV0aC9oYW5kbGVyLmdldFVzZXJQcm9maWxlJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vbGFtYmRhJykpLFxuICAgICAgbGF5ZXJzOiBbc2hhcmVkTGF5ZXJdLFxuICAgICAgZW52aXJvbm1lbnQ6IGxhbWJkYUVudmlyb25tZW50LFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTApLFxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxuICAgIH0pO1xuXG4gICAgLy8gUHJvZ3Jlc3MgTGFtYmRhIEZ1bmN0aW9uc1xuICAgIGNvbnN0IGdldFByb2dyZXNzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdHZXRQcm9ncmVzc0Z1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAncHJvZ3Jlc3MvaGFuZGxlci5nZXRQcm9ncmVzcycsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2xhbWJkYScpKSxcbiAgICAgIGxheWVyczogW3NoYXJlZExheWVyXSxcbiAgICAgIGVudmlyb25tZW50OiBsYW1iZGFFbnZpcm9ubWVudCxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSxcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcbiAgICB9KTtcblxuICAgIGNvbnN0IHVwZGF0ZVByb2dyZXNzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdVcGRhdGVQcm9ncmVzc0Z1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAncHJvZ3Jlc3MvaGFuZGxlci51cGRhdGVQcm9ncmVzcycsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2xhbWJkYScpKSxcbiAgICAgIGxheWVyczogW3NoYXJlZExheWVyXSxcbiAgICAgIGVudmlyb25tZW50OiBsYW1iZGFFbnZpcm9ubWVudCxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSxcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcbiAgICB9KTtcblxuICAgIGNvbnN0IGdldFByb2dyZXNzU3VtbWFyeUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0UHJvZ3Jlc3NTdW1tYXJ5RnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdwcm9ncmVzcy9oYW5kbGVyLmdldFByb2dyZXNzU3VtbWFyeScsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2xhbWJkYScpKSxcbiAgICAgIGxheWVyczogW3NoYXJlZExheWVyXSxcbiAgICAgIGVudmlyb25tZW50OiBsYW1iZGFFbnZpcm9ubWVudCxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSxcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcbiAgICB9KTtcblxuICAgIGNvbnN0IGdldEZBRlNBU2VjdGlvbnNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dldEZBRlNBU2VjdGlvbnNGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3Byb2dyZXNzL2hhbmRsZXIuZ2V0RkFGU0FTZWN0aW9ucycsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2xhbWJkYScpKSxcbiAgICAgIGxheWVyczogW3NoYXJlZExheWVyXSxcbiAgICAgIGVudmlyb25tZW50OiBsYW1iZGFFbnZpcm9ubWVudCxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDUpLFxuICAgICAgbWVtb3J5U2l6ZTogMTI4LFxuICAgIH0pO1xuXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbnMgdG8gTGFtYmRhIGZ1bmN0aW9uc1xuICAgIGNvbnN0IGxhbWJkYUZ1bmN0aW9ucyA9IFtcbiAgICAgIGNoYXRNZXNzYWdlRnVuY3Rpb24sXG4gICAgICBjaGF0SGlzdG9yeUZ1bmN0aW9uLFxuICAgICAgc2lnblVwRnVuY3Rpb24sXG4gICAgICBzaWduSW5GdW5jdGlvbixcbiAgICAgIGZvcmdvdFBhc3N3b3JkRnVuY3Rpb24sXG4gICAgICBndWVzdE1vZGVGdW5jdGlvbixcbiAgICAgIGdldFVzZXJQcm9maWxlRnVuY3Rpb24sXG4gICAgICBnZXRQcm9ncmVzc0Z1bmN0aW9uLFxuICAgICAgdXBkYXRlUHJvZ3Jlc3NGdW5jdGlvbixcbiAgICAgIGdldFByb2dyZXNzU3VtbWFyeUZ1bmN0aW9uLFxuICAgICAgZ2V0RkFGU0FTZWN0aW9uc0Z1bmN0aW9uLFxuICAgIF07XG5cbiAgICBsYW1iZGFGdW5jdGlvbnMuZm9yRWFjaChmdW5jID0+IHtcbiAgICAgIC8vIER5bmFtb0RCIHBlcm1pc3Npb25zXG4gICAgICB1c2Vyc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShmdW5jKTtcbiAgICAgIGNvbnZlcnNhdGlvbnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZnVuYyk7XG4gICAgICB1c2VyUHJvZ3Jlc3NUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZnVuYyk7XG4gICAgICByZXNwb25zZUNhY2hlVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGZ1bmMpO1xuICAgICAgXG4gICAgICAvLyBTMyBwZXJtaXNzaW9uc1xuICAgICAga25vd2xlZGdlQmFzZUJ1Y2tldC5ncmFudFJlYWQoZnVuYyk7XG4gICAgICBcbiAgICAgIC8vIEJlZHJvY2sgcGVybWlzc2lvbnNcbiAgICAgIGZ1bmMuYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWwnLFxuICAgICAgICAgICdiZWRyb2NrOkludm9rZU1vZGVsV2l0aFJlc3BvbnNlU3RyZWFtJyxcbiAgICAgICAgXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbJyonXSxcbiAgICAgIH0pKTtcblxuICAgICAgLy8gQ29nbml0byBwZXJtaXNzaW9uc1xuICAgICAgZnVuYy5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAnY29nbml0by1pZHA6QWRtaW5DcmVhdGVVc2VyJyxcbiAgICAgICAgICAnY29nbml0by1pZHA6QWRtaW5TZXRVc2VyUGFzc3dvcmQnLFxuICAgICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkluaXRpYXRlQXV0aCcsXG4gICAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluUmVzcG9uZFRvQXV0aENoYWxsZW5nZScsXG4gICAgICAgICAgJ2NvZ25pdG8taWRwOkZvcmdvdFBhc3N3b3JkJyxcbiAgICAgICAgICAnY29nbml0by1pZHA6Q29uZmlybUZvcmdvdFBhc3N3b3JkJyxcbiAgICAgICAgXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbdXNlclBvb2wudXNlclBvb2xBcm5dLFxuICAgICAgfSkpO1xuICAgIH0pO1xuXG4gICAgLy8gQVBJIEdhdGV3YXlcbiAgICBjb25zdCBhcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsICdFZHVjYXRlRmlyc3RBaUFwaScsIHtcbiAgICAgIHJlc3RBcGlOYW1lOiAnRWR1Y2F0ZUZpcnN0QWkgQVBJJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIGZvciBFZHVjYXRlRmlyc3RBSSBhcHBsaWNhdGlvbicsXG4gICAgICBkZWZhdWx0Q29yc1ByZWZsaWdodE9wdGlvbnM6IHtcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBhcGlnYXRld2F5LkNvcnMuQUxMX09SSUdJTlMsXG4gICAgICAgIGFsbG93TWV0aG9kczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9NRVRIT0RTLFxuICAgICAgICBhbGxvd0hlYWRlcnM6IFsnQ29udGVudC1UeXBlJywgJ1gtQW16LURhdGUnLCAnQXV0aG9yaXphdGlvbicsICdYLUFwaS1LZXknXSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBBUEkgUm91dGVzXG4gICAgLy8gQ2hhdCByb3V0ZXNcbiAgICBjb25zdCBjaGF0UmVzb3VyY2UgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgnY2hhdCcpO1xuICAgIGNoYXRSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihjaGF0TWVzc2FnZUZ1bmN0aW9uKSk7XG4gICAgXG4gICAgY29uc3QgY2hhdEhpc3RvcnlSZXNvdXJjZSA9IGNoYXRSZXNvdXJjZS5hZGRSZXNvdXJjZSgnaGlzdG9yeScpLmFkZFJlc291cmNlKCd7dXNlcklkfScpO1xuICAgIGNoYXRIaXN0b3J5UmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihjaGF0SGlzdG9yeUZ1bmN0aW9uKSk7XG5cbiAgICAvLyBBdXRoIHJvdXRlc1xuICAgIGNvbnN0IGF1dGhSZXNvdXJjZSA9IGFwaS5yb290LmFkZFJlc291cmNlKCdhdXRoJyk7XG4gICAgYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdzaWdudXAnKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihzaWduVXBGdW5jdGlvbikpO1xuICAgIGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgnc2lnbmluJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oc2lnbkluRnVuY3Rpb24pKTtcbiAgICBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2ZvcmdvdC1wYXNzd29yZCcpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGZvcmdvdFBhc3N3b3JkRnVuY3Rpb24pKTtcbiAgICBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2d1ZXN0JykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ3Vlc3RNb2RlRnVuY3Rpb24pKTtcbiAgICBcbiAgICBjb25zdCB1c2VyUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3VzZXInKS5hZGRSZXNvdXJjZSgne3VzZXJJZH0nKTtcbiAgICB1c2VyUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihnZXRVc2VyUHJvZmlsZUZ1bmN0aW9uKSk7XG5cbiAgICAvLyBQcm9ncmVzcyByb3V0ZXNcbiAgICBjb25zdCBwcm9ncmVzc1Jlc291cmNlID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3Byb2dyZXNzJyk7XG4gICAgY29uc3QgdXNlclByb2dyZXNzUmVzb3VyY2UgPSBwcm9ncmVzc1Jlc291cmNlLmFkZFJlc291cmNlKCd7dXNlcklkfScpO1xuICAgIHVzZXJQcm9ncmVzc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2V0UHJvZ3Jlc3NGdW5jdGlvbikpO1xuICAgIHVzZXJQcm9ncmVzc1Jlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odXBkYXRlUHJvZ3Jlc3NGdW5jdGlvbikpO1xuICAgIFxuICAgIGNvbnN0IHByb2dyZXNzU3VtbWFyeVJlc291cmNlID0gdXNlclByb2dyZXNzUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3N1bW1hcnknKTtcbiAgICBwcm9ncmVzc1N1bW1hcnlSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdldFByb2dyZXNzU3VtbWFyeUZ1bmN0aW9uKSk7XG5cbiAgICBjb25zdCBmYWZzYVNlY3Rpb25zUmVzb3VyY2UgPSBwcm9ncmVzc1Jlc291cmNlLmFkZFJlc291cmNlKCdzZWN0aW9ucycpO1xuICAgIGZhZnNhU2VjdGlvbnNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdldEZBRlNBU2VjdGlvbnNGdW5jdGlvbikpO1xuXG4gICAgLy8gQW1wbGlmeSBBcHAgZm9yIGhvc3RpbmdcbiAgICBjb25zdCBhbXBsaWZ5QXBwID0gbmV3IGFtcGxpZnkuQ2ZuQXBwKHRoaXMsICdFZHVjYXRlRmlyc3RBaUFwcCcsIHtcbiAgICAgIG5hbWU6ICdFZHVjYXRlRmlyc3RBSScsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FJLXBvd2VyZWQgRkFGU0EgYXNzaXN0YW5jZSBhcHBsaWNhdGlvbicsXG4gICAgICBidWlsZFNwZWM6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgdmVyc2lvbjogJzEuMCcsXG4gICAgICAgIGZyb250ZW5kOiB7XG4gICAgICAgICAgcGhhc2VzOiB7XG4gICAgICAgICAgICBwcmVCdWlsZDoge1xuICAgICAgICAgICAgICBjb21tYW5kczogWyducG0gY2knXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBidWlsZDoge1xuICAgICAgICAgICAgICBjb21tYW5kczogWyducG0gcnVuIGJ1aWxkJ10sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAgYXJ0aWZhY3RzOiB7XG4gICAgICAgICAgICBiYXNlRGlyZWN0b3J5OiAnZGlzdCcsXG4gICAgICAgICAgICBmaWxlczogWycqKi8qJ10sXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjYWNoZToge1xuICAgICAgICAgICAgcGF0aHM6IFsnbm9kZV9tb2R1bGVzLyoqLyonXSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSksXG4gICAgfSk7XG5cbiAgICBjb25zdCBtYWluQnJhbmNoID0gbmV3IGFtcGxpZnkuQ2ZuQnJhbmNoKHRoaXMsICdNYWluQnJhbmNoJywge1xuICAgICAgYXBwSWQ6IGFtcGxpZnlBcHAuYXR0ckFwcElkLFxuICAgICAgYnJhbmNoTmFtZTogJ21haW4nLFxuICAgICAgZW5hYmxlQXV0b0J1aWxkOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gT3V0cHV0IGltcG9ydGFudCB2YWx1ZXNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xJZCcsIHtcbiAgICAgIHZhbHVlOiB1c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBJRCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xDbGllbnRJZCcsIHtcbiAgICAgIHZhbHVlOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBDbGllbnQgSUQnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwaUdhdGV3YXlVcmwnLCB7XG4gICAgICB2YWx1ZTogYXBpLnVybCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgVVJMJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBbXBsaWZ5QXBwVXJsJywge1xuICAgICAgdmFsdWU6IGBodHRwczovL21haW4uJHthbXBsaWZ5QXBwLmF0dHJEZWZhdWx0RG9tYWlufWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FtcGxpZnkgQXBwIFVSTCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnS25vd2xlZGdlQmFzZUJ1Y2tldE5hbWUnLCB7XG4gICAgICB2YWx1ZToga25vd2xlZGdlQmFzZUJ1Y2tldC5idWNrZXROYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdTMyBCdWNrZXQgZm9yIEZBRlNBIEtub3dsZWRnZSBCYXNlJyxcbiAgICB9KTtcbiAgfVxufSJdfQ==