import React, { useState, useRef, useEffect } from 'react';
import { getCurrentUser, signOut, fetchUserAttributes } from 'aws-amplify/auth';
import SignInModal from './components/SignInModal';
import DeadlineCountdown from './components/DeadlineCountdown';
import DarkModeToggle from './components/DarkModeToggle';
import ClearChatButton from './components/ClearChatButton';
import ChatHistorySidebar from './components/ChatHistorySidebar';
import VoiceInput from './components/VoiceInput';
import TypingMessage from './components/TypingMessage';
import LanguageSelector from './components/LanguageSelector';
import FAFSAChecklist from './components/FAFSAChecklist';
import MobileMenu from './components/MobileMenu';
import CopyButton from './components/CopyButton';
import ScrollToBottom from './components/ScrollToBottom';
import { useTranslation } from './hooks/useTranslation';
import { useTheme } from './context/ThemeContext';
import logo from './assets/logo.svg';
import './components/SignInModal.css';
import './App.css';

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
  const [showHistory, setShowHistory] = useState(false);
  const [chatSessions, setChatSessions] = useState<Array<{
    sessionId: string;
    title: string;
    timestamp: Date;
    preview: string;
  }>>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [chatMessagesMap, setChatMessagesMap] = useState<Record<string, Array<{
    type: string;
    content: string;
    time: string;
  }>>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [typingMessageId, setTypingMessageId] = useState<number | null>(null);
  const [language, setLanguage] = useState('en');
  const { t } = useTranslation(language as any);
  const [showChecklist, setShowChecklist] = useState(false);
  const { isDarkMode } = useTheme();

  const generateChatTitle = (message: string): string => {
    // Define patterns and their replacements
    const patterns: { pattern: RegExp; prefix: string }[] = [
      { pattern: /^what documents?\s+(do i need|are needed|should i have)/i, prefix: 'Documents needed' },
      { pattern: /^when is\s+/i, prefix: '' },
      { pattern: /^what is\s+/i, prefix: '' },
      { pattern: /^how (do i|can i|to)\s+/i, prefix: '' },
      { pattern: /^can i\s+/i, prefix: '' },
      { pattern: /^do i (need|have)\s+/i, prefix: '' },
      { pattern: /^should i\s+/i, prefix: '' },
      { pattern: /^why (do i|is|are)\s+/i, prefix: '' },
      { pattern: /^tell me about\s+/i, prefix: '' },
      { pattern: /^help me (with|understand)\s+/i, prefix: '' },
      { pattern: /^i need help with\s+/i, prefix: '' },
      { pattern: /^what('s| is) the\s+/i, prefix: '' },
    ];

    let title = message.trim();

    // Try to match and clean up
    for (const { pattern } of patterns) {
      if (pattern.test(title)) {
        title = title.replace(pattern, '');
        break;
      }
    }

    // Remove trailing question mark and clean up
    title = title.replace(/\?+$/, '').trim();

    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);

    // Truncate if too long
    if (title.length > 40) {
      title = title.slice(0, 40).trim() + '...';
    }

    return title || 'New conversation';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setIsGuest(false);
          
          // Fetch user attributes to get their name
          try {
            const attributes = await fetchUserAttributes();
            const displayName = attributes.name || 
                               attributes.email?.split('@')[0] || 
                               'User';
            setUserName(displayName);
          } catch {
            // Fallback to email from login
            setUserName(user.signInDetails?.loginId?.split('@')[0] || 'User');
          }
        }
      } catch (error) {
        // Not signed in
        setIsGuest(true);
      }
    };
    checkAuthState();
  }, []);

  const quickQuestions = [
    { icon: '📋', text: t('whatDocuments') },
    { icon: '📅', text: t('whenDeadline') },
    { icon: '👨‍👩‍👧', text: t('parentsDivorced') },
    { icon: '💰', text: t('howMuchAid') },
  ];

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue;
    
    const userMsg = {
      type: 'user',
      content: userMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await fetch('https://5w6rnkjhw7bwc7dw55mjhjche40rirbx.lambda-url.us-east-2.on.aws/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage, language: language }),
      });

      const data = await response.json();
      
      setTypingMessageId(messages.length + 1);
      
      const assistantMsg = {
        type: 'assistant',
        content: data.message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, assistantMsg]);

      // Save to chat history
      let sessionToSave = currentSessionId;
      if (!currentSessionId) {
        const newSessionId = 'session-' + Date.now();
        sessionToSave = newSessionId;
        setCurrentSessionId(newSessionId);
        setChatSessions(prev => [{
          sessionId: newSessionId,
          title: generateChatTitle(userMessage),
          timestamp: new Date(),
          preview: data.message.slice(0, 50) + '...',
        }, ...prev]);
      }
      
      // Save messages to the map
      const updatedMessages = [...messages, userMsg, assistantMsg];
      if (sessionToSave) {
        setChatMessagesMap(prev => ({
          ...prev,
          [sessionToSave]: updatedMessages
        }));
      }
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

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.log('Error signing out:', error);
    }
    setIsGuest(true);
    setUserName('');
    setMessages([]);
    setCurrentSessionId(null);
    setChatSessions([]);
    setChatMessagesMap({});
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
              <img src={logo} alt="EducateFirstAI Logo" className="logo-icon" style={{ width: '48px', height: '48px', borderRadius: '12px' }} />
              <div>
                <div className="logo-text">EducateFirstAI</div>
                <div className="tagline">{t('subtitle')}</div>
              </div>
            </div>
            <div className="header-actions">
              <div className="status-badge">
                <span className="status-dot" />
                <span>{isGuest ? <span className="guest-badge-text">Guest Mode</span> : <><span className="user-name-text">{t('welcome')}, {userName}!</span></>}</span>
              </div>
              
              <div className="desktop-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LanguageSelector 
                  currentLanguage={language} 
                  onLanguageChange={setLanguage}
                  disabled={isTyping}
                />
                <button 
                  onClick={() => setShowChecklist(true)} 
                  style={{
                    background: 'rgba(255,255,255,0.15)', 
                    border: '1px solid rgba(255,255,255,0.3)', 
                    borderRadius: '12px', 
                    padding: '10px 14px', 
                    cursor: 'pointer', 
                    fontSize: '18px',
                    transition: 'all 0.2s ease',
                  }}
                  title="FAFSA Checklist"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M9 11l3 3L22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                </button>
                <button 
                  onClick={() => setShowHistory(true)} 
                  style={{
                    background: 'rgba(255,255,255,0.15)', 
                    border: '1px solid rgba(255,255,255,0.3)', 
                    borderRadius: '12px', 
                    padding: '10px 14px', 
                    cursor: 'pointer', 
                    fontSize: '18px',
                    transition: 'all 0.2s ease',
                  }}
                  title="Chat history"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </button>
                <DarkModeToggle />
                {isGuest ? (
                  <button 
                    className="sign-in-button"
                    onClick={() => {
                      setShowHistory(false);
                      setShowSignInModal(true);
                    }}
                  >
                    {t('signIn')}
                  </button>
                ) : (
                  <button 
                    className="sign-out-button"
                    onClick={handleSignOut}
                  >
                    {t('signOut')}
                  </button>
                )}
              </div>

              <MobileMenu
                isGuest={isGuest}
                userName={userName}
                onSignIn={() => {
                  setShowHistory(false);
                  setShowSignInModal(true);
                }}
                onSignOut={handleSignOut}
                onShowHistory={() => setShowHistory(true)}
                onShowChecklist={() => setShowChecklist(true)}
                currentLanguage={language}
                onLanguageChange={setLanguage}
                t={t}
                disabled={isTyping}
              />
            </div>
          </div>
        </header>

        <main className="main-content">
          <div className="chat-container">
            {messages.length === 0 && (
              <div className="welcome-container">
                {chatSessions.length === 0 ? (
                  // First time user - show full welcome
                  <>
                    <div className="welcome-icon">👋</div>
                    <h1 className="welcome-title">
                      {isGuest ? (
                        t('welcomeTitle')
                      ) : (
                        <>
                          {t('welcome')}, <span className="welcome-user">{userName}</span>!
                        </>
                      )}
                    </h1>
                    <p className="welcome-text">
                      {t('welcomeText')}
                    </p>

                    <div className="stats-bar">
                      <div className="stat-item">
                        <span className="stat-number">$3B+</span>
                        <span className="stat-label">{t('aidUnclaimed')}</span>
                      </div>
                      <div className="stat-divider" />
                      <div className="stat-item">
                        <span className="stat-number">10K+</span>
                        <span className="stat-label">{t('studentsHelped')}</span>
                      </div>
                      <div className="stat-divider" />
                      <div className="stat-item">
                        <span className="stat-number">24/7</span>
                        <span className="stat-label">{t('alwaysAvailable')}</span>
                      </div>
                    </div>

                    <DeadlineCountdown t={t} />

                    <div className="quick-questions-section">
                      <p className="quick-questions-label">{t('quickQuestionsLabel')}</p>
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
                  </>
                ) : (
                  // Returning user with chat history - show simple prompt
                  <>
                    <div style={{ fontSize: '64px', marginBottom: '24px' }}>💬</div>
                    <h1 className="welcome-title">{t('newChatTitle')}</h1>
                    <p className="welcome-text" style={{ marginBottom: '32px' }}>
                      {t('newChatText')}
                    </p>
                    <div className="quick-questions-section">
                      <p className="quick-questions-label">{t('tryOneOfThese')}</p>
                      <div className="quick-questions-grid">
                        {quickQuestions.map((q, index) => (
                          <button
                            key={index}
                            className="quick-question-button"
                            onClick={() => setInputValue(q.text)}
                          >
                            <span className="quick-question-icon">{q.icon}</span>
                            <span className="quick-question-text">{q.text}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowHistory(true)}
                      style={{
                        marginTop: '24px',
                        padding: '12px 24px',
                        background: 'transparent',
                        border: '2px solid #10B981',
                        borderRadius: '12px',
                        color: '#10B981',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        margin: '24px auto 0',
                      }}
                    >
                      📜 {t('viewHistory')}
                    </button>
                  </>
                )}
              </div>
            )}

            {messages.length > 0 && (
              <div className="messages-container">
                <ClearChatButton 
                  onClear={() => {
                    // Clear current messages
                    setMessages([]);
                    
                    // Remove from chat sessions and messages map if there's a current session
                    if (currentSessionId) {
                      setChatSessions(prev => prev.filter(s => s.sessionId !== currentSessionId));
                      setChatMessagesMap(prev => {
                        const newMap = { ...prev };
                        delete newMap[currentSessionId];
                        return newMap;
                      });
                      setCurrentSessionId(null);
                    }
                  }}
                  disabled={messages.length === 0}
                  t={t}
                />
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`message-wrapper ${msg.type}`}
                  >
                    {msg.type === 'assistant' && (
                      <img 
                        src={logo} 
                        alt="AI" 
                        className="assistant-avatar"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: msg.type === 'assistant' ? 'flex-start' : 'flex-end' }}>
                      <div className={`message-bubble ${msg.type}`}>
                        <p className="message-text">
                          {msg.type === 'assistant' && index === messages.length - 1 && typingMessageId !== null ? (
                            <TypingMessage 
                              content={msg.content} 
                              onComplete={() => setTypingMessageId(null)}
                            />
                          ) : (
                            msg.content
                          )}
                        </p>
                        <span className="message-time">{msg.time}</span>
                      </div>
                      {msg.type === 'assistant' && (
                        <div className="message-actions" style={{
                          display: 'flex',
                          justifyContent: 'flex-start',
                          marginTop: '4px',
                          marginLeft: '8px',
                        }}>
                          <CopyButton text={msg.content} isDarkMode={isDarkMode} t={t} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="message-wrapper">
                    <img 
                      src={logo} 
                      alt="AI" 
                      className="assistant-avatar"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        flexShrink: 0,
                      }}
                    />
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
        </main>

        <div className="input-container">
          <div className="input-wrapper">
            <textarea
              className="text-input"
              placeholder={t('typeMessage')}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <VoiceInput 
              onTranscript={(text) => setInputValue(text)} 
              disabled={isTyping}
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
          <div className="footer-disclaimer" style={{
            textAlign: 'center',
            padding: '8px 16px',
            fontSize: '12px',
            color: isDarkMode ? '#9CA3AF' : '#6B7280',
          }}>
            <div style={{ marginBottom: '4px' }}>
              Built with ❤️ for first-gen students
            </div>
            <div>
              EducateFirstAI provides guidance only. Always verify with{' '}
              <a
                href="https://studentaid.gov"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#10B981', textDecoration: 'none' }}
              >
                StudentAid.gov
              </a>
            </div>
          </div>
        </div>

        <SignInModal
          isOpen={showSignInModal}
          onClose={() => setShowSignInModal(false)}
          onSignIn={(name) => {
            setUserName(name);
            setIsGuest(false);
            setShowSignInModal(false);
          }}
        />

        <ChatHistorySidebar
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          sessions={chatSessions}
          currentSessionId={currentSessionId}
          onSelectSession={(id) => {
            // Save current chat before switching
            if (currentSessionId && messages.length > 0) {
              setChatMessagesMap(prev => ({
                ...prev,
                [currentSessionId]: messages
              }));
            }
            
            // Load the selected chat's messages
            const savedMessages = chatMessagesMap[id] || [];
            setMessages(savedMessages);
            setCurrentSessionId(id);
            setShowHistory(false);
          }}
          onNewChat={() => {
            // Save current chat before clearing
            if (currentSessionId && messages.length > 0) {
              setChatMessagesMap(prev => ({
                ...prev,
                [currentSessionId]: messages
              }));
            }
            setMessages([]);
            setCurrentSessionId(null);
            setShowHistory(false);
          }}
          onDeleteSession={(id) => {
            // Remove from chat sessions
            setChatSessions(prev => prev.filter(s => s.sessionId !== id));
            
            // Remove from messages map
            setChatMessagesMap(prev => {
              const newMap = { ...prev };
              delete newMap[id];
              return newMap;
            });
            
            // If the deleted chat is currently open, clear it
            if (currentSessionId === id) {
              setMessages([]);
              setCurrentSessionId(null);
            }
          }}
          onRenameSession={(id, newTitle) => {
            setChatSessions(prev => prev.map(s => s.sessionId === id ? { ...s, title: newTitle } : s));
          }}
          t={t}
        />

        <FAFSAChecklist
          t={t}
          isOpen={showChecklist}
          onClose={() => setShowChecklist(false)}
        />

        <ScrollToBottom isDarkMode={isDarkMode} hasMessages={messages.length > 0} onScrollToBottom={scrollToBottom} />
      </div>
    </>
  );
};

export default EducateFirstAI;
