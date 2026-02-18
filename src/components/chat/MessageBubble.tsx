import React from 'react';
import { Message } from '../../types/message';
import './MessageBubble.css';

interface MessageBubbleProps {
  message: Message;
  isConsecutive?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isConsecutive = false 
}) => {
  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatContent = (content: string) => {
    // Simple formatting for sources and links
    return content
      .split('\n')
      .map((line, index) => (
        <React.Fragment key={index}>
          {line.startsWith('**Source') ? (
            <div className="message-source">
              {line.replace(/\*\*/g, '')}
            </div>
          ) : line.startsWith('**Sources') ? (
            <div className="message-sources">
              {line.replace(/\*\*/g, '')}
            </div>
          ) : line.match(/^\d+\.\s+https?:\/\//) ? (
            <div className="source-link">
              {line.split(' ').map((word, wordIndex) => 
                word.startsWith('http') ? (
                  <a 
                    key={wordIndex}
                    href={word} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="external-link"
                  >
                    {word}
                  </a>
                ) : (
                  <span key={wordIndex}>{word} </span>
                )
              )}
            </div>
          ) : (
            <span>{line}</span>
          )}
          {index < content.split('\n').length - 1 && <br />}
        </React.Fragment>
      ));
  };

  return (
    <div className={`message-bubble ${message.sender} ${isConsecutive ? 'consecutive' : ''} ${message.metadata?.isError ? 'error' : ''}`}>
      <div className="message-content">
        {formatContent(message.content)}
      </div>
      
      {!isConsecutive && (
        <div className="message-meta">
          <span className="message-time">
            {formatTimestamp(message.timestamp)}
          </span>
          {message.sender === 'ai' && message.metadata?.sources && (
            <span className="source-count">
              {Array.isArray(message.metadata.sources) 
                ? `${message.metadata.sources.length} source${message.metadata.sources.length !== 1 ? 's' : ''}`
                : '1 source'
              }
            </span>
          )}
        </div>
      )}
    </div>
  );
};