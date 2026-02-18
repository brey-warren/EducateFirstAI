import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
export const dynamoDb = DynamoDBDocumentClient.from(client);

// Table names from environment variables
export const TABLES = {
  USERS: process.env.USERS_TABLE_NAME || 'EducateFirstAi-Users',
  CONVERSATIONS: process.env.CONVERSATIONS_TABLE_NAME || 'EducateFirstAi-Conversations',
  USER_PROGRESS: process.env.USER_PROGRESS_TABLE_NAME || 'EducateFirstAi-UserProgress',
  RESPONSE_CACHE: process.env.RESPONSE_CACHE_TABLE_NAME || 'EducateFirstAi-ResponseCache',
};

// Common DynamoDB operations
export class DynamoDBService {
  static async putItem(tableName: string, item: any) {
    const command = new PutCommand({
      TableName: tableName,
      Item: item,
    });
    return await dynamoDb.send(command);
  }

  static async getItem(tableName: string, key: any) {
    const command = new GetCommand({
      TableName: tableName,
      Key: key,
    });
    const result = await dynamoDb.send(command);
    return result.Item;
  }

  static async queryItems(tableName: string, keyConditionExpression: string, expressionAttributeValues: any, indexName?: string) {
    const command = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      IndexName: indexName,
    });
    const result = await dynamoDb.send(command);
    return result.Items || [];
  }

  static async updateItem(tableName: string, key: any, updateExpression: string, expressionAttributeValues: any) {
    const command = new UpdateCommand({
      TableName: tableName,
      Key: key,
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });
    const result = await dynamoDb.send(command);
    return result.Attributes;
  }

  static async deleteItem(tableName: string, key: any) {
    const command = new DeleteCommand({
      TableName: tableName,
      Key: key,
    });
    return await dynamoDb.send(command);
  }
}