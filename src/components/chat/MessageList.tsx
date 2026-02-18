import React from 'react';
import { Message } from '../../types/message';
import { MessageBubble } from './MessageBubble';
import { LoadingIndicator } from './LoadingIndicator';
import './MessageList.css';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  className?: string;
}

export const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  isLoading = false, 
  className = '' 
}) => {
  return (
    <div className={`message-list ${className}`}>
      <div className="messages-container">
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isConsecutive={
              index > 0 && 
              messages[index - 1].sender === message.sender &&
              new Date(message.timestamp).getTime() - new Date(messages[index - 1].timestamp).getTime() < 60000 // Within 1 minute
            }
          />
        ))}
        
        {isLoading && (
          <div className="loading-message">
            <LoadingIndicator />
            <span className="loading-text">Thinking...</span>
          </div>
        )}
      </div>
    </div>
  );
};