import React, { useState, useEffect } from 'react';
import { signIn, signUp, confirmSignUp } from 'aws-amplify/auth';
import './SignInModal.css';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: (name: string) => void;
}

const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose, onSignIn }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn({ username: email, password });
      onSignIn(email.split('@')[0]);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            name: name,
          }
        }
      });
      setNeedsConfirmation(true);
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await confirmSignUp({ username: email, confirmationCode });
      // Auto sign in after confirmation
      await signIn({ username: email, password });
      onSignIn(name || email.split('@')[0]);
    } catch (err: any) {
      setError(err.message || 'Failed to confirm');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>

        <div className="modal-header">
          <div className="modal-icon">🎓</div>
          <h2 className="modal-title">
            {needsConfirmation 
              ? 'Check Your Email' 
              : isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="modal-subtitle">
            {needsConfirmation 
              ? 'Enter the confirmation code we sent you'
              : isSignUp ? 'Start your FAFSA journey' : 'Sign in to save progress'}
          </p>
        </div>

        {error && (
          <div style={{ 
            background: '#FEE2E2', 
            color: '#DC2626', 
            padding: '12px', 
            borderRadius: '8px', 
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {needsConfirmation ? (
          <form onSubmit={handleConfirmSignUp}>
            <div className="form-group">
              <label className="form-label">Confirmation Code</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter 6-digit code"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Confirming...' : 'Confirm & Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={isSignUp ? handleSignUp : handleSignIn}>
            {isSignUp && (
              <div className="form-group">
                <label className="form-label">Your Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>
        )}

        {!needsConfirmation && (
          <>
            <div className="divider">
              <div className="divider-line" />
              <span className="divider-text">or</span>
              <div className="divider-line" />
            </div>

            <button className="guest-button" onClick={onClose}>
              Continue as Guest
            </button>

            <p className="switch-mode">
              {isSignUp ? 'Have an account? ' : 'Need an account? '}
              <button className="switch-mode-link" onClick={() => setIsSignUp(!isSignUp)}>
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default SignInModal;
