import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { SignUpForm } from './SignUpForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import './Auth.css';

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'success';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleSuccess = (message?: string) => {
    if (message) {
      setSuccessMessage(message);
      setMode('success');
    } else {
      onClose();
    }
  };

  const handleGuestMode = () => {
    onClose();
  };

  const renderContent = () => {
    switch (mode) {
      case 'login':
        return (
          <LoginForm
            onSuccess={() => handleSuccess()}
            onSwitchToSignUp={() => setMode('signup')}
            onSwitchToForgotPassword={() => setMode('forgot-password')}
            onContinueAsGuest={handleGuestMode}
          />
        );
      
      case 'signup':
        return (
          <SignUpForm
            onSuccess={() => handleSuccess()}
            onSwitchToLogin={() => setMode('login')}
          />
        );
      
      case 'forgot-password':
        return (
          <ForgotPasswordForm
            onSuccess={(message) => handleSuccess(message)}
            onSwitchToLogin={() => setMode('login')}
          />
        );
      
      case 'success':
        return (
          <div className="auth-form">
            <div className="auth-success">
              <h2>✅ Success!</h2>
              <p>{successMessage}</p>
              <button
                onClick={() => setMode('login')}
                className="primary-button"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close modal"
        >
          ×
        </button>
        {renderContent()}
      </div>
    </div>
  );
};