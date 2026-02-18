import React, { useRef, useEffect, useState } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ErrorList } from '../errors/ErrorList';
import { ErrorDisplay, NetworkStatus } from '../errors/ErrorDisplay';
import { useAuth } from '../../hooks/useAuth';
import { useChat } from '../../hooks/useChat';
import { useErrorDetection } from '../../hooks/useErrorDetection';
import { useAccessibility } from '../../hooks/useAccessibility';
import { useErrorHandling, useNetworkStatus } from '../../hooks/useErrorHandling';
import { AppError } from '../../utils/errorHandling';
import { OptimizationService } from '../../services/optimization';
import './ChatInterface.css';

interface ChatInterfaceProps {
  className?: string;
  initialSection?: string | null;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ className = '', initialSection }) => {
  const { user } = useAuth();
  const {
    messages,
    isLoading,
    error: chatError,
    conversationId,
    sendMessage,
    retryLastMessage,
    clearError: clearChatError,
    loadHistory,
    clearMessages,
  } = useChat({ user: user || undefined, autoLoadHistory: true });
  
  const {
    detectionResult,
    detectErrors,
    dismissError,
    hasActiveErrors
  } = useErrorDetection({ autoDetect: false, debounceMs: 1000 });
  
  const { announce } = useAccessibility({ announceChanges: true });
  
  // Enhanced error handling
  const {
    error: systemError,
    isRetrying,
    handleError,
    clearError: clearSystemError,
    handleRetry: retrySystemOperation,
    canRetry,
    shouldShowRetry,
    executeWithErrorHandling,
  } = useErrorHandling({
    maxRetries: 3,
    onError: (error: AppError) => {
      announce(`Error: ${error.userMessage}`, 'assertive');
    },
    onRecovery: (result) => {
      if (result.success && result.attemptsMade > 1) {
        announce('Operation succeeded after retry', 'polite');
      }
    },
  });

  // Network status monitoring
  const { isOnline, testConnectivity, isTestingConnectivity } = useNetworkStatus();
  
  const [showErrorPanel, setShowErrorPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize performance optimizations
  useEffect(() => {
    // Preload common FAFSA responses for better performance
    import('../../services/caching').then(({ CachingService }) => {
      CachingService.preloadCommonResponses();
    });
    
    // Auto-optimize based on usage patterns
    OptimizationService.autoOptimize();
  }, []);

  // Auto-send initial section message if provided
  useEffect(() => {
    if (initialSection && messages.length === 0) {
      const sectionMessage = `I'd like to learn about the ${initialSection} section of the FAFSA. Can you help me understand what information I need and common mistakes to avoid?`;
      handleSendMessage(sectionMessage);
    }
  }, [initialSection, messages.length]); // Only run when initialSection changes or when there are no messages
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Update resource usage metrics
  useEffect(() => {
    OptimizationService.updateResourceUsage({
      memoryUsage: (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0,
      networkRequests: messages.length,
      cacheHitRate: 0, // This would be updated by the caching service
      averageResponseTime: 1000, // This would be calculated from actual response times
    });
  }, [messages]);

  // Handle chat errors with enhanced error handling
  useEffect(() => {
    if (chatError && typeof chatError === 'string') {
      // Convert string error to AppError for consistent handling
      handleError(new Error(chatError), {
        action: 'chat_operation',
        userId: user?.userId || undefined,
        conversationId: conversationId || undefined,
      });
    }
  }, [chatError, user?.userId, conversationId]); // Removed handleError from dependencies

  const handleSendMessage = async (content: string) => {
    // Clear any existing system errors
    clearSystemError();
    
    // Detect errors in user input before sending
    if (content.trim().length > 10) {
      const result = await detectErrors({
        userInput: content,
        context: { messageCount: messages.length }
      });
      
      if (result.hasErrors) {
        const errorCount = result.errors.length + result.warnings.length;
        announce(`${errorCount} potential FAFSA ${errorCount === 1 ? 'issue' : 'issues'} detected in your message`, 'assertive');
      }
    }
    
    // Send message with error handling
    const result = await executeWithErrorHandling(
      () => sendMessage(content),
      {
        action: 'send_message',
        userId: user?.userId || undefined,
        conversationId: conversationId || undefined,
        additionalData: { messageLength: content.length },
      }
    );

    if (result.success) {
      announce('Message sent', 'polite');
    }
  };

  const handleRetry = async () => {
    clearSystemError();
    
    const result = await executeWithErrorHandling(
      () => retryLastMessage(),
      {
        action: 'retry_message',
        userId: user?.userId || undefined,
        conversationId: conversationId || undefined,
      }
    );

    if (result.success) {
      announce('Message retry successful', 'polite');
    }
  };

  const handleClearError = () => {
    clearChatError();
    clearSystemError();
    announce('Error dismissed', 'polite');
  };

  const handleLoadHistory = async () => {
    const result = await executeWithErrorHandling(
      () => loadHistory(),
      {
        action: 'load_history',
        userId: user?.userId || undefined,
      }
    );

    if (result.success) {
      announce('Conversation history loaded', 'polite');
    }
  };

  const toggleErrorPanel = () => {
    const newState = !showErrorPanel;
    setShowErrorPanel(newState);
    announce(newState ? 'Error panel opened' : 'Error panel closed', 'polite');
  };

  const handleNetworkRetry = async () => {
    const isConnected = await testConnectivity();
    announce(isConnected ? 'Connection restored' : 'Still offline', 'assertive');
  };

  // Determine which error to show (system error takes precedence)
  const displayError = systemError || (chatError ? new Error(chatError) : null);
  const showRetryButton = systemError ? shouldShowRetry : !!chatError;

  return (
    <div className={`chat-interface ${className}`} role="application" aria-label="FAFSA Assistant Chat">
      {/* Network status indicator */}
      <NetworkStatus 
        isOnline={isOnline}
        onRetryConnection={handleNetworkRetry}
        className="chat-network-status"
      />

      <header className="chat-header" role="banner">
        <h2 id="chat-title">FAFSA Assistant</h2>
        <div className="user-status" aria-live="polite">
          {user?.isGuest ? (
            <span className="guest-indicator" role="status">Guest Mode</span>
          ) : (
            <span className="user-indicator" role="status">Logged in as {user?.email}</span>
          )}
        </div>
        
        <div className="chat-controls" role="toolbar" aria-label="Chat controls">
          {hasActiveErrors && (
            <button 
              onClick={toggleErrorPanel}
              className={`error-toggle-button ${showErrorPanel ? 'active' : ''}`}
              title="Toggle error panel"
              aria-label={`${showErrorPanel ? 'Hide' : 'Show'} FAFSA error panel. ${(detectionResult?.errors.length || 0) + (detectionResult?.warnings.length || 0)} issues detected`}
              aria-expanded={showErrorPanel}
              aria-controls="error-panel"
            >
              ⚠️ {(detectionResult?.errors.length || 0) + (detectionResult?.warnings.length || 0)}
            </button>
          )}
          {user && !user.isGuest && (
            <button 
              onClick={handleLoadHistory}
              className="load-history-button"
              disabled={isLoading || isRetrying}
              title="Load conversation history"
              aria-label="Load previous conversation history"
            >
              <span aria-hidden="true">📜</span>
              <span className="sr-only">Load History</span>
            </button>
          )}
          <button 
            onClick={clearMessages}
            className="clear-chat-button"
            disabled={isLoading || isRetrying}
            title="Clear conversation"
            aria-label="Clear current conversation"
          >
            <span aria-hidden="true">🗑️</span>
            <span className="sr-only">Clear Chat</span>
          </button>
        </div>
      </header>

      <div className="chat-container" role="region" aria-labelledby="chat-title">
        {showErrorPanel && detectionResult && hasActiveErrors && (
          <section id="error-panel" className="error-panel" aria-label="FAFSA Error Detection">
            <ErrorList
              errors={detectionResult.errors}
              warnings={detectionResult.warnings}
              onDismissError={dismissError}
              title="FAFSA Issues in Your Message"
            />
          </section>
        )}
        
        <MessageList 
          messages={messages} 
          isLoading={isLoading || isRetrying}
          className="message-list"
        />
        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced error display */}
      {displayError && (
        <div className="error-banner">
          {systemError ? (
            <ErrorDisplay
              error={systemError}
              onRetry={canRetry ? retrySystemOperation : undefined}
              onDismiss={handleClearError}
              showRetry={shouldShowRetry}
              showDismiss={true}
              compact={true}
            />
          ) : (
            <div className="error-content">
              <span className="error-message">{chatError}</span>
              <div className="error-actions">
                {showRetryButton && (
                  <button onClick={handleRetry} className="retry-button" disabled={isRetrying}>
                    {isRetrying ? 'Retrying...' : 'Retry'}
                  </button>
                )}
                <button onClick={handleClearError} className="dismiss-button">
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <MessageInput 
        onSendMessage={handleSendMessage}
        disabled={isLoading || isRetrying || !isOnline}
        placeholder={
          !isOnline 
            ? "You're offline. Check your connection to send messages."
            : isRetrying 
              ? "Retrying operation..."
              : "Ask me about FAFSA, financial aid, or college funding..."
        }
        className="message-input"
      />
      
      {conversationId && (
        <div className="conversation-info">
          <small>Conversation ID: {conversationId.slice(0, 8)}...</small>
        </div>
      )}

      {/* Loading indicator for network tests */}
      {isTestingConnectivity && (
        <div className="connectivity-test" role="status" aria-live="polite">
          Testing connection...
        </div>
      )}
    </div>
  );
};