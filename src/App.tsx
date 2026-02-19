import React, { useState, useRef, useEffect } from 'react';
import SignInModal from './components/SignInModal';
import './components/SignInModal.css';

/**
 * EducateFirstAI - Complete Chat Interface with Sign In Modal
 */

const EducateFirstAI: React.FC = () => {
  const [messages, setMessages] = useState<Array<{
    type: string;
    content: string;
    time: string;
  }>>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isGuest, setIsGuest] = useState(true);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [userName, setUserName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickQuestions = [
    { icon: '📋', text: 'What documents do I need for FAFSA?' },
    { icon: '📅', text: 'When is the FAFSA deadline?' },
    { icon: '👨‍👩‍👧', text: 'My parents are divorced - what do I do?' },
    { icon: '💰', text: 'How much aid can I get?' },
  ];

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue;
    
    setMessages(prev => [...prev, {
      type: 'user',
      content: userMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await fetch('https://5w6rnkjhw7bwc7dw55mjhjche40rirbx.lambda-url.us-east-2.on.aws/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: data.message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: "Sorry, I couldn't connect. Please try again.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInputValue(question);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSignOut = () => {
    setIsGuest(true);
    setUserName('');
    setMessages([]);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #F0FDF4;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.95); }
        }

        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .app-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: linear-gradient(180deg, #ECFDF5 0%, #F0FDF4 50%, #F9FAFB 100%);
          position: relative;
          overflow-x: hidden;
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .bg-decoration {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
        }

        .bg-circle-1 {
          top: -150px;
          right: -100px;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%);
        }

        .bg-circle-2 {
          bottom: 200px;
          left: -200px;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(5, 150, 105, 0.1) 0%, transparent 70%);
        }

        .bg-circle-3 {
          top: 40%;
          right: -150px;
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(52, 211, 153, 0.1) 0%, transparent 70%);
        }

        .header {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          padding: 0;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 4px 20px rgba(5, 150, 105, 0.3);
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .logo-icon {
          width: 50px;
          height: 50px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .logo-text {
          font-size: 24px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.5px;
        }

        .tagline {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.85);
          margin-top: 2px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          border-radius: 25px;
          font-size: 13px;
          color: white;
          font-weight: 500;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #34D399;
          animation: pulse 2s ease-in-out infinite;
          box-shadow: 0 0 10px rgba(52, 211, 153, 0.5);
        }

        .sign-in-button {
          padding: 10px 22px;
          background: white;
          color: #059669;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .sign-in-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
          background: #F0FDF4;
        }

        .sign-out-button {
          padding: 10px 22px;
          background: rgba(255, 255, 255, 0.15);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .sign-out-button:hover {
          background: rgba(255, 255, 255, 0.25);
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          max-width: 900px;
          width: 100%;
          margin: 0 auto;
          padding: 32px 24px;
          position: relative;
          z-index: 1;
        }

        .chat-container {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .welcome-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 20px;
          animation: fadeInUp 0.6s ease-out;
        }

        .welcome-icon {
          font-size: 72px;
          margin-bottom: 24px;
          animation: float 3s ease-in-out infinite;
          filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.1));
        }

        .welcome-title {
          font-size: 36px;
          font-weight: 700;
          color: #065F46;
          margin-bottom: 16px;
          letter-spacing: -1px;
          line-height: 1.2;
        }

        .welcome-user {
          color: #10B981;
        }

        .welcome-text {
          font-size: 18px;
          color: #374151;
          max-width: 520px;
          line-height: 1.7;
          margin-bottom: 36px;
        }

        .stats-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          padding: 24px 40px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 4px 30px rgba(5, 150, 105, 0.12);
          margin-bottom: 44px;
          border: 1px solid rgba(5, 150, 105, 0.1);
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 32px;
        }

        .stat-number {
          font-size: 28px;
          font-weight: 700;
          color: #059669;
          letter-spacing: -1px;
        }

        .stat-label {
          font-size: 12px;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 4px;
          font-weight: 500;
        }

        .stat-divider {
          width: 1px;
          height: 50px;
          background: linear-gradient(180deg, transparent, #E5E7EB, transparent);
        }

        .quick-questions-section {
          width: 100%;
          max-width: 700px;
        }

        .quick-questions-label {
          font-size: 15px;
          color: #6B7280;
          margin-bottom: 18px;
          font-weight: 500;
        }

        .quick-questions-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        @media (max-width: 600px) {
          .quick-questions-grid {
            grid-template-columns: 1fr;
          }
          .stats-bar {
            flex-direction: column;
            gap: 16px;
            padding: 24px;
          }
          .stat-divider {
            width: 60px;
            height: 1px;
          }
          .welcome-title {
            font-size: 28px;
          }
        }

        .quick-question-button {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 22px;
          background: white;
          border: 2px solid #E5E7EB;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.25s ease;
          text-align: left;
          font-family: inherit;
        }

        .quick-question-button:hover {
          border-color: #10B981;
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.18);
          background: #F0FDF4;
        }

        .quick-question-icon {
          font-size: 28px;
          flex-shrink: 0;
        }

        .quick-question-text {
          font-size: 15px;
          color: #1F2937;
          font-weight: 500;
          line-height: 1.4;
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 24px 0;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .message-wrapper {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          animation: fadeInUp 0.3s ease-out;
        }

        .message-wrapper.user {
          justify-content: flex-end;
        }

        .assistant-avatar {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
        }

        .message-bubble {
          max-width: 75%;
          padding: 16px 20px;
          border-radius: 20px;
          line-height: 1.6;
        }

        .message-bubble.user {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          color: white;
          border-bottom-right-radius: 6px;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35);
        }

        .message-bubble.assistant {
          background: white;
          color: #1F2937;
          border-bottom-left-radius: 6px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(0, 0, 0, 0.04);
        }

        .message-text {
          font-size: 15px;
          margin: 0;
        }

        .message-time {
          font-size: 11px;
          margin-top: 8px;
          display: block;
          opacity: 0.7;
        }

        .typing-indicator {
          display: flex;
          gap: 5px;
          padding: 16px 20px;
          background: white;
          border-radius: 20px;
          border-bottom-left-radius: 6px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          width: fit-content;
        }

        .typing-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #10B981;
          animation: bounce 1.4s ease-in-out infinite;
        }

        .typing-dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        .input-container {
          margin-top: auto;
          padding-top: 24px;
        }

        .input-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 10px 10px 24px;
          background: white;
          border-radius: 28px;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
          border: 2px solid transparent;
          transition: all 0.2s ease;
        }

        .input-wrapper:focus-within {
          border-color: #10B981;
          box-shadow: 0 4px 30px rgba(16, 185, 129, 0.2);
        }

        .text-input {
          flex: 1;
          padding: 14px 0;
          border: none;
          background: transparent;
          font-size: 16px;
          font-family: inherit;
          color: #1F2937;
          resize: none;
          line-height: 1.5;
          max-height: 120px;
        }

        .text-input:focus {
          outline: none;
        }

        .text-input::placeholder {
          color: #9CA3AF;
        }

        .send-button {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s ease;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
        }

        .send-button:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
        }

        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .disclaimer {
          text-align: center;
          font-size: 13px;
          color: #9CA3AF;
          margin-top: 16px;
        }

        .disclaimer a {
          color: #059669;
          text-decoration: none;
          font-weight: 600;
        }

        .disclaimer a:hover {
          text-decoration: underline;
        }

        .footer {
          padding: 20px 24px;
          background: white;
          border-top: 1px solid #E5E7EB;
        }

        .footer-content {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          color: #6B7280;
        }

        .footer-divider {
          color: #D1D5DB;
        }

        .aws-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #F3F4F6;
          border-radius: 8px;
          font-weight: 500;
        }
      `}</style>

      <div className="app-container">
        <div className="bg-decoration bg-circle-1" />
        <div className="bg-decoration bg-circle-2" />
        <div className="bg-decoration bg-circle-3" />

        <header className="header">
          <div className="header-content">
            <div className="logo-section">
              <div className="logo-icon">🎓</div>
              <div>
                <div className="logo-text">EducateFirstAI</div>
                <div className="tagline">Your friendly FAFSA guide</div>
              </div>
            </div>
            <div className="header-actions">
              <div className="status-badge">
                <span className="status-dot" />
                <span>{isGuest ? 'Guest Mode' : `Hi, ${userName}!`}</span>
              </div>
              {isGuest ? (
                <button 
                  className="sign-in-button"
                  onClick={() => setShowSignInModal(true)}
                >
                  Sign In
                </button>
              ) : (
                <button 
                  className="sign-out-button"
                  onClick={handleSignOut}
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="main-content">
          <div className="chat-container">
            {messages.length === 0 && (
              <div className="welcome-container">
                <div className="welcome-icon">👋</div>
                <h1 className="welcome-title">
                  {isGuest ? (
                    "Hi there! I'm your FAFSA Assistant"
                  ) : (
                    <>
                      Welcome back, <span className="welcome-user">{userName}</span>!
                    </>
                  )}
                </h1>
                <p className="welcome-text">
                  I'm here to help you navigate the FAFSA process step by step. 
                  No question is too simple — I explain everything in plain English!
                </p>

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

            {messages.length > 0 && (
              <div className="messages-container">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`message-wrapper ${msg.type}`}
                  >
                    {msg.type === 'assistant' && (
                      <div className="assistant-avatar">🎓</div>
                    )}
                    <div className={`message-bubble ${msg.type}`}>
                      <p className="message-text">{msg.content}</p>
                      <span className="message-time">{msg.time}</span>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="message-wrapper">
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

          <div className="input-container">
            <div className="input-wrapper">
              <textarea
                className="text-input"
                placeholder="Ask me anything about FAFSA, financial aid, or college funding..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                className="send-button"
                onClick={handleSend}
                disabled={!inputValue.trim()}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>
              </button>
            </div>
            <p className="disclaimer">
              EducateFirstAI provides guidance only. Always verify with{' '}
              <a href="https://studentaid.gov" target="_blank" rel="noopener noreferrer">
                StudentAid.gov
              </a>
            </p>
          </div>
        </main>

        <footer className="footer">
          <div className="footer-content">
            <span>Built with ❤️ for first-gen students</span>
            <span className="footer-divider">•</span>
            <span className="aws-badge">☁️ Powered by AWS</span>
          </div>
        </footer>

        <SignInModal
          isOpen={showSignInModal}
          onClose={() => setShowSignInModal(false)}
          onSignIn={(name) => {
            setUserName(name);
            setIsGuest(false);
            setShowSignInModal(false);
          }}
        />
      </div>
    </>
  );
};

export default EducateFirstAI;
