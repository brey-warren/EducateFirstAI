import React, { useState } from 'react';
import { useChatContext } from '../../contexts/ChatContext';
import { useAuth } from '../../hooks/useAuth';
import './ConversationManager.css';

interface ConversationManagerProps {
  className?: string;
}

export const ConversationManager: React.FC<ConversationManagerProps> = ({ 
  className = '' 
}) => {
  const { user } = useAuth();
  const { state, setActiveConversation, clearConversation } = useChatContext();
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't show conversation manager for guest users
  if (!user || user.isGuest) {
    return null;
  }

  const conversationIds = Object.keys(state.conversations);
  const hasConversations = conversationIds.length > 0;

  const handleConversationSelect = (conversationId: string) => {
    setActiveConversation(conversationId);
    setIsExpanded(false);
  };

  const handleConversationDelete = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      clearConversation(conversationId);
    }
  };

  const getConversationPreview = (conversationId: string): string => {
    const messages = state.conversations[conversationId] || [];
    const lastUserMessage = messages
      .filter(msg => msg.sender === 'user')
      .pop();
    
    if (lastUserMessage) {
      return lastUserMessage.content.slice(0, 50) + 
        (lastUserMessage.content.length > 50 ? '...' : '');
    }
    
    return 'New conversation';
  };

  const getConversationDate = (conversationId: string): string => {
    const messages = state.conversations[conversationId] || [];
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage) {
      return new Date(lastMessage.timestamp).toLocaleDateString();
    }
    
    return 'Today';
  };

  if (!hasConversations) {
    return null;
  }

  return (
    <div className={`conversation-manager ${className}`}>
      <button
        className="conversation-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-label="Toggle conversation list"
      >
        <span className="conversation-count">
          {conversationIds.length} conversation{conversationIds.length !== 1 ? 's' : ''}
        </span>
        <span className={`toggle-icon ${isExpanded ? 'expanded' : ''}`}>
          ▼
        </span>
      </button>

      {isExpanded && (
        <div className="conversation-list">
          <div className="conversation-list-header">
            <h3>Your Conversations</h3>
          </div>
          
          <div className="conversation-items">
            {conversationIds.map(conversationId => (
              <div
                key={conversationId}
                className={`conversation-item ${
                  state.activeConversationId === conversationId ? 'active' : ''
                }`}
                onClick={() => handleConversationSelect(conversationId)}
              >
                <div className="conversation-content">
                  <div className="conversation-preview">
                    {getConversationPreview(conversationId)}
                  </div>
                  <div className="conversation-meta">
                    <span className="conversation-date">
                      {getConversationDate(conversationId)}
                    </span>
                    <span className="message-count">
                      {state.conversations[conversationId]?.length || 0} messages
                    </span>
                  </div>
                </div>
                
                <button
                  className="delete-conversation"
                  onClick={(e) => handleConversationDelete(conversationId, e)}
                  aria-label="Delete conversation"
                  title="Delete conversation"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};