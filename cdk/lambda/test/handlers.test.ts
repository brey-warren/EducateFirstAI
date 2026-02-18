import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock AWS SDK
vi.mock('@aws-sdk/client-dynamodb');
vi.mock('@aws-sdk/lib-dynamodb');
vi.mock('@aws-sdk/client-bedrock-runtime');
vi.mock('@aws-sdk/client-cognito-identity-provider');

// Mock environment variables
process.env.AWS_REGION = 'us-east-1';
process.env.USER_POOL_ID = 'test-pool-id';
process.env.USER_POOL_CLIENT_ID = 'test-client-id';
process.env.USERS_TABLE_NAME = 'test-users';
process.env.CONVERSATIONS_TABLE_NAME = 'test-conversations';
process.env.USER_PROGRESS_TABLE_NAME = 'test-progress';
process.env.RESPONSE_CACHE_TABLE_NAME = 'test-cache';

import { ChatHandler } from '../chat/handler';
import { AuthHandler } from '../auth/handler';
import { ProgressHandler } from '../progress/handler';
import { APIGatewayProxyEvent, LambdaContext } from '../shared/types';

describe('Lambda Handlers', () => {
  let mockEvent: APIGatewayProxyEvent;
  let mockContext: LambdaContext;

  beforeEach(() => {
    mockEvent = {
      httpMethod: 'POST',
      path: '/test',
      pathParameters: null,
      queryStringParameters: null,
      headers: {},
      body: null,
      requestContext: {
        requestId: 'test-request-id',
        identity: {
          sourceIp: '127.0.0.1',
          userAgent: 'test-agent',
        },
      },
    };

    mockContext = {
      requestId: 'test-request-id',
      functionName: 'test-function',
      functionVersion: '1',
      awsRequestId: 'test-aws-request-id',
      getRemainingTimeInMillis: () => 30000,
    };
  });

  describe('ChatHandler', () => {
    it('should handle missing request body', async () => {
      const result = await ChatHandler.handleChatMessage(mockEvent, mockContext);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Request body is required');
    });

    it('should handle empty message content', async () => {
      mockEvent.body = JSON.stringify({ content: '' });
      
      const result = await ChatHandler.handleChatMessage(mockEvent, mockContext);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Message content is required');
    });

    it('should handle whitespace-only message content', async () => {
      mockEvent.body = JSON.stringify({ content: '   \n\t   ' });
      
      const result = await ChatHandler.handleChatMessage(mockEvent, mockContext);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Please enter a FAFSA question or topic you\'d like help with.');
    });

    it('should handle message content too long', async () => {
      const longContent = 'a'.repeat(5001);
      mockEvent.body = JSON.stringify({ content: longContent });
      
      const result = await ChatHandler.handleChatMessage(mockEvent, mockContext);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Please limit your question to 5000 characters or less.');
    });
  });

  describe('AuthHandler', () => {
    it('should handle missing request body for sign up', async () => {
      const result = await AuthHandler.handleSignUp(mockEvent, mockContext);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Request body is required');
    });

    it('should handle missing email and password', async () => {
      mockEvent.body = JSON.stringify({});
      
      const result = await AuthHandler.handleSignUp(mockEvent, mockContext);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Email and password are required');
    });

    it('should handle invalid email format', async () => {
      mockEvent.body = JSON.stringify({ email: 'invalid-email', password: 'password123' });
      
      const result = await AuthHandler.handleSignUp(mockEvent, mockContext);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Please enter a valid email address');
    });

    it('should handle short password', async () => {
      mockEvent.body = JSON.stringify({ email: 'test@example.com', password: '123' });
      
      const result = await AuthHandler.handleSignUp(mockEvent, mockContext);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Password must be at least 8 characters long');
    });

    it('should create guest session', async () => {
      const result = await AuthHandler.handleGuestMode(mockEvent, mockContext);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.user.isGuest).toBe(true);
      expect(body.data.user.userId).toMatch(/^guest_/);
    });
  });

  describe('ProgressHandler', () => {
    it('should handle missing user ID for get progress', async () => {
      const result = await ProgressHandler.handleGetProgress(mockEvent, mockContext);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('User ID is required');
    });

    it('should return FAFSA sections', async () => {
      const result = await ProgressHandler.handleGetFAFSASections(mockEvent, mockContext);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.sections).toHaveLength(7);
      expect(body.data.sections[0].sectionId).toBe('student-demographics');
    });
  });
});