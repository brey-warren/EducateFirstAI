import { Message } from '../types/message';
import { User } from '../services/auth';
import { 
  AppError, 
  ErrorContext, 
  ErrorClassifier, 
  RetryManager, 
  NetworkError, 
  ServiceUnavailableError, 
  ValidationError,
  TimeoutError,
  ErrorType 
} from '../utils/errorHandling';
import { CachingService } from './caching';
import { PerformanceMonitoringService } from './performance';

export interface ChatResponse {
  message: Message;
  sources?: string[];
  conversationId?: string;
}

export interface ChatHistoryResponse {
  messages: Message[];
  hasMore: boolean;
}

export interface SendMessageRequest {
  content: string;
  userId?: string;
  conversationId?: string;
}

export class ChatService {
  private static readonly BASE_URL = '/api/chat';
  private static readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  private static readonly USE_MOCK_DATA = import.meta.env.DEV; // Use mock data in development

  /**
   * Create a welcome message for new users
   */
  static createWelcomeMessage(user?: User): Message {
    const welcomeContent = user && !user.isGuest 
      ? `Hi ${user.email?.split('@')[0] || 'there'}! 👋 I'm your FAFSA assistant. I'm here to help you understand the Free Application for Federal Student Aid in plain English. 

Ask me anything about FAFSA - from basic questions like "What is FAFSA?" to specific help with forms, deadlines, or requirements. I can explain complex terms, help you avoid common mistakes, and guide you through each section.

What would you like to know about FAFSA today?`
      : `Welcome to EducateFirstAI! 👋 I'm your FAFSA assistant, here to help you understand the Free Application for Federal Student Aid in plain English.

Ask me anything about FAFSA - from basic questions like "What is FAFSA?" to specific help with forms, deadlines, or requirements. I can explain complex terms, help you avoid common mistakes, and guide you through each section.

You can use me as a guest, or sign up to save your progress and conversation history.

What would you like to know about FAFSA today?`;

    return {
      id: `${crypto.randomUUID()}`,
      content: welcomeContent,
      sender: 'ai',
      timestamp: new Date(),
      metadata: {
        sources: ['https://studentaid.gov/apply-for-aid/fafsa'],
      },
    };
  }

