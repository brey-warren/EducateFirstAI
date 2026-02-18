import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { validateEmail } from '../../utils/validation';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToSignUp?: () => void;
  onSwitchToForgotPassword?: () => void;
  onContinueAsGuest?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onSwitchToSignUp,
  onSwitchToForgotPassword,
  onContinueAsGuest,
}) => {
  const { signIn, continueAsGuest, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate email
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.success) {
      newErrors.email = emailValidation.error || 'Invalid email';
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await signIn(formData);
      onSuccess?.();
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : 'Failed to sign in' });
    }
  };

  const handleGuestMode = async () => {
    try {
      await continueAsGuest();
      onContinueAsGuest?.();
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : 'Failed to continue as guest' });
    }
  };

  return (
    <div className={`auth-form ${isLoading ? 'loading' : ''}`}>
      <h2>Welcome Back</h2>
      <p>Sign in to your account to continue your FAFSA journey</p>
      
      {errors.general && (
        <div className="error-message" role="alert">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
          <label htmlFor="login-email">Email Address</label>
          <input
            type="email"
            id="login-email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            disabled={isLoading}
            placeholder="Enter your email"
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            aria-invalid={!!errors.email}
            autoComplete="email"
            required
          />
          {errors.email && (
            <div id="login-email-error" className="field-error" role="alert">
              {errors.email}
            </div>
          )}
        </div>

        <div className={`form-group ${errors.password ? 'has-error' : ''}`}>
          <label htmlFor="login-password">Password</label>
          <input
            type="password"
            id="login-password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            disabled={isLoading}
            placeholder="Enter your password"
            aria-describedby={errors.password ? 'login-password-error' : undefined}
            aria-invalid={!!errors.password}
            autoComplete="current-password"
            required
          />
          {errors.password && (
            <div id="login-password-error" className="field-error" role="alert">
              {errors.password}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="primary-button"
          aria-describedby="login-submit-help"
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>
        <div id="login-submit-help" className="field-help">
          {isLoading ? 'Please wait while we sign you in...' : 'Click to sign in to your account'}
        </div>
      </form>

      <div className="auth-links">
        <button
          type="button"
          onClick={onSwitchToForgotPassword}
          className="link-button"
          disabled={isLoading}
        >
          Forgot your password?
        </button>
        
        <button
          type="button"
          onClick={onSwitchToSignUp}
          className="link-button"
          disabled={isLoading}
        >
          Don't have an account? Create one
        </button>
        
        <button
          type="button"
          onClick={handleGuestMode}
          className="secondary-button"
          disabled={isLoading}
        >
          Continue as Guest
        </button>
      </div>
    </div>
  );
};