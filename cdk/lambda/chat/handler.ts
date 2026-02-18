import { APIGatewayProxyEvent, APIGatewayProxyResult, LambdaContext } from '../shared/types';
import { createSuccessResponse, createErrorResponse } from '../shared/types';
import { DynamoDBService, TABLES } from '../shared/dynamodb';
import { BedrockService } from '../shared/bedrock';
import { KnowledgeBaseService } from '../shared/knowledge-base';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

// Privacy service for PII detection and sanitization
class PrivacyService {
  private static readonly PII_PATTERNS = {
    ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
    phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    bankAccount: /\b\d{8,17}\b/g,
  };

  static detectAndSanitizePII(text: string): { hasPII: boolean; sanitizedText: string; warnings: string[] } {
    let sanitizedText = text;
    const warnings: string[] = [];
    let hasPII = false;

    for (const [type, pattern] of Object.entries(this.PII_PATTERNS)) {
      if (pattern.test(text)) {
        hasPII = true;
        sanitizedText = sanitizedText.replace(pattern, `[${type.toUpperCase()}_REDACTED]`);
        warnings.push(`${type} detected and removed for your privacy`);
      }
    }

    return { hasPII, sanitizedText, warnings };
  }

  static isGuestUser(userId: string): boolean {
    return userId.startsWith('guest_');
  }
}