  /**
   * Generate mock AI response for development
   */
  private static generateMockResponse(content: string, userId?: string): ChatResponse {
    const lowerContent = content.toLowerCase();
    
    // Contextual responses based on question keywords
    let response: string;
    
    // Financial aid amount questions
    if (lowerContent.includes('how much') || lowerContent.includes('amount') || lowerContent.includes('get back')) {
      response = "The amount of financial aid you receive through FAFSA depends on several factors:\n\n" +
        "• **Your Expected Family Contribution (EFC)**: Calculated from your family's income and assets\n" +
        "• **Cost of Attendance (COA)**: The total cost of your school\n" +
        "• **Your financial need**: COA minus EFC\n\n" +
        "**Pell Grant**: Up to $7,395 per year (2023-24) for students with exceptional financial need\n" +
        "**Federal Student Loans**: Undergrads can borrow $5,500-$12,500 per year depending on year in school\n" +
        "**Work-Study**: Varies by school and availability\n\n" +
        "The exact amount varies greatly - some students receive $0, while others get full tuition coverage plus living expenses. Complete your FAFSA to get your personalized estimate!";
    }
    // Documents/requirements questions
    else if (lowerContent.includes('document') || lowerContent.includes('need') || lowerContent.includes('require')) {
      response = "To complete the FAFSA, you'll need:\n\n" +
        "**Personal Information:**\n" +
        "• Social Security number\n" +
        "• Driver's license (if you have one)\n" +
        "• Alien Registration number (if not a U.S. citizen)\n\n" +
        "**Financial Information:**\n" +
        "• Federal tax returns (yours and parents' if dependent)\n" +
        "• W-2 forms and other income records\n" +
        "• Bank statements and investment records\n" +
        "• Records of untaxed income\n\n" +
        "**School Information:**\n" +
        "• List of schools you're interested in (Federal School Codes)\n\n" +
        "💡 Tip: Use the IRS Data Retrieval Tool to automatically import tax information!";
    }
    // Dependency status questions
    else if (lowerContent.includes('dependent') || lowerContent.includes('independent') || lowerContent.includes('parent')) {
      response = "Your dependency status determines whose financial information you need to provide:\n\n" +
        "**You're INDEPENDENT if you:**\n" +
        "• Are 24 or older\n" +
        "• Are married\n" +
        "• Have children or dependents\n" +
        "• Are a veteran or active military\n" +
        "• Are an orphan or ward of the court\n" +
        "• Are an emancipated minor\n\n" +
        "**You're DEPENDENT if:**\n" +
        "• You don't meet any of the above criteria\n" +
        "• You'll need to provide parent financial information\n\n" +
        "⚠️ Note: Just living on your own or parents refusing to help doesn't make you independent for FAFSA purposes.";
    }
    // Deadline questions
    else if (lowerContent.includes('deadline') || lowerContent.includes('when') || lowerContent.includes('due')) {
      response = "FAFSA deadlines are important:\n\n" +
        "**Federal Deadline:**\n" +
        "• Opens: October 1st each year\n" +
        "• Federal deadline: June 30th (for the current award year)\n\n" +
        "**State Deadlines:**\n" +
        "• Vary by state - some as early as March!\n" +
        "• Check your state's deadline at studentaid.gov\n\n" +
        "**School Deadlines:**\n" +
        "• Each college sets its own priority deadline\n" +
        "• Often between January and March\n\n" +
        "🎯 Best Practice: Submit as early as possible after October 1st! Some aid is first-come, first-served.";
    }
    // Eligibility questions
    else if (lowerContent.includes('eligible') || lowerContent.includes('qualify') || lowerContent.includes('can i')) {
      response = "To be eligible for federal student aid, you must:\n\n" +
        "✅ **Be a U.S. citizen or eligible noncitizen**\n" +
        "✅ **Have a valid Social Security number**\n" +
        "✅ **Be enrolled or accepted in an eligible degree program**\n" +
        "✅ **Be enrolled at least half-time for most programs**\n" +
        "✅ **Maintain satisfactory academic progress**\n" +
        "✅ **Not owe refunds on federal grants**\n" +
        "✅ **Not be in default on federal student loans**\n" +
        "✅ **Register with Selective Service (if male, 18-25)**\n\n" +
        "Most students are eligible for some form of aid - it's always worth applying!";
    }
    // What is FAFSA questions
    else if (lowerContent.includes('what is') || lowerContent.includes('what\'s') || lowerContent.includes('explain')) {
      response = "The FAFSA (Free Application for Federal Student Aid) is the official form to apply for federal financial aid for college.\n\n" +
        "**What it does:**\n" +
        "• Determines your eligibility for federal grants, loans, and work-study\n" +
        "• Used by states and colleges to award their own aid\n" +
        "• Calculates your Expected Family Contribution (EFC)\n\n" +
        "**Types of aid you can get:**\n" +
        "• **Grants**: Free money you don't repay (like Pell Grants)\n" +
        "• **Loans**: Money you borrow and must repay with interest\n" +
        "• **Work-Study**: Part-time jobs to earn money for school\n\n" +
        "It's completely free to fill out and takes about 30-45 minutes!";
    }
    // How to fill out questions
    else if (lowerContent.includes('how to') || lowerContent.includes('fill out') || lowerContent.includes('complete')) {
      response = "Here's how to complete your FAFSA:\n\n" +
        "**Step 1: Create an FSA ID**\n" +
        "• Go to studentaid.gov\n" +
        "• Both you and one parent need separate FSA IDs (if dependent)\n\n" +
        "**Step 2: Gather Documents**\n" +
        "• Tax returns, W-2s, bank statements\n" +
        "• Social Security numbers\n" +
        "• School codes for colleges you're applying to\n\n" +
        "**Step 3: Fill Out the Form**\n" +
        "• Go to fafsa.gov\n" +
        "• Answer all questions carefully\n" +
        "• Use the IRS Data Retrieval Tool when possible\n\n" +
        "**Step 4: Sign and Submit**\n" +
        "• Both student and parent must sign with FSA IDs\n" +
        "• Submit and save your confirmation\n\n" +
        "💡 Tip: Save your progress frequently!";
    }
    // Default response for other questions
    else {
      response = "That's a great FAFSA question! Here's what you should know:\n\n" +
        "The FAFSA process can seem complex, but I'm here to help break it down. " +
        "For the most accurate and detailed information about your specific situation, I recommend:\n\n" +
        "• Visiting the official StudentAid.gov website\n" +
        "• Contacting your school's financial aid office\n" +
        "• Calling the Federal Student Aid Information Center at 1-800-433-3243\n\n" +
        "Feel free to ask me more specific questions about:\n" +
        "• FAFSA deadlines and requirements\n" +
        "• What documents you need\n" +
        "• Dependency status\n" +
        "• Types of financial aid available\n" +
        "• How to fill out specific sections";
    }
    
    return {
      message: {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: response,
        sender: 'ai',
        timestamp: new Date(),
      },
      sources: ['https://studentaid.gov/apply-for-aid/fafsa'],
      conversationId: `conv_${userId || 'guest'}_${Date.now()}`,
    };
  }

