import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
export declare const dynamoDb: DynamoDBDocumentClient;
export declare const TABLES: {
    USERS: string;
    CONVERSATIONS: string;
    USER_PROGRESS: string;
    RESPONSE_CACHE: string;
};
export declare class DynamoDBService {
    static putItem(tableName: string, item: any): Promise<import("@aws-sdk/lib-dynamodb").PutCommandOutput>;
    static getItem(tableName: string, key: any): Promise<Record<string, any> | undefined>;
    static queryItems(tableName: string, keyConditionExpression: string, expressionAttributeValues: any, indexName?: string): Promise<Record<string, any>[]>;
    static updateItem(tableName: string, key: any, updateExpression: string, expressionAttributeValues: any): Promise<Record<string, any> | undefined>;
    static deleteItem(tableName: string, key: any): Promise<import("@aws-sdk/lib-dynamodb").DeleteCommandOutput>;
}
