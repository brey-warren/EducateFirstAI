import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { validateEmail, validatePassword } from '../../utils/validation';

interface SignUpFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({
  onSuccess,
  onSwitchToLogin,
}) => {
  const { signUp, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
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
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.success) {
      newErrors.password = passwordValidation.error || 'Invalid password';
    }

    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await signUp({
        email: formData.email,
        password: formData.password,
      });
      onSuccess?.();
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : 'Failed to create account' });
    }
  };

  return (
    <div className={`auth-form ${isLoading ? 'loading' : ''}`}>
      <h2>Create Your Account</h2>
      <p>Join thousands of students getting help with their FAFSA</p>
      
      {errors.general && (
        <div className="error-message" role="alert">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
          <label htmlFor="signup-email">Email Address</label>
          <input
            type="email"
            id="signup-email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            disabled={isLoading}
            placeholder="Enter your email"
            aria-describedby={errors.email ? 'signup-email-error' : 'signup-email-help'}
            aria-invalid={!!errors.email}
            autoComplete="email"
            required
          />
          <div id="signup-email-help" className="field-help">
            We'll use this to send you important updates about your FAFSA
          </div>
          {errors.email && (
            <div id="signup-email-error" className="field-error" role="alert">
              {errors.email}
            </div>
          )}
        </div>

        <div className={`form-group ${errors.password ? 'has-error' : ''}`}>
          <label htmlFor="signup-password">Password</label>
          <input
            type="password"
            id="signup-password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            disabled={isLoading}
            placeholder="Create a strong password"
            aria-describedby={errors.password ? 'signup-password-error' : 'signup-password-help'}
            aria-invalid={!!errors.password}
            autoComplete="new-password"
            required
          />
          <div id="signup-password-help" className="field-help">
            Must be at least 8 characters with uppercase, lowercase, and numbers
          </div>
          {errors.password && (
            <div id="signup-password-error" className="field-error" role="alert">
              {errors.password}
            </div>
          )}
        </div>

        <div className={`form-group ${errors.confirmPassword ? 'has-error' : ''}`}>
          <label htmlFor="signup-confirm-password">Confirm Password</label>
          <input
            type="password"
            id="signup-confirm-password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            disabled={isLoading}
            placeholder="Confirm your password"
            aria-describedby={errors.confirmPassword ? 'signup-confirm-password-error' : undefined}
            aria-invalid={!!errors.confirmPassword}
            autoComplete="new-password"
            required
          />
          {errors.confirmPassword && (
            <div id="signup-confirm-password-error" className="field-error" role="alert">
              {errors.confirmPassword}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="primary-button"
          aria-describedby="signup-submit-help"
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
        <div id="signup-submit-help" className="field-help">
          {isLoading ? 'Please wait while we create your account...' : 'By creating an account, you agree to our terms of service'}
        </div>
      </form>

      <div className="auth-links">
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="link-button"
          disabled={isLoading}
        >
          Already have an account? Sign in
        </button>
      </div>
    </div>
  );
};