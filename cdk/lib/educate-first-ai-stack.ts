import * as cdk from 'aws-cdk-lib';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export class EducateFirstAiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Bucket for FAFSA Knowledge Base with enhanced security
    const knowledgeBaseBucket = new s3.Bucket(this, 'FAFSAKnowledgeBase', {
      bucketName: `fafsa-knowledge-base-${this.account}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true, // Enforce HTTPS/TLS for all requests
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          enabled: true,
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
    });

    // Cognito User Pool for Authentication with enhanced security
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
      // Enhanced security settings
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: false,
        otp: true,
      },
      deviceTracking: {
        challengeRequiredOnNewDevice: true,
        deviceOnlyRememberedOnUserPrompt: true,
      },
      // FERPA compliance: minimal data collection
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      customAttributes: {
        userId: new cognito.StringAttribute({ minLen: 1, maxLen: 256, mutable: false }),
      },
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'EducateFirstAiUserPoolClient', {
      userPool,
      authFlows: {
        userPassword: true,
        userSrp: true,
        adminUserPassword: true,
      },
      generateSecret: false,
      // Enhanced security settings
      preventUserExistenceErrors: true,
      refreshTokenValidity: cdk.Duration.days(1), // Short refresh token validity
      accessTokenValidity: cdk.Duration.hours(1), // Short access token validity
      idTokenValidity: cdk.Duration.hours(1),
      enableTokenRevocation: true,
    });

    // DynamoDB Tables with enhanced security
    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: 'EducateFirstAi-Users',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
    });

    const conversationsTable = new dynamodb.Table(this, 'ConversationsTable', {
      tableName: 'EducateFirstAi-Conversations',
      partitionKey: { name: 'conversationId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'messageTimestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiresAt', // FERPA compliance: 24-hour data retention
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
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
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
    });

    const responseCacheTable = new dynamodb.Table(this, 'ResponseCacheTable', {
      tableName: 'EducateFirstAi-ResponseCache',
      partitionKey: { name: 'queryHash', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiresAt', // 1-hour cache retention
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Lambda Layer for shared dependencies
    const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: 'Shared dependencies for EducateFirstAI Lambda functions',
    });

    // Environment variables for Lambda functions with security context
    const lambdaEnvironment = {
      AWS_REGION: this.region,
      USER_POOL_ID: userPool.userPoolId,
      USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      USERS_TABLE_NAME: usersTable.tableName,
      CONVERSATIONS_TABLE_NAME: conversationsTable.tableName,
      USER_PROGRESS_TABLE_NAME: userProgressTable.tableName,
      RESPONSE_CACHE_TABLE_NAME: responseCacheTable.tableName,
      KNOWLEDGE_BASE_BUCKET: knowledgeBaseBucket.bucketName,
      // Security and privacy settings
      ENFORCE_HTTPS: 'true',
      FERPA_COMPLIANCE: 'true',
      PII_DETECTION_ENABLED: 'true',
      DATA_RETENTION_HOURS: '24',
      CACHE_RETENTION_HOURS: '1',
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
      
      // Bedrock permissions with privacy constraints
      func.addToRolePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
        ],
        resources: ['*'],
        conditions: {
          StringEquals: {
            'bedrock:guardrailsApplied': 'true',
          },
        },
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

    // API Gateway with enhanced security
    const api = new apigateway.RestApi(this, 'EducateFirstAiApi', {
      restApiName: 'EducateFirstAi API',
      description: 'API for EducateFirstAI application',
      defaultCorsPreflightOptions: {
        allowOrigins: ['https://*.amplifyapp.com', 'https://localhost:*'], // Restrict origins
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
        allowCredentials: true,
      },
      // Security settings
      policy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            principals: [new iam.AnyPrincipal()],
            actions: ['execute-api:Invoke'],
            resources: ['*'],
            conditions: {
              StringEquals: {
                'aws:SecureTransport': 'true', // Enforce HTTPS
              },
            },
          }),
        ],
      }),
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