import { APIGatewayProxyEvent, APIGatewayProxyResult, LambdaContext } from '../shared/types';
export declare class ChatHandler {
    static handleChatMessage(event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult>;
    static handleChatHistory(event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult>;
    private static getCachedResponse;
    private static cacheResponse;
    private static updateCacheHitCount;
    private static storeConversationMessages;
    private static updateUserProgress;
}
export declare const chatMessage: (event: APIGatewayProxyEvent, context: LambdaContext) => Promise<APIGatewayProxyResult>;
export declare const chatHistory: (event: APIGatewayProxyEvent, context: LambdaContext) => Promise<APIGatewayProxyResult>;
