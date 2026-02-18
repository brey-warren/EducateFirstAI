import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { validateEmail } from '../../utils/validation';

interface ForgotPasswordFormProps {
  onSuccess?: (message: string) => void;
  onSwitchToLogin?: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSuccess,
  onSwitchToLogin,
}) => {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    
    // Clear error when user starts typing
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.success) {
      newErrors.email = emailValidation.error || 'Invalid email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const message = await forgotPassword({ email });
      onSuccess?.(message);
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : 'Failed to process request' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`auth-form ${isLoading ? 'loading' : ''}`}>
      <h2>Reset Your Password</h2>
      <p>Enter your email address and we'll send you a password reset code to get back into your account.</p>
      
      {errors.general && (
        <div className="error-message" role="alert">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
          <label htmlFor="forgot-email">Email Address</label>
          <input
            type="email"
            id="forgot-email"
            name="email"
            value={email}
            onChange={handleInputChange}
            disabled={isLoading}
            placeholder="Enter your email"
            aria-describedby={errors.email ? 'forgot-email-error' : 'forgot-email-help'}
            aria-invalid={!!errors.email}
            autoComplete="email"
            required
          />
          <div id="forgot-email-help" className="field-help">
            We'll send reset instructions to this email address
          </div>
          {errors.email && (
            <div id="forgot-email-error" className="field-error" role="alert">
              {errors.email}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="primary-button"
          aria-describedby="forgot-submit-help"
        >
          {isLoading ? 'Sending Reset Code...' : 'Send Reset Code'}
        </button>
        <div id="forgot-submit-help" className="field-help">
          {isLoading ? 'Please wait while we send your reset code...' : 'Check your email after clicking send'}
        </div>
      </form>

      <div className="auth-links">
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="link-button"
          disabled={isLoading}
        >
          Remember your password? Sign in
        </button>
      </div>
    </div>
  );
};