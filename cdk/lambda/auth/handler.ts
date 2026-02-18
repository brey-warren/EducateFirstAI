import { APIGatewayProxyEvent, APIGatewayProxyResult, LambdaContext } from '../shared/types';
import { createSuccessResponse, createErrorResponse } from '../shared/types';
import { DynamoDBService, TABLES } from '../shared/dynamodb';
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminInitiateAuthCommand, AdminRespondToAuthChallengeCommand, ForgotPasswordCommand, ConfirmForgotPasswordCommand } from '@aws-sdk/client-cognito-identity-provider';
import { v4 as uuidv4 } from 'uuid';

const cognitoClient = new CognitoIdentityProviderClient({ 
  region: process.env.AWS_REGION || 'us-east-1' 
});

const USER_POOL_ID = process.env.USER_POOL_ID!;
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID!;

export class AuthHandler {
  static async handleSignUp(event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult> {
    try {
      if (!event.body) {
        return createErrorResponse(400, 'Request body is required');
      }

      const { email, password } = JSON.parse(event.body);

      // Validate input
      if (!email || !password) {
        return createErrorResponse(400, 'Email and password are required');
      }

      if (!this.isValidEmail(email)) {
        return createErrorResponse(400, 'Please enter a valid email address');
      }

      if (password.length < 8) {
        return createErrorResponse(400, 'Password must be at least 8 characters long');
      }

      // Create user in Cognito
      const userId = uuidv4();
      
      const createUserCommand = new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'custom:userId', Value: userId },
        ],
        TemporaryPassword: password,
        MessageAction: 'SUPPRESS', // Don't send welcome email
      });

      await cognitoClient.send(createUserCommand);

      // Set permanent password
      const setPasswordCommand = new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        Password: password,
        Permanent: true,
      });

      await cognitoClient.send(setPasswordCommand);

      // Create user record in DynamoDB
      const userRecord = {
        userId,
        email,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        preferences: {
          theme: 'light',
          notifications: true,
        },
        isGuest: false,
      };

      await DynamoDBService.putItem(TABLES.USERS, userRecord);

      // Initialize user progress
      const progressRecord = {
        userId,
        exploredSections: [],
        totalInteractions: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await DynamoDBService.putItem(TABLES.USER_PROGRESS, progressRecord);

      return createSuccessResponse({
        user: {
          userId,
          email,
          isGuest: false,
        },
        message: 'Account created successfully',
      });

    } catch (error: any) {
      console.error('Sign up error:', error);
      
      if (error.name === 'UsernameExistsException') {
        return createErrorResponse(409, 'An account with this email already exists');
      }
      
      return createErrorResponse(500, 'Failed to create account');
    }
  }

  static async handleSignIn(event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult> {
    try {
      if (!event.body) {
        return createErrorResponse(400, 'Request body is required');
      }

      const { email, password } = JSON.parse(event.body);

      // Validate input
      if (!email || !password) {
        return createErrorResponse(400, 'Email and password are required');
      }

      // Authenticate with Cognito
      const authCommand = new AdminInitiateAuthCommand({
        UserPoolId: USER_POOL_ID,
        ClientId: USER_POOL_CLIENT_ID,
        AuthFlow: 'ADMIN_NO_SRP_AUTH',
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      });

      const authResponse = await cognitoClient.send(authCommand);

      if (!authResponse.AuthenticationResult) {
        return createErrorResponse(401, 'Invalid email or password');
      }

      // Get user info from token
      const accessToken = authResponse.AuthenticationResult.AccessToken!;
      const idToken = authResponse.AuthenticationResult.IdToken!;
      
      // Decode the ID token to get user info (simplified - in production, use proper JWT library)
      const tokenPayload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
      const userId = tokenPayload['custom:userId'] || tokenPayload.sub;

      // Update last login time
      await DynamoDBService.updateItem(
        TABLES.USERS,
        { userId },
        'SET lastLoginAt = :now',
        { ':now': new Date().toISOString() }
      );

      return createSuccessResponse({
        user: {
          userId,
          email: tokenPayload.email,
          isGuest: false,
        },
        tokens: {
          accessToken,
          idToken,
          refreshToken: authResponse.AuthenticationResult.RefreshToken,
        },
      });

    } catch (error: any) {
      console.error('Sign in error:', error);
      
      if (error.name === 'NotAuthorizedException') {
        return createErrorResponse(401, 'Invalid email or password');
      }
      
      return createErrorResponse(500, 'Failed to sign in');
    }
  }

  static async handleForgotPassword(event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult> {
    try {
      if (!event.body) {
        return createErrorResponse(400, 'Request body is required');
      }

      const { email } = JSON.parse(event.body);

      if (!email) {
        return createErrorResponse(400, 'Email is required');
      }

      if (!this.isValidEmail(email)) {
        return createErrorResponse(400, 'Please enter a valid email address');
      }

      const forgotPasswordCommand = new ForgotPasswordCommand({
        ClientId: USER_POOL_CLIENT_ID,
        Username: email,
      });

      await cognitoClient.send(forgotPasswordCommand);

      return createSuccessResponse({
        message: 'Password reset code sent to your email',
      });

    } catch (error: any) {
      console.error('Forgot password error:', error);
      
      if (error.name === 'UserNotFoundException') {
        // Don't reveal if user exists or not for security
        return createSuccessResponse({
          message: 'If an account with this email exists, a password reset code has been sent',
        });
      }
      
      return createErrorResponse(500, 'Failed to process password reset request');
    }
  }

  static async handleGuestMode(event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult> {
    try {
      // Create a temporary guest user ID
      const guestUserId = `guest_${uuidv4()}`;

      return createSuccessResponse({
        user: {
          userId: guestUserId,
          email: null,
          isGuest: true,
        },
        message: 'Guest session created',
      });

    } catch (error) {
      console.error('Guest mode error:', error);
      return createErrorResponse(500, 'Failed to create guest session');
    }
  }

  static async handleGetUserProfile(event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult> {
    try {
      const userId = event.pathParameters?.userId;
      if (!userId) {
        return createErrorResponse(400, 'User ID is required');
      }

      // Get user from DynamoDB
      const user = await DynamoDBService.getItem(TABLES.USERS, { userId });

      if (!user) {
        return createErrorResponse(404, 'User not found');
      }

      return createSuccessResponse({
        user: {
          userId: user.userId,
          email: user.email,
          preferences: user.preferences,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          isGuest: user.isGuest || false,
        },
      });

    } catch (error) {
      console.error('Get user profile error:', error);
      return createErrorResponse(500, 'Failed to get user profile');
    }
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Lambda handler functions
export const signUp = async (event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult> => {
  return AuthHandler.handleSignUp(event, context);
};

export const signIn = async (event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult> => {
  return AuthHandler.handleSignIn(event, context);
};

export const forgotPassword = async (event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult> => {
  return AuthHandler.handleForgotPassword(event, context);
};

export const guestMode = async (event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult> => {
  return AuthHandler.handleGuestMode(event, context);
};

export const getUserProfile = async (event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult> => {
  return AuthHandler.handleGetUserProfile(event, context);
};