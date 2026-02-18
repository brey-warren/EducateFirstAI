import { APIGatewayProxyEvent, APIGatewayProxyResult, LambdaContext } from '../shared/types';
export declare class ProgressHandler {
    static handleGetProgress(event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult>;
    static handleUpdateProgress(event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult>;
    static handleGetProgressSummary(event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult>;
    static handleGetFAFSASections(event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult>;
}
export declare const getProgress: (event: APIGatewayProxyEvent, context: LambdaContext) => Promise<APIGatewayProxyResult>;
export declare const updateProgress: (event: APIGatewayProxyEvent, context: LambdaContext) => Promise<APIGatewayProxyResult>;
export declare const getProgressSummary: (event: APIGatewayProxyEvent, context: LambdaContext) => Promise<APIGatewayProxyResult>;
export declare const getFAFSASections: (event: APIGatewayProxyEvent, context: LambdaContext) => Promise<APIGatewayProxyResult>;
