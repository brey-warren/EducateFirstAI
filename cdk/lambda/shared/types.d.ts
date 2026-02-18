export interface APIGatewayProxyEvent {
    httpMethod: string;
    path: string;
    pathParameters: {
        [key: string]: string;
    } | null;
    queryStringParameters: {
        [key: string]: string;
    } | null;
    headers: {
        [key: string]: string;
    };
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
    headers?: {
        [key: string]: string;
    };
    body: string;
}
export interface LambdaContext {
    requestId: string;
    functionName: string;
    functionVersion: string;
    awsRequestId: string;
    getRemainingTimeInMillis(): number;
}
export declare const createResponse: (statusCode: number, body: any, headers?: {
    [key: string]: string;
}) => APIGatewayProxyResult;
export declare const createSuccessResponse: (data: any) => APIGatewayProxyResult;
export declare const createErrorResponse: (statusCode: number, error: string, details?: any) => APIGatewayProxyResult;
export declare const getEnvVar: (name: string, defaultValue?: string) => string;
