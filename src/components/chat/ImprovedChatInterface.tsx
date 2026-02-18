import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';
import './ImprovedChatInterface.css';

interface ImprovedChatInterfaceProps {
  className?: string;
  initialSection?: string | null;
}

export const ImprovedChatInterface: React.FC<ImprovedChatInterfaceProps> = ({
  className = '',
  initialSection,
}) => {
  const { user } = useAuth();
  const { messages, sendMessage, isLoading } = useChat();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (initialSection) {
      setInputValue(`Tell me about the ${initialSection} section of FAFSA`);
    }
  }, [initialSection]);

  const quickQuestions = [
    { icon: '📋', text: 'What documents do I need for FAFSA?' },
    { icon: '📅', text: 'When is the FAFSA deadline?' },
    { icon: '👨‍👩‍👧', text: 'My parents are divorced - what do I do?' },
    { icon: '💰', text: 'How much aid can I get?' },
  ];

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const messageContent = inputValue;
    setInputValue('');

    try {
      await sendMessage(messageContent);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInputValue(question);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`improved-chat-container ${className}`}>
      {/* Decorative background elements */}
      <div className="bg-gradient" />
      <div className="bg-circle-1" />
      <div className="bg-circle-2" />
      <div className="bg-circle-3" />

      <div className="chat-content">
        {/* Welcome State */}
        {messages.length === 0 && (
          <div className="welcome-container">
            <div className="welcome-icon">👋</div>
            <h2 className="welcome-title">
              Hi {user && !user.isGuest ? user.email?.split('@')[0] : 'there'}! I'm your FAFSA Assistant
            </h2>
            <p className="welcome-text">
              I'm here to help you navigate the FAFSA process step by step. 
              No question is too simple - I explain everything in plain English!
            </p>

            {/* Stats Bar */}
            <div className="stats-bar">
              <div className="stat-item">
                <span className="stat-number">$3B+</span>
                <span className="stat-label">Aid left unclaimed yearly</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <span className="stat-number">10K+</span>
                <span className="stat-label">Students helped</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <span className="stat-number">24/7</span>
                <span className="stat-label">Always available</span>
              </div>
            </div>

            {/* Quick Questions */}
            <div className="quick-questions-section">
              <p className="quick-questions-label">Popular questions to get started:</p>
              <div className="quick-questions-grid">
                {quickQuestions.map((q, index) => (
                  <button
                    key={index}
                    className="quick-question-button"
                    onClick={() => handleQuickQuestion(q.text)}
                  >
                    <span className="quick-question-icon">{q.icon}</span>
                    <span className="quick-question-text">{q.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="messages-container">
            {messages.map((msg, index) => (
              <div
                key={msg.id || index}
                className={`message-wrapper ${msg.sender === 'user' ? 'user-message' : 'assistant-message'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="assistant-avatar">🎓</div>
                )}
                <div className={`message-bubble ${msg.sender === 'user' ? 'user-bubble' : 'assistant-bubble'}`}>
                  <p className="message-text">{msg.content}</p>
                  <span className="message-time">
                    {formatTime(msg.timestamp)}
                  </span>
                  {msg.metadata?.sources && msg.metadata.sources.length > 0 && (
                    <div className="message-sources">
                      <span className="sources-label">Sources:</span>
                      {msg.metadata.sources.map((source: string, idx: number) => (
                        <a
                          key={idx}
                          href={source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="source-link"
                        >
                          {source}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="message-wrapper assistant-message">
                <div className="assistant-avatar">🎓</div>
                <div className="typing-indicator">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="input-container">
        <div className="input-wrapper">
          <textarea
            className="text-input"
            placeholder="Ask me anything about FAFSA, financial aid, or college funding..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            disabled={isLoading}
          />
          <button
            className="send-button"
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            style={{ opacity: inputValue.trim() && !isLoading ? 1 : 0.5 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" />
            </svg>
          </button>
        </div>
        <p className="disclaimer">
          EducateFirstAI provides guidance only. Always verify with{' '}
          <a 
            href="https://studentaid.gov" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="disclaimer-link"
          >
            StudentAid.gov
          </a>
        </p>
      </div>
    </div>
  );
};
