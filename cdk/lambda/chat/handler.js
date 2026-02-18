"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatHistory = exports.chatMessage = exports.ChatHandler = void 0;
const types_1 = require("../shared/types");
const dynamodb_1 = require("../shared/dynamodb");
const bedrock_1 = require("../shared/bedrock");
const uuid_1 = require("uuid");
const crypto = require("crypto");
class ChatHandler {
    static async handleChatMessage(event, context) {
        try {
            if (!event.body) {
                return (0, types_1.createErrorResponse)(400, 'Request body is required');
            }
            const { content, userId, conversationId } = JSON.parse(event.body);
            // Validate input
            if (!content || typeof content !== 'string') {
                return (0, types_1.createErrorResponse)(400, 'Message content is required');
            }
            if (content.trim().length === 0) {
                return (0, types_1.createErrorResponse)(400, 'Please enter a FAFSA question or topic you\'d like help with.');
            }
            if (content.length > 5000) {
                return (0, types_1.createErrorResponse)(400, 'Please limit your question to 5000 characters or less.');
            }
            // Check cache for common queries
            const queryHash = crypto.createHash('md5').update(content.toLowerCase().trim()).digest('hex');
            const cachedResponse = await this.getCachedResponse(queryHash);
            let aiResponse;
            let sources = [];
            if (cachedResponse) {
                aiResponse = cachedResponse.response;
                sources = cachedResponse.sources || [];
                // Update cache hit count
                await this.updateCacheHitCount(queryHash);
            }
            else {
                // Generate new response using Bedrock
                const bedrockResponse = await bedrock_1.BedrockService.generateFAFSAResponse(content);
                aiResponse = bedrockResponse.content;
                // Cache the response for future use
                await this.cacheResponse(queryHash, aiResponse, sources);
            }
            // Create message objects
            const userMessage = {
                id: (0, uuid_1.v4)(),
                content: content.trim(),
                sender: 'user',
                timestamp: new Date(),
            };
            const aiMessage = {
                id: (0, uuid_1.v4)(),
                content: aiResponse,
                sender: 'ai',
                timestamp: new Date(),
                metadata: {
                    sources,
                },
            };
            // Store conversation if userId is provided
            if (userId) {
                const finalConversationId = conversationId || (0, uuid_1.v4)();
                await this.storeConversationMessages(finalConversationId, userId, [userMessage, aiMessage]);
                // Update user progress
                await this.updateUserProgress(userId);
            }
            return (0, types_1.createSuccessResponse)({
                message: aiMessage,
                sources,
                conversationId: conversationId || (userId ? (0, uuid_1.v4)() : undefined),
            });
        }
        catch (error) {
            console.error('Chat handler error:', error);
            return (0, types_1.createErrorResponse)(500, 'Internal server error');
        }
    }
    static async handleChatHistory(event, context) {
        try {
            const userId = event.pathParameters?.userId;
            if (!userId) {
                return (0, types_1.createErrorResponse)(400, 'User ID is required');
            }
            const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit) : 50;
            // Query conversations for the user
            const messages = await dynamodb_1.DynamoDBService.queryItems(dynamodb_1.TABLES.CONVERSATIONS, 'userId = :userId', { ':userId': userId }, 'userId-timestamp-index');
            // Sort by timestamp and limit results
            const sortedMessages = messages
                .sort((a, b) => b.messageTimestamp - a.messageTimestamp)
                .slice(0, limit);
            return (0, types_1.createSuccessResponse)({
                messages: sortedMessages,
                hasMore: messages.length > limit,
            });
        }
        catch (error) {
            console.error('Chat history error:', error);
            return (0, types_1.createErrorResponse)(500, 'Internal server error');
        }
    }
    static async getCachedResponse(queryHash) {
        try {
            return await dynamodb_1.DynamoDBService.getItem(dynamodb_1.TABLES.RESPONSE_CACHE, { queryHash });
        }
        catch (error) {
            console.error('Cache retrieval error:', error);
            return null;
        }
    }
    static async cacheResponse(queryHash, response, sources) {
        try {
            const cacheItem = {
                queryHash,
                response,
                sources,
                createdAt: new Date().toISOString(),
                hitCount: 1,
                expiresAt: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour TTL
            };
            await dynamodb_1.DynamoDBService.putItem(dynamodb_1.TABLES.RESPONSE_CACHE, cacheItem);
        }
        catch (error) {
            console.error('Cache storage error:', error);
            // Don't throw - caching is not critical
        }
    }
    static async updateCacheHitCount(queryHash) {
        try {
            await dynamodb_1.DynamoDBService.updateItem(dynamodb_1.TABLES.RESPONSE_CACHE, { queryHash }, 'SET hitCount = hitCount + :inc', { ':inc': 1 });
        }
        catch (error) {
            console.error('Cache hit count update error:', error);
            // Don't throw - this is not critical
        }
    }
    static async storeConversationMessages(conversationId, userId, messages) {
        try {
            const expiresAt = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours TTL
            for (const message of messages) {
                const conversationItem = {
                    conversationId,
                    messageTimestamp: message.timestamp.getTime(),
                    userId,
                    messageContent: message.content,
                    sender: message.sender,
                    messageId: message.id,
                    metadata: message.metadata || {},
                    expiresAt,
                };
                await dynamodb_1.DynamoDBService.putItem(dynamodb_1.TABLES.CONVERSATIONS, conversationItem);
            }
        }
        catch (error) {
            console.error('Conversation storage error:', error);
            // Don't throw - conversation storage is not critical for the response
        }
    }
    static async updateUserProgress(userId) {
        try {
            const now = new Date().toISOString();
            await dynamodb_1.DynamoDBService.updateItem(dynamodb_1.TABLES.USER_PROGRESS, { userId }, 'SET totalInteractions = if_not_exists(totalInteractions, :zero) + :inc, updatedAt = :now', {
                ':inc': 1,
                ':zero': 0,
                ':now': now
            });
        }
        catch (error) {
            console.error('User progress update error:', error);
            // Don't throw - progress tracking is not critical
        }
    }
}
exports.ChatHandler = ChatHandler;
// Lambda handler functions
const chatMessage = async (event, context) => {
    return ChatHandler.handleChatMessage(event, context);
};
exports.chatMessage = chatMessage;
const chatHistory = async (event, context) => {
    return ChatHandler.handleChatHistory(event, context);
};
exports.chatHistory = chatHistory;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsMkNBQTZFO0FBQzdFLGlEQUE2RDtBQUM3RCwrQ0FBbUQ7QUFDbkQsK0JBQW9DO0FBQ3BDLGlDQUFpQztBQUVqQyxNQUFhLFdBQVc7SUFDdEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxLQUEyQixFQUFFLE9BQXNCO1FBQ2hGLElBQUk7WUFDRixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRTtnQkFDZixPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLDBCQUEwQixDQUFDLENBQUM7YUFDN0Q7WUFFRCxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUVuRSxpQkFBaUI7WUFDakIsSUFBSSxDQUFDLE9BQU8sSUFBSSxPQUFPLE9BQU8sS0FBSyxRQUFRLEVBQUU7Z0JBQzNDLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsNkJBQTZCLENBQUMsQ0FBQzthQUNoRTtZQUVELElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQy9CLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsK0RBQStELENBQUMsQ0FBQzthQUNsRztZQUVELElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxJQUFJLEVBQUU7Z0JBQ3pCLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUsd0RBQXdELENBQUMsQ0FBQzthQUMzRjtZQUVELGlDQUFpQztZQUNqQyxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMs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QUFFO0lBQ3ZILE9BQU8sV0FBVyxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztBQUN2RCxDQUFDLENBQUM7QUFGVyxRQUFBLFdBQVcsZUFFdEI7QUFFSyxNQUFNLFdBQVcsR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBRSxPQUFzQixFQUFrQyxFQUFFO0lBQ3ZILE9BQU8sV0FBVyxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztBQUN2RCxDQUFDLENBQUM7QUFGVyxRQUFBLFdBQVcsZUFFdEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0LCBMYW1iZGFDb250ZXh0IH0gZnJvbSAnLi4vc2hhcmVkL3R5cGVzJztcbmltcG9ydCB7IGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSwgY3JlYXRlRXJyb3JSZXNwb25zZSB9IGZyb20gJy4uL3NoYXJlZC90eXBlcyc7XG5pbXBvcnQgeyBEeW5hbW9EQlNlcnZpY2UsIFRBQkxFUyB9IGZyb20gJy4uL3NoYXJlZC9keW5hbW9kYic7XG5pbXBvcnQgeyBCZWRyb2NrU2VydmljZSB9IGZyb20gJy4uL3NoYXJlZC9iZWRyb2NrJztcbmltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gJ3V1aWQnO1xuaW1wb3J0ICogYXMgY3J5cHRvIGZyb20gJ2NyeXB0byc7XG5cbmV4cG9ydCBjbGFzcyBDaGF0SGFuZGxlciB7XG4gIHN0YXRpYyBhc3luYyBoYW5kbGVDaGF0TWVzc2FnZShldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQsIGNvbnRleHQ6IExhbWJkYUNvbnRleHQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4ge1xuICAgIHRyeSB7XG4gICAgICBpZiAoIWV2ZW50LmJvZHkpIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHsgY29udGVudCwgdXNlcklkLCBjb252ZXJzYXRpb25JZCB9ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcblxuICAgICAgLy8gVmFsaWRhdGUgaW5wdXRcbiAgICAgIGlmICghY29udGVudCB8fCB0eXBlb2YgY29udGVudCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAnTWVzc2FnZSBjb250ZW50IGlzIHJlcXVpcmVkJyk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb250ZW50LnRyaW0oKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAnUGxlYXNlIGVudGVyIGEgRkFGU0EgcXVlc3Rpb24gb3IgdG9waWMgeW91XFwnZCBsaWtlIGhlbHAgd2l0aC4nKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbnRlbnQubGVuZ3RoID4gNTAwMCkge1xuICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdQbGVhc2UgbGltaXQgeW91ciBxdWVzdGlvbiB0byA1MDAwIGNoYXJhY3RlcnMgb3IgbGVzcy4nKTtcbiAgICAgIH1cblxuICAgICAgLy8gQ2hlY2sgY2FjaGUgZm9yIGNvbW1vbiBxdWVyaWVzXG4gICAgICBjb25zdCBxdWVyeUhhc2ggPSBjcnlwdG8uY3JlYXRlSGFzaCgnbWQ1JykudXBkYXRlKGNvbnRlbnQudG9Mb3dlckNhc2UoKS50cmltKCkpLmRpZ2VzdCgnaGV4Jyk7XG4gICAgICBjb25zdCBjYWNoZWRSZXNwb25zZSA9IGF3YWl0IHRoaXMuZ2V0Q2FjaGVkUmVzcG9uc2UocXVlcnlIYXNoKTtcblxuICAgICAgbGV0IGFpUmVzcG9uc2U6IHN0cmluZztcbiAgICAgIGxldCBzb3VyY2VzOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgICBpZiAoY2FjaGVkUmVzcG9uc2UpIHtcbiAgICAgICAgYWlSZXNwb25zZSA9IGNhY2hlZFJlc3BvbnNlLnJlc3BvbnNlO1xuICAgICAgICBzb3VyY2VzID0gY2FjaGVkUmVzcG9uc2Uuc291cmNlcyB8fCBbXTtcbiAgICAgICAgLy8gVXBkYXRlIGNhY2hlIGhpdCBjb3VudFxuICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZUNhY2hlSGl0Q291bnQocXVlcnlIYXNoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEdlbmVyYXRlIG5ldyByZXNwb25zZSB1c2luZyBCZWRyb2NrXG4gICAgICAgIGNvbnN0IGJlZHJvY2tSZXNwb25zZSA9IGF3YWl0IEJlZHJvY2tTZXJ2aWNlLmdlbmVyYXRlRkFGU0FSZXNwb25zZShjb250ZW50KTtcbiAgICAgICAgYWlSZXNwb25zZSA9IGJlZHJvY2tSZXNwb25zZS5jb250ZW50O1xuXG4gICAgICAgIC8vIENhY2hlIHRoZSByZXNwb25zZSBmb3IgZnV0dXJlIHVzZVxuICAgICAgICBhd2FpdCB0aGlzLmNhY2hlUmVzcG9uc2UocXVlcnlIYXNoLCBhaVJlc3BvbnNlLCBzb3VyY2VzKTtcbiAgICAgIH1cblxuICAgICAgLy8gQ3JlYXRlIG1lc3NhZ2Ugb2JqZWN0c1xuICAgICAgY29uc3QgdXNlck1lc3NhZ2UgPSB7XG4gICAgICAgIGlkOiB1dWlkdjQoKSxcbiAgICAgICAgY29udGVudDogY29udGVudC50cmltKCksXG4gICAgICAgIHNlbmRlcjogJ3VzZXInLFxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCksXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBhaU1lc3NhZ2UgPSB7XG4gICAgICAgIGlkOiB1dWlkdjQoKSxcbiAgICAgICAgY29udGVudDogYWlSZXNwb25zZSxcbiAgICAgICAgc2VuZGVyOiAnYWknLFxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCksXG4gICAgICAgIG1ldGFkYXRhOiB7XG4gICAgICAgICAgc291cmNlcyxcbiAgICAgICAgfSxcbiAgICAgIH07XG5cbiAgICAgIC8vIFN0b3JlIGNvbnZlcnNhdGlvbiBpZiB1c2VySWQgaXMgcHJvdmlkZWRcbiAgICAgIGlmICh1c2VySWQpIHtcbiAgICAgICAgY29uc3QgZmluYWxDb252ZXJzYXRpb25JZCA9IGNvbnZlcnNhdGlvbklkIHx8IHV1aWR2NCgpO1xuICAgICAgICBhd2FpdCB0aGlzLnN0b3JlQ29udmVyc2F0aW9uTWVzc2FnZXMoZmluYWxDb252ZXJzYXRpb25JZCwgdXNlcklkLCBbdXNlck1lc3NhZ2UsIGFpTWVzc2FnZV0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHVzZXIgcHJvZ3Jlc3NcbiAgICAgICAgYXdhaXQgdGhpcy51cGRhdGVVc2VyUHJvZ3Jlc3ModXNlcklkKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgIG1lc3NhZ2U6IGFpTWVzc2FnZSxcbiAgICAgICAgc291cmNlcyxcbiAgICAgICAgY29udmVyc2F0aW9uSWQ6IGNvbnZlcnNhdGlvbklkIHx8ICh1c2VySWQgPyB1dWlkdjQoKSA6IHVuZGVmaW5lZCksXG4gICAgICB9KTtcblxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdDaGF0IGhhbmRsZXIgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNTAwLCAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyk7XG4gICAgfVxuICB9XG5cbiAgc3RhdGljIGFzeW5jIGhhbmRsZUNoYXRIaXN0b3J5KGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCwgY29udGV4dDogTGFtYmRhQ29udGV4dCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHVzZXJJZCA9IGV2ZW50LnBhdGhQYXJhbWV0ZXJzPy51c2VySWQ7XG4gICAgICBpZiAoIXVzZXJJZCkge1xuICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdVc2VyIElEIGlzIHJlcXVpcmVkJyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGxpbWl0ID0gZXZlbnQucXVlcnlTdHJpbmdQYXJhbWV0ZXJzPy5saW1pdCA/IHBhcnNlSW50KGV2ZW50LnF1ZXJ5U3RyaW5nUGFyYW1ldGVycy5saW1pdCkgOiA1MDtcblxuICAgICAgLy8gUXVlcnkgY29udmVyc2F0aW9ucyBmb3IgdGhlIHVzZXJcbiAgICAgIGNvbnN0IG1lc3NhZ2VzID0gYXdhaXQgRHluYW1vREJTZXJ2aWNlLnF1ZXJ5SXRlbXMoXG4gICAgICAgIFRBQkxFUy5DT05WRVJTQVRJT05TLFxuICAgICAgICAndXNlcklkID0gOnVzZXJJZCcsXG4gICAgICAgIHsgJzp1c2VySWQnOiB1c2VySWQgfSxcbiAgICAgICAgJ3VzZXJJZC10aW1lc3RhbXAtaW5kZXgnXG4gICAgICApO1xuXG4gICAgICAvLyBTb3J0IGJ5IHRpbWVzdGFtcCBhbmQgbGltaXQgcmVzdWx0c1xuICAgICAgY29uc3Qgc29ydGVkTWVzc2FnZXMgPSBtZXNzYWdlc1xuICAgICAgICAuc29ydCgoYSwgYikgPT4gYi5tZXNzYWdlVGltZXN0YW1wIC0gYS5tZXNzYWdlVGltZXN0YW1wKVxuICAgICAgICAuc2xpY2UoMCwgbGltaXQpO1xuXG4gICAgICByZXR1cm4gY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgbWVzc2FnZXM6IHNvcnRlZE1lc3NhZ2VzLFxuICAgICAgICBoYXNNb3JlOiBtZXNzYWdlcy5sZW5ndGggPiBsaW1pdCxcbiAgICAgIH0pO1xuXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0NoYXQgaGlzdG9yeSBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg1MDAsICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBhc3luYyBnZXRDYWNoZWRSZXNwb25zZShxdWVyeUhhc2g6IHN0cmluZykge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gYXdhaXQgRHluYW1vREJTZXJ2aWNlLmdldEl0ZW0oVEFCTEVTLlJFU1BPTlNFX0NBQ0hFLCB7IHF1ZXJ5SGFzaCB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignQ2FjaGUgcmV0cmlldmFsIGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIGFzeW5jIGNhY2hlUmVzcG9uc2UocXVlcnlIYXNoOiBzdHJpbmcsIHJlc3BvbnNlOiBzdHJpbmcsIHNvdXJjZXM6IHN0cmluZ1tdKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNhY2hlSXRlbSA9IHtcbiAgICAgICAgcXVlcnlIYXNoLFxuICAgICAgICByZXNwb25zZSxcbiAgICAgICAgc291cmNlcyxcbiAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgIGhpdENvdW50OiAxLFxuICAgICAgICBleHBpcmVzQXQ6IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApICsgKDYwICogNjApLCAvLyAxIGhvdXIgVFRMXG4gICAgICB9O1xuXG4gICAgICBhd2FpdCBEeW5hbW9EQlNlcnZpY2UucHV0SXRlbShUQUJMRVMuUkVTUE9OU0VfQ0FDSEUsIGNhY2hlSXRlbSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0NhY2hlIHN0b3JhZ2UgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgLy8gRG9uJ3QgdGhyb3cgLSBjYWNoaW5nIGlzIG5vdCBjcml0aWNhbFxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIGFzeW5jIHVwZGF0ZUNhY2hlSGl0Q291bnQocXVlcnlIYXNoOiBzdHJpbmcpIHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgRHluYW1vREJTZXJ2aWNlLnVwZGF0ZUl0ZW0oXG4gICAgICAgIFRBQkxFUy5SRVNQT05TRV9DQUNIRSxcbiAgICAgICAgeyBxdWVyeUhhc2ggfSxcbiAgICAgICAgJ1NFVCBoaXRDb3VudCA9IGhpdENvdW50ICsgOmluYycsXG4gICAgICAgIHsgJzppbmMnOiAxIH1cbiAgICAgICk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0NhY2hlIGhpdCBjb3VudCB1cGRhdGUgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgLy8gRG9uJ3QgdGhyb3cgLSB0aGlzIGlzIG5vdCBjcml0aWNhbFxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIGFzeW5jIHN0b3JlQ29udmVyc2F0aW9uTWVzc2FnZXMoY29udmVyc2F0aW9uSWQ6IHN0cmluZywgdXNlcklkOiBzdHJpbmcsIG1lc3NhZ2VzOiBhbnlbXSkge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBleHBpcmVzQXQgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKSArICgyNCAqIDYwICogNjApOyAvLyAyNCBob3VycyBUVExcblxuICAgICAgZm9yIChjb25zdCBtZXNzYWdlIG9mIG1lc3NhZ2VzKSB7XG4gICAgICAgIGNvbnN0IGNvbnZlcnNhdGlvbkl0ZW0gPSB7XG4gICAgICAgICAgY29udmVyc2F0aW9uSWQsXG4gICAgICAgICAgbWVzc2FnZVRpbWVzdGFtcDogbWVzc2FnZS50aW1lc3RhbXAuZ2V0VGltZSgpLFxuICAgICAgICAgIHVzZXJJZCxcbiAgICAgICAgICBtZXNzYWdlQ29udGVudDogbWVzc2FnZS5jb250ZW50LFxuICAgICAgICAgIHNlbmRlcjogbWVzc2FnZS5zZW5kZXIsXG4gICAgICAgICAgbWVzc2FnZUlkOiBtZXNzYWdlLmlkLFxuICAgICAgICAgIG1ldGFkYXRhOiBtZXNzYWdlLm1ldGFkYXRhIHx8IHt9LFxuICAgICAgICAgIGV4cGlyZXNBdCxcbiAgICAgICAgfTtcblxuICAgICAgICBhd2FpdCBEeW5hbW9EQlNlcnZpY2UucHV0SXRlbShUQUJMRVMuQ09OVkVSU0FUSU9OUywgY29udmVyc2F0aW9uSXRlbSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0NvbnZlcnNhdGlvbiBzdG9yYWdlIGVycm9yOicsIGVycm9yKTtcbiAgICAgIC8vIERvbid0IHRocm93IC0gY29udmVyc2F0aW9uIHN0b3JhZ2UgaXMgbm90IGNyaXRpY2FsIGZvciB0aGUgcmVzcG9uc2VcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBhc3luYyB1cGRhdGVVc2VyUHJvZ3Jlc3ModXNlcklkOiBzdHJpbmcpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgXG4gICAgICBhd2FpdCBEeW5hbW9EQlNlcnZpY2UudXBkYXRlSXRlbShcbiAgICAgICAgVEFCTEVTLlVTRVJfUFJPR1JFU1MsXG4gICAgICAgIHsgdXNlcklkIH0sXG4gICAgICAgICdTRVQgdG90YWxJbnRlcmFjdGlvbnMgPSBpZl9ub3RfZXhpc3RzKHRvdGFsSW50ZXJhY3Rpb25zLCA6emVybykgKyA6aW5jLCB1cGRhdGVkQXQgPSA6bm93JyxcbiAgICAgICAgeyBcbiAgICAgICAgICAnOmluYyc6IDEsIFxuICAgICAgICAgICc6emVybyc6IDAsXG4gICAgICAgICAgJzpub3cnOiBub3cgXG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1VzZXIgcHJvZ3Jlc3MgdXBkYXRlIGVycm9yOicsIGVycm9yKTtcbiAgICAgIC8vIERvbid0IHRocm93IC0gcHJvZ3Jlc3MgdHJhY2tpbmcgaXMgbm90IGNyaXRpY2FsXG4gICAgfVxuICB9XG59XG5cbi8vIExhbWJkYSBoYW5kbGVyIGZ1bmN0aW9uc1xuZXhwb3J0IGNvbnN0IGNoYXRNZXNzYWdlID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCwgY29udGV4dDogTGFtYmRhQ29udGV4dCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XG4gIHJldHVybiBDaGF0SGFuZGxlci5oYW5kbGVDaGF0TWVzc2FnZShldmVudCwgY29udGV4dCk7XG59O1xuXG5leHBvcnQgY29uc3QgY2hhdEhpc3RvcnkgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBjb250ZXh0OiBMYW1iZGFDb250ZXh0KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcbiAgcmV0dXJuIENoYXRIYW5kbGVyLmhhbmRsZUNoYXRIaXN0b3J5KGV2ZW50LCBjb250ZXh0KTtcbn07Il19