  /**
   * Send a message to the AI assistant with comprehensive error handling
   */
  static async sendMessage(request: SendMessageRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    const context: ErrorContext = {
      action: 'send_chat_message',
      timestamp: new Date(),
      userId: request.userId,
      conversationId: request.conversationId,
      additionalData: {
        messageLength: request.content.length,
        hasConversationId: !!request.conversationId,
      },
    };

    // Check cache first
    const cacheKey = request.content.toLowerCase().trim();
    const cachedResponse = CachingService.get<ChatResponse>(cacheKey, request.userId);
    
    if (cachedResponse) {
      const responseTime = Date.now() - startTime;
      PerformanceMonitoringService.recordMetric('send_message', responseTime, true, true);
      return cachedResponse;
    }

    // Use mock data in development
    if (this.USE_MOCK_DATA) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      
      // Simulate occasional errors for testing error handling
      if (Math.random() < 0.1) { // 10% chance of error
        const responseTime = Date.now() - startTime;
        PerformanceMonitoringService.recordMetric('send_message', responseTime, false, false, 'service_unavailable');
        
        const error = new ServiceUnavailableError(
          context,
          'AI service is temporarily busy. Please try again.',
          'Mock service unavailable error for testing'
        );
        throw error;
      }
      
      const response = this.generateMockResponse(request.content, request.userId);
      
      // Cache the response
      CachingService.set(cacheKey, response, request.userId);
      
      const responseTime = Date.now() - startTime;
      PerformanceMonitoringService.recordMetric('send_message', responseTime, true, false);
      
      return response;
    }

    // Validate message before sending
    const validation = this.validateMessage(request.content);
    if (!validation.isValid) {
      const error = new ValidationError(context, validation.error);
      throw error;
    }

    const operation = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

