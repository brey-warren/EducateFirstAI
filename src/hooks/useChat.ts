import { useState, useEffect, useCallback, useRef } from 'react';
import { Message } from '../types/message';
import { User } from '../services/auth';
import { ChatService, ChatResponse } from '../services/chat';

export interface UseChatOptions {
  user?: User;
  autoLoadHistory?: boolean;
  maxHistoryItems?: number;
}

export interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
  sendMessage: (content: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  clearError: () => void;
  loadHistory: () => Promise<void>;
  clearMessages: () => void;
}

export const useChat = (options: UseChatOptions = {}): UseChatReturn => {
  const { user, autoLoadHistory = true, maxHistoryItems = 100 } = options;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  
  const lastUserMessageRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load conversation history for authenticated users
  const loadHistory = useCallback(async () => {
    if (!user || user.isGuest || historyLoaded) return;

    try {
      setIsLoading(true);
      const historyResponse = await ChatService.getChatHistory(user.userId, maxHistoryItems);
      
      if (historyResponse.messages.length > 0) {
        // Sort messages by timestamp
        const sortedMessages = historyResponse.messages.sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        setMessages(prev => {
          // Avoid duplicates by filtering out messages that already exist
          const existingIds = new Set(prev.map(m => m.id));
          const newMessages = sortedMessages.filter(m => !existingIds.has(m.id));
          return [...newMessages, ...prev];
        });
      }
      
      setHistoryLoaded(true);
    } catch (err) {
      console.error('Failed to load chat history:', err);
      // Don't show error for history loading failure - it's not critical
    } finally {
      setIsLoading(false);
    }
  }, [user, maxHistoryItems, historyLoaded]);

  // Add welcome message for new users
  // useEffect(() => {
  //   if (messages.length === 0 && !isLoading) {
  //     const welcomeMessage = ChatService.createWelcomeMessage(user);
  //     setMessages([welcomeMessage]);
  //   }
  // }, [user, messages.length, isLoading]);

  // Load history on mount for authenticated users
  useEffect(() => {
    if (autoLoadHistory && user && !user.isGuest && !historyLoaded) {
      loadHistory();
    }
  }, [autoLoadHistory, user, historyLoaded, loadHistory]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Validate message
    const validation = ChatService.validateMessage(content);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid message');
      return;
    }

    // Clear any previous errors
    setError(null);
    setIsLoading(true);
    lastUserMessageRef.current = content.trim();

    // Add user message immediately
    const userMessage = ChatService.createUserMessage(content);
    setMessages(prev => [...prev, userMessage]);

    try {
      // Send message to API
      const response: ChatResponse = await ChatService.sendMessage({
        content: content.trim(),
        userId: user?.isGuest ? undefined : user?.userId || undefined,
        conversationId: conversationId || undefined,
      });

      // Add AI response
      setMessages(prev => [...prev, response.message]);
      
      // Update conversation ID if provided
      if (response.conversationId && !conversationId) {
        setConversationId(response.conversationId);
      }

    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message. Please try again.';
      setError(errorMessage);
      
      // Create AppError for error message
      const appError = (err as any).type ? err as any : {
        type: 'UNKNOWN_ERROR',
        severity: 'MEDIUM',
        userMessage: 'Sorry, I encountered an error processing your message. Please try again or rephrase your question.',
        recoverable: true,
      };
      
      // Add error message to chat
      const errorMsg = ChatService.createErrorMessage(appError);
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, user, conversationId]);

  const retryLastMessage = useCallback(async () => {
    if (!lastUserMessageRef.current) return;
    
    // Remove error messages
    setMessages(prev => prev.filter(m => !m.metadata?.isError));
    setError(null);
    
    // Retry with last user message
    await sendMessage(lastUserMessageRef.current);
  }, [sendMessage]);

  const clearError = useCallback(() => {
    setError(null);
    // Remove error messages from chat
    setMessages(prev => prev.filter(m => !m.metadata?.isError));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setHistoryLoaded(false);
    lastUserMessageRef.current = null;
    
    // Add welcome message back
    const welcomeMessage = ChatService.createWelcomeMessage(user);
    setMessages([welcomeMessage]);
  }, [user]);

  return {
    messages,
    isLoading,
    error,
    conversationId,
    sendMessage,
    retryLastMessage,
    clearError,
    loadHistory,
    clearMessages,
  };
};