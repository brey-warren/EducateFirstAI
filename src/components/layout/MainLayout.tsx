import React, { useState, useEffect } from 'react';
import { ImprovedChatInterface } from '../chat/ImprovedChatInterface';
import { ProgressDashboard } from '../progress/ProgressDashboard';
import { ConversationManager } from '../chat/ConversationManager';
import { LandingScreen } from '../landing/LandingScreen';
import { useAuth } from '../../hooks/useAuth';
import { useAccessibility } from '../../hooks/useAccessibility';
import { AuthModal } from '../auth/AuthModal';
import './MainLayout.css';

interface MainLayoutProps {
  className?: string;
}

type ViewMode = 'chat' | 'progress' | 'conversations';

export const MainLayout: React.FC<MainLayoutProps> = ({ className = '' }) => {
  const { user, signOut } = useAuth();
  const { announce } = useAccessibility({ announceChanges: true });
  
  const [currentView, setCurrentView] = useState<ViewMode>('chat');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  // Announce view changes for screen readers
  useEffect(() => {
    const viewNames = {
      chat: 'Chat Interface',
      progress: 'Progress Dashboard',
      conversations: 'Conversation Manager'
    };
    announce(`Switched to ${viewNames[currentView]}`, 'polite');
  }, [currentView, announce]);

  const handleViewChange = (view: ViewMode) => {
    setCurrentView(view);
  };

  const handleSectionSelect = (section: string) => {
    setSelectedSection(section);
    // Switch to chat view when a section is selected from progress
    if (currentView === 'progress') {
      setCurrentView('chat');
      announce(`Switched to chat to discuss ${section}`, 'polite');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setCurrentView('chat'); // Reset to chat view after sign out
      announce('Signed out successfully', 'polite');
    } catch (error) {
      console.error('Sign out error:', error);
      announce('Failed to sign out', 'assertive');
    }
  };

  // Show landing screen if no user is authenticated
  if (!user) {
    return <LandingScreen onGetStarted={() => {
      // This will be called after successful authentication or guest mode
      announce('Welcome to EducateFirstAI', 'polite');
    }} />;
  }

  return (
    <div className={`main-layout ${className}`}>
      {/* Navigation Header */}
      <header className="main-header" role="banner">
        <div className="header-content">
          <div className="app-branding">
            <h1>EducateFirstAI</h1>
            <p className="app-tagline">Your FAFSA Assistant</p>
          </div>

          {/* Navigation */}
          <nav className="main-navigation" role="navigation" aria-label="Main navigation">
            <div className="nav-buttons" role="tablist">
              <button
                role="tab"
                aria-selected={currentView === 'chat'}
                aria-controls="chat-panel"
                onClick={() => handleViewChange('chat')}
                className={`nav-button ${currentView === 'chat' ? 'active' : ''}`}
              >
                <span aria-hidden="true">💬</span>
                Chat
              </button>
              
              {user && !user.isGuest && (
                <>
                  <button
                    role="tab"
                    aria-selected={currentView === 'progress'}
                    aria-controls="progress-panel"
                    onClick={() => handleViewChange('progress')}
                    className={`nav-button ${currentView === 'progress' ? 'active' : ''}`}
                  >
                    <span aria-hidden="true">📊</span>
                    Progress
                  </button>
                  
                  <button
                    role="tab"
                    aria-selected={currentView === 'conversations'}
                    aria-controls="conversations-panel"
                    onClick={() => handleViewChange('conversations')}
                    className={`nav-button ${currentView === 'conversations' ? 'active' : ''}`}
                  >
                    <span aria-hidden="true">📝</span>
                    History
                  </button>
                </>
              )}
            </div>
          </nav>

          {/* User Actions */}
          <div className="user-actions">
            {user ? (
              <div className="user-menu">
                <span className="user-info">
                  {user.isGuest ? (
                    <span className="guest-indicator">Guest Mode</span>
                  ) : (
                    <span className="user-email">{user.email}</span>
                  )}
                </span>
                
                {user.isGuest ? (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="auth-button sign-in"
                  >
                    Sign In
                  </button>
                ) : (
                  <button
                    onClick={handleSignOut}
                    className="auth-button sign-out"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="auth-button sign-in"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content" role="main">
        {/* Chat View */}
        <div
          id="chat-panel"
          role="tabpanel"
          aria-labelledby="chat-tab"
          className={`content-panel ${currentView === 'chat' ? 'active' : 'hidden'}`}
          aria-hidden={currentView !== 'chat'}
        >
          <ImprovedChatInterface 
            className="main-chat-interface"
            initialSection={selectedSection}
          />
        </div>

        {/* Progress View */}
        {user && !user.isGuest && (
          <div
            id="progress-panel"
            role="tabpanel"
            aria-labelledby="progress-tab"
            className={`content-panel ${currentView === 'progress' ? 'active' : 'hidden'}`}
            aria-hidden={currentView !== 'progress'}
          >
            <ProgressDashboard 
              className="main-progress-dashboard"
              onSectionSelect={handleSectionSelect}
            />
          </div>
        )}

        {/* Conversations View */}
        {user && !user.isGuest && (
          <div
            id="conversations-panel"
            role="tabpanel"
            aria-labelledby="conversations-tab"
            className={`content-panel ${currentView === 'conversations' ? 'active' : 'hidden'}`}
            aria-hidden={currentView !== 'conversations'}
          >
            <ConversationManager 
              className="main-conversation-manager"
            />
          </div>
        )}
      </main>

      {/* Authentication Modal */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {/* Footer */}
      <footer className="main-footer" role="contentinfo">
        <div className="footer-content">
          <p className="footer-text">
            EducateFirstAI helps you understand FAFSA forms and financial aid processes.
            <br />
            <small>
              Always verify information with official sources like{' '}
              <a 
                href="https://studentaid.gov" 
                target="_blank" 
                rel="noopener noreferrer"
                className="external-link"
              >
                StudentAid.gov
              </a>
            </small>
          </p>
          
          <div className="footer-links">
            <a href="#privacy" className="footer-link">Privacy Policy</a>
            <a href="#terms" className="footer-link">Terms of Service</a>
            <a href="#accessibility" className="footer-link">Accessibility</a>
          </div>
        </div>
      </footer>
    </div>
  );
};