      try {
        const response = await fetch(`${this.BASE_URL}/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          // Create appropriate error based on status code
          if (response.status >= 500) {
            throw new ServiceUnavailableError(
              context,
              'The AI service is temporarily unavailable. Please try again in a moment.',
              errorData.message || `Server error: ${response.status}`
            );
          } else if (response.status === 429) {
            throw new Error('Rate limit exceeded');
          } else if (response.status >= 400) {
            throw new ValidationError(
              context,
              errorData.message || 'Invalid request. Please check your input.',
              errorData.message || `Client error: ${response.status}`
            );
          }
          
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        
        return {
          message: {
            id: data.message.id,
            content: data.message.content,
            sender: data.message.sender,
            timestamp: new Date(data.message.timestamp),
            metadata: data.message.metadata || {}
          },
          sources: data.sources,
          conversationId: data.conversationId,
        };
      } catch (error) {
        clearTimeout(timeoutId);
        
        if ((error as Error).name === 'AbortError') {
          throw new TimeoutError(
            context,
            'The request took too long. Please try again.',
            'Request timeout'
          );
        }
        
        if (error instanceof TypeError && (error as Error).message.includes('fetch')) {
          throw new NetworkError(
            context,
            'Unable to connect to the server. Please check your internet connection.',
            'Network request failed'
          );
        }
        
        throw error;
      }
    };

    try {
      const result = await RetryManager.withRetry(operation, context, {
        maxAttempts: 3,
        baseDelay: 1000,
        retryCondition: (error) => {
          // Retry on network errors, timeouts, and 5xx server errors
          return error instanceof NetworkError || 
                 error instanceof TimeoutError || 
                 error instanceof ServiceUnavailableError ||
                 ((error as any).message && (error as any).message.includes('Rate limit'));
        },
      });

      if (result.success) {
        return result.data!;
      } else {
        const appError = ErrorClassifier.classifyError(result.error!, context);
        throw appError;
      }
    } catch (error) {
      if ((error as any).type) {
        throw error;
      }
      
      const appError = ErrorClassifier.classifyError(error as Error, context);
      throw appError;
    }
  }

  /**
   * Get conversation history with error handling and retry logic
   */
  static async getChatHistory(userId: string, limit: number = 50): Promise<ChatHistoryResponse> {
    const startTime = Date.now();
    const context: ErrorContext = {
      action: 'get_chat_history',
      timestamp: new Date(),
      userId,
      additionalData: { limit },
    };

    // Use mock data in development
    if (this.USE_MOCK_DATA) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
      
      const responseTime = Date.now() - startTime;
      PerformanceMonitoringService.recordMetric('get_chat_history', responseTime, true, false);
      
      // Return empty history for demo
      return {
        messages: [],
        hasMore: false,
      };
    }

    const operation = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

      try {
        const response = await fetch(`${this.BASE_URL}/history/${userId}?limit=${limit}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          if (response.status >= 500) {
            throw new ServiceUnavailableError(
              context,
              'Unable to load chat history. Please try again.',
              errorData.message || `Server error: ${response.status}`
            );
          } else if (response.status === 404) {
            // Return empty history for 404 (user has no history)
            return {
              messages: [],
              hasMore: false,
            };
          }
          
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        
        return {
          messages: data.messages.map((msg: any) => ({
            id: msg.messageId || msg.id,
            content: msg.messageContent || msg.content,
            sender: msg.sender,
            timestamp: new Date(msg.messageTimestamp || msg.timestamp),
            metadata: msg.metadata || {}
          })),
          hasMore: data.hasMore || false,
        };
      } catch (error) {
        clearTimeout(timeoutId);
        
        if ((error as Error).name === 'AbortError') {
          throw new TimeoutError(
            context,
            'Loading chat history took too long. Please try again.',
            'Request timeout'
          );
        }
        
        if (error instanceof TypeError && (error as Error).message.includes('fetch')) {
          throw new NetworkError(
            context,
            'Unable to load chat history. Please check your connection.',
            'Network request failed'
          );
        }
        
        throw error;
      }
    };

    try {
      const result = await RetryManager.withRetry(operation, context, {
        maxAttempts: 2,
        baseDelay: 1000,
      });

      if (result.success) {
        return result.data!;
      } else {
        const appError = ErrorClassifier.classifyError(result.error!, context);
        throw appError;
      }
    } catch (error) {
      if ((error as any).type) {
        throw error;
      }
      
      const appError = ErrorClassifier.classifyError(error as Error, context);
      throw appError;
    }
  }

  /**
   * Validate message content before sending
   */
  static validateMessage(content: string): { isValid: boolean; error?: string } {
    if (!content || content.trim().length === 0) {
      return {
        isValid: false,
        error: 'Please enter a FAFSA question or topic you\'d like help with.',
      };
    }

    if (content.length > 5000) {
      return {
        isValid: false,
        error: 'Please limit your question to 5000 characters or less.',
      };
    }

    return { isValid: true };
  }

  /**
   * Create a user message object
   */
  static createUserMessage(content: string): Message {
    return {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: content.trim(),
      sender: 'user',
      timestamp: new Date(),
      metadata: {}
    };
  }

  /**
   * Create an error message object for display in chat
   */
  static createErrorMessage(error: AppError): Message {
    let content: string;
    
    // Use user-friendly error messages
    switch (error.type) {
      case ErrorType.NETWORK_ERROR:
        content = "I'm having trouble connecting right now. Please check your internet connection and try again.";
        break;
      case ErrorType.SERVICE_UNAVAILABLE:
        content = "I'm temporarily unavailable. Please try again in a moment.";
        break;
      case ErrorType.TIMEOUT_ERROR:
        content = "That took longer than expected. Please try asking your question again.";
        break;
      case ErrorType.VALIDATION_ERROR:
        content = error.userMessage;
        break;
      default:
        content = "I encountered an issue processing your request. Please try again.";
    }

    return {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      sender: 'ai',
      timestamp: new Date(),
      metadata: { 
        isError: true,
        errorType: error.type,
        errorSeverity: error.severity,
        recoverable: error.recoverable,
      }
    };
  }
}