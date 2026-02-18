// Shared types for Lambda functions
export interface APIGatewayProxyEvent {
  httpMethod: string;
  path: string;
  pathParameters: { [key: string]: string } | null;
  queryStringParameters: { [key: string]: string } | null;
  headers: { [key: string]: string };
  body: string | null;
  requestContext: {
    requestId: string;
    identity: {
      sourceIp: string;
      userAgent: string;
    };
    authorizer?: {
      claims: {
        sub: string;
        email: string;
        [key: string]: string;
      };
    };
  };
}

export interface APIGatewayProxyResult {
  statusCode: number;
  headers?: { [key: string]: string };
  body: string;
}

export interface LambdaContext {
  requestId: string;
  functionName: string;
  functionVersion: string;
  awsRequestId: string;
  getRemainingTimeInMillis(): number;
}

// Common response helpers
export const createResponse = (
  statusCode: number,
  body: any,
  headers: { [key: string]: string } = {}
): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    ...headers,
  },
  body: JSON.stringify(body),
});

export const createSuccessResponse = (data: any) => createResponse(200, { success: true, data });

export const createErrorResponse = (statusCode: number, error: string, details?: any) =>
  createResponse(statusCode, { success: false, error, details });

// Environment variables
export const getEnvVar = (name: string, defaultValue?: string): string => {
  const value = process.env[name];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value || defaultValue!;
};