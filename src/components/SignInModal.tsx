import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { signIn, signUp, confirmSignUp } from 'aws-amplify/auth';
import { TranslationKey } from '../translations';
import './SignInModal.css';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: (name: string) => void;
  t: (key: TranslationKey) => string;
}

const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose, onSignIn, t }) => {
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

  return ReactDOM.createPortal(
    <div 
      className="modal-overlay" 
      onClick={onClose}
    >
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>

        <div className="modal-header">
          <div className="modal-icon">🎓</div>
          <h2 className="modal-title">
            {needsConfirmation 
              ? t('checkYourEmail')
              : isSignUp ? t('createAccount') : t('welcomeBack')}
          </h2>
          <p className="modal-subtitle">
            {needsConfirmation 
              ? t('enterConfirmationCode')
              : isSignUp ? t('startJourney') : t('signInToSave')}
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
              <label className="form-label">{t('confirmationCode')}</label>
              <input
                type="text"
                className="form-input"
                placeholder={t('enterSixDigitCode')}
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? t('confirming') : t('confirmAndSignIn')}
            </button>
          </form>
        ) : (
          <form onSubmit={isSignUp ? handleSignUp : handleSignIn}>
            {isSignUp && (
              <div className="form-group">
                <label className="form-label">{t('yourName')}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('enterYourName')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">{t('emailAddress')}</label>
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
              <label className="form-label">{t('password')}</label>
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
              {loading ? t('pleaseWait') : isSignUp ? t('createAccount') : t('signIn')}
            </button>
          </form>
        )}

        {!needsConfirmation && (
          <>
            <div className="divider">
              <div className="divider-line" />
              <span className="divider-text">{t('or')}</span>
              <div className="divider-line" />
            </div>

            <button className="guest-button" onClick={onClose}>
              {t('continueAsGuest')}
            </button>

            <p className="switch-mode">
              {isSignUp ? t('haveAccount') : t('needAccount')}
              <button className="switch-mode-link" onClick={() => setIsSignUp(!isSignUp)}>
                {isSignUp ? t('signIn') : t('signUp')}
              </button>
            </p>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

export default SignInModal;
