import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AuthModal } from '../auth/AuthModal';
import './LandingScreen.css';

interface LandingScreenProps {
  onGetStarted?: () => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({ onGetStarted }) => {
  const { continueAsGuest } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinueAsGuest = async () => {
    setIsLoading(true);
    try {
      await continueAsGuest();
      onGetStarted?.();
    } catch (error) {
      console.error('Failed to continue as guest:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    setShowAuthModal(true);
  };

  return (
    <div className="landing-screen">
      <div className="landing-container">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-icon">
              🎓
            </div>
            <h1 className="hero-title">
              Welcome to <span className="brand-name">EducateFirstAI</span>
            </h1>
            <p className="hero-subtitle">
              Your intelligent FAFSA assistant powered by AI
            </p>
            <p className="hero-description">
              Get personalized help with your Free Application for Federal Student Aid (FAFSA). 
              Our AI assistant guides you through every step, answers your questions, and helps 
              you avoid common mistakes.
            </p>
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section">
          <h2 className="features-title">How We Help You Succeed</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3>AI-Powered Guidance</h3>
              <p>Ask questions in plain English and get clear, helpful answers about FAFSA requirements and processes.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">⚠️</div>
              <h3>Error Prevention</h3>
              <p>Avoid common FAFSA mistakes with real-time warnings and helpful suggestions as you work.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Progress Tracking</h3>
              <p>Keep track of which sections you've completed and what still needs attention.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Privacy First</h3>
              <p>Your personal information stays private. We don't store sensitive financial data.</p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="cta-section">
          <h2 className="cta-title">Ready to Get Started?</h2>
          <p className="cta-description">
            Choose how you'd like to begin your FAFSA journey
          </p>
          
          <div className="cta-buttons">
            <button
              onClick={handleSignIn}
              className="primary-cta-button"
              disabled={isLoading}
            >
              Sign In / Create Account
            </button>
            
            <button
              onClick={handleContinueAsGuest}
              className="secondary-cta-button"
              disabled={isLoading}
            >
              {isLoading ? 'Starting...' : 'Continue as Guest'}
            </button>
          </div>
          
          <p className="cta-note">
            <strong>Guest Mode:</strong> Try our assistant without creating an account. 
            Your progress won't be saved, but you can explore all features.
          </p>
        </section>

        {/* Trust Indicators */}
        <section className="trust-section">
          <div className="trust-content">
            <p className="trust-text">
              <strong>Official Information:</strong> All guidance is based on official federal student aid resources from{' '}
              <a 
                href="https://studentaid.gov" 
                target="_blank" 
                rel="noopener noreferrer"
                className="trust-link"
              >
                StudentAid.gov
              </a>
            </p>
            <div className="trust-badges">
              <div className="trust-badge">
                <span className="badge-icon">🛡️</span>
                <span className="badge-text">Secure & Private</span>
              </div>
              <div className="trust-badge">
                <span className="badge-icon">✅</span>
                <span className="badge-text">FERPA Compliant</span>
              </div>
              <div className="trust-badge">
                <span className="badge-icon">🎯</span>
                <span className="badge-text">Always Up-to-Date</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Authentication Modal */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode="login"
        />
      )}
    </div>
  );
};