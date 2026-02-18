import React, { useState, useRef, useEffect } from 'react';
import { validateChatInput } from '../../utils/validation';
import { useFormAccessibility } from '../../hooks/useAccessibility';
import './MessageInput.css';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "Ask me about FAFSA, financial aid, or college funding...",
  className = ''
}) => {
  const [message, setMessage] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  
  const { generateId, associateError, associateHelp } = useFormAccessibility();
  
  const textareaId = generateId('message-input');
  const errorId = generateId('message-error');
  const hintId = generateId('message-hint');

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  // Set up ARIA relationships
  useEffect(() => {
    if (textareaRef.current && hintRef.current) {
      associateHelp(textareaRef.current, hintRef.current);
    }
  }, [associateHelp]);

  useEffect(() => {
    if (textareaRef.current && errorRef.current && validationError) {
      associateError(textareaRef.current, errorRef.current);
    } else if (textareaRef.current && !validationError) {
      textareaRef.current.removeAttribute('aria-invalid');
      textareaRef.current.removeAttribute('aria-describedby');
      if (hintRef.current) {
        associateHelp(textareaRef.current, hintRef.current);
      }
    }
  }, [validationError, associateError, associateHelp]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (disabled) return;

    // Validate input
    const validation = validateChatInput(message);
    if (!validation.success) {
      setValidationError(validation.error || 'Validation failed');
      return;
    }

    // Send message
    onSendMessage(validation.data || message.trim());
    setMessage('');
    setValidationError(null);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const characterCount = message.length;
  const maxCharacters = 5000;
  const isNearLimit = characterCount > maxCharacters * 0.8;

  return (
    <div className={`message-input ${className}`} role="region" aria-label="Message input">
      <form onSubmit={handleSubmit} className="input-form">
        <div className="input-container">
          <label htmlFor={textareaId} className="sr-only">
            Enter your FAFSA question or message
          </label>
          <textarea
            id={textareaId}
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={`message-textarea ${validationError ? 'error' : ''}`}
            rows={1}
            maxLength={maxCharacters}
            aria-label="Type your FAFSA question here"
            aria-required="true"
          />
          
          <button
            type="submit"
            disabled={disabled || !message.trim()}
            className="send-button"
            aria-label={`Send message${message.trim() ? ': ' + message.slice(0, 50) + (message.length > 50 ? '...' : '') : ''}`}
          >
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              aria-hidden="true"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22,2 15,22 11,13 2,9"></polygon>
            </svg>
            <span className="sr-only">Send</span>
          </button>
        </div>

        <div className="input-footer">
          <div className="input-info">
            {validationError ? (
              <div 
                id={errorId}
                ref={errorRef}
                className="validation-error"
                role="alert"
                aria-live="assertive"
              >
                {validationError}
              </div>
            ) : (
              <div 
                id={hintId}
                ref={hintRef}
                className="input-hint"
                aria-live="polite"
              >
                Press Enter to send, Shift+Enter for new line
              </div>
            )}
          </div>
          
          <div 
            className={`character-count ${isNearLimit ? 'warning' : ''}`}
            aria-label={`${characterCount} of ${maxCharacters} characters used${isNearLimit ? ', approaching limit' : ''}`}
            role="status"
            aria-live="polite"
          >
            <span aria-hidden="true">{characterCount}/{maxCharacters}</span>
          </div>
        </div>
      </form>
    </div>
  );
};