export class ChatHandler {
  static async handleChatMessage(event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult> {
    try {
      if (!event.body) {
        return createErrorResponse(400, 'Request body is required');
      }

      const { content, userId, conversationId } = JSON.parse(event.body);

      // Validate input
      if (!content || typeof content !== 'string') {
        return createErrorResponse(400, 'Message content is required');
      }

      if (content.trim().length === 0) {
        return createErrorResponse(400, 'Please enter a FAFSA question or topic you\'d like help with.');
      }

      if (content.length > 5000) {
        return createErrorResponse(400, 'Please limit your question to 5000 characters or less.');
      }

      // Privacy check: Detect and sanitize PII
      const privacyResult = PrivacyService.detectAndSanitizePII(content);
      const processedContent = privacyResult.sanitizedText;
      
      // If PII was detected, add warnings to response
      const privacyWarnings = privacyResult.warnings;

      // Check cache for common queries (using sanitized content)
      const queryHash = crypto.createHash('md5').update(processedContent.toLowerCase().trim()).digest('hex');
      const cachedResponse = await this.getCachedResponse(queryHash);

      let aiResponse: string;
      let sources: string[] = [];

      if (cachedResponse) {
        aiResponse = cachedResponse.response;
        sources = cachedResponse.sources || [];
        // Update cache hit count
        await this.updateCacheHitCount(queryHash);
      } else {
        // Search knowledge base for relevant context
        const knowledgeResults = await KnowledgeBaseService.searchDocuments(processedContent);
        
        // Build context from knowledge base
        let context = '';
        if (knowledgeResults.documents.length > 0) {
          context = knowledgeResults.documents
            .slice(0, 3) // Use top 3 most relevant documents
            .map(doc => `${doc.title}: ${doc.content}`)
            .join('\n\n');
        }

        // Generate new response using Bedrock with knowledge base context
        const bedrockResponse = await BedrockService.generateFAFSAResponse(processedContent, context);
        aiResponse = bedrockResponse.content;
        sources = knowledgeResults.sources;

        // Add source attribution to the response
        if (sources.length > 0) {
          aiResponse += KnowledgeBaseService.formatSourceAttribution(sources);
        }

        // Cache the response for future use (only if no PII was detected)
        if (!privacyResult.hasPII) {
          await this.cacheResponse(queryHash, aiResponse, sources);
        }
      }

      // Add privacy warnings to AI response if PII was detected
      if (privacyWarnings.length > 0) {
        const warningText = '\n\n⚠️ Privacy Notice: ' + privacyWarnings.join('. ') + 
          '. Your question has been processed safely without storing personal information.';
        aiResponse = warningText + '\n\n' + aiResponse;
      }

      // Create message objects
      const userMessage = {
        id: uuidv4(),
        content: content.trim(), // Store original content in response
        sender: 'user',
        timestamp: new Date(),
      };

      const aiMessage = {
        id: uuidv4(),
        content: aiResponse,
        sender: 'ai',
        timestamp: new Date(),
        metadata: {
          sources,
          privacyWarnings: privacyWarnings.length > 0 ? privacyWarnings : undefined,
        },
      };

      // Store conversation if userId is provided and not a guest
      if (userId && !PrivacyService.isGuestUser(userId)) {
        const finalConversationId = conversationId || uuidv4();
        
        // Sanitize messages before storage
        const sanitizedUserMessage = {
          ...userMessage,
          content: processedContent, // Store sanitized content
        };
        
        await this.storeConversationMessages(finalConversationId, userId, [sanitizedUserMessage, aiMessage]);
        
        // Update user progress
        await this.updateUserProgress(userId);
      }

      return createSuccessResponse({
        message: aiMessage,
        sources,
        conversationId: conversationId || (userId && !PrivacyService.isGuestUser(userId) ? uuidv4() : undefined),
        privacyWarnings: privacyWarnings.length > 0 ? privacyWarnings : undefined,
      });

    } catch (error) {
      console.error('Chat handler error:', error);
      return createErrorResponse(500, 'Internal server error');
    }
  }

  static async handleChatHistory(event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult> {
    try {
      const userId = event.pathParameters?.userId;
      if (!userId) {
        return createErrorResponse(400, 'User ID is required');
      }

      const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit) : 50;

      // Query conversations for the user
      const messages = await DynamoDBService.queryItems(
        TABLES.CONVERSATIONS,
        'userId = :userId',
        { ':userId': userId },
        'userId-timestamp-index'
      );

      // Sort by timestamp and limit results
      const sortedMessages = messages
        .sort((a, b) => b.messageTimestamp - a.messageTimestamp)
        .slice(0, limit);

      return createSuccessResponse({
        messages: sortedMessages,
        hasMore: messages.length > limit,
      });

    } catch (error) {
      console.error('Chat history error:', error);
      return createErrorResponse(500, 'Internal server error');
    }
  }

  private static async getCachedResponse(queryHash: string) {
    try {
      return await DynamoDBService.getItem(TABLES.RESPONSE_CACHE, { queryHash });
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  private static async cacheResponse(queryHash: string, response: string, sources: string[]) {
    try {
      const cacheItem = {
        queryHash,
        response,
        sources,
        createdAt: new Date().toISOString(),
        hitCount: 1,
        expiresAt: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour TTL
      };

      await DynamoDBService.putItem(TABLES.RESPONSE_CACHE, cacheItem);
    } catch (error) {
      console.error('Cache storage error:', error);
      // Don't throw - caching is not critical
    }
  }

  private static async updateCacheHitCount(queryHash: string) {
    try {
      await DynamoDBService.updateItem(
        TABLES.RESPONSE_CACHE,
        { queryHash },
        'SET hitCount = hitCount + :inc',
        { ':inc': 1 }
      );
    } catch (error) {
      console.error('Cache hit count update error:', error);
      // Don't throw - this is not critical
    }
  }

  private static async storeConversationMessages(conversationId: string, userId: string, messages: any[]) {
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

        await DynamoDBService.putItem(TABLES.CONVERSATIONS, conversationItem);
      }
    } catch (error) {
      console.error('Conversation storage error:', error);
      // Don't throw - conversation storage is not critical for the response
    }
  }

  private static async updateUserProgress(userId: string) {
    try {
      const now = new Date().toISOString();
      
      await DynamoDBService.updateItem(
        TABLES.USER_PROGRESS,
        { userId },
        'SET totalInteractions = if_not_exists(totalInteractions, :zero) + :inc, updatedAt = :now',
        { 
          ':inc': 1, 
          ':zero': 0,
          ':now': now 
        }
      );
    } catch (error) {
      console.error('User progress update error:', error);
      // Don't throw - progress tracking is not critical
    }
  }
}

// Lambda handler functions
export const chatMessage = async (event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult> => {
  return ChatHandler.handleChatMessage(event, context);
};

export const chatHistory = async (event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult> => {
  return ChatHandler.handleChatHistory(event, context);
};