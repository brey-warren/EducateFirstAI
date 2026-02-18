import React from 'react';
import { AppError, ErrorNotification, ErrorSeverity, ErrorType } from '../../utils/errorHandling';
import './ErrorDisplay.css';

interface ErrorDisplayProps {
  error: AppError;
  onRetry?: () => void;
  onDismiss?: () => void;
  showRetry?: boolean;
  showDismiss?: boolean;
  compact?: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  showRetry = false,
  showDismiss = true,
  compact = false,
}) => {
  const userMessage = ErrorNotification.getUserMessage(error);
  const suggestions = ErrorNotification.getRecoverySuggestions(error);

  const getErrorIcon = () => {
    switch (error.type) {
      case ErrorType.NETWORK_ERROR:
        return '🌐';
      case ErrorType.SERVICE_UNAVAILABLE:
        return '⚠️';
      case ErrorType.AUTHENTICATION_ERROR:
        return '🔒';
      case ErrorType.VALIDATION_ERROR:
        return '❌';
      case ErrorType.RATE_LIMIT_ERROR:
        return '⏱️';
      case ErrorType.TIMEOUT_ERROR:
        return '⏰';
      default:
        return '❗';
    }
  };

  const getSeverityClass = () => {
    switch (error.severity) {
      case ErrorSeverity.LOW:
        return 'error-display--low';
      case ErrorSeverity.MEDIUM:
        return 'error-display--medium';
      case ErrorSeverity.HIGH:
        return 'error-display--high';
      case ErrorSeverity.CRITICAL:
        return 'error-display--critical';
      default:
        return 'error-display--medium';
    }
  };

  if (compact) {
    return (
      <div className={`error-display error-display--compact ${getSeverityClass()}`}>
        <div className="error-display__content">
          <span className="error-display__icon" role="img" aria-label="Error">
            {getErrorIcon()}
          </span>
          <span className="error-display__message">{userMessage}</span>
          {showRetry && onRetry && (
            <button
              className="error-display__action error-display__action--retry"
              onClick={onRetry}
              aria-label="Retry operation"
            >
              Retry
            </button>
          )}
          {showDismiss && onDismiss && (
            <button
              className="error-display__action error-display__action--dismiss"
              onClick={onDismiss}
              aria-label="Dismiss error"
            >
              ×
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`error-display ${getSeverityClass()}`} role="alert">
      <div className="error-display__header">
        <span className="error-display__icon" role="img" aria-label="Error">
          {getErrorIcon()}
        </span>
        <h3 className="error-display__title">
          {error.severity === ErrorSeverity.CRITICAL ? 'Critical Error' : 'Something went wrong'}
        </h3>
      </div>

      <div className="error-display__content">
        <p className="error-display__message">{userMessage}</p>

        {suggestions.length > 0 && (
          <div className="error-display__suggestions">
            <h4 className="error-display__suggestions-title">Try these steps:</h4>
            <ul className="error-display__suggestions-list">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="error-display__suggestion">
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="error-display__actions">
          {showRetry && onRetry && (
            <button
              className="error-display__action error-display__action--retry"
              onClick={onRetry}
            >
              Try Again
            </button>
          )}
          {showDismiss && onDismiss && (
            <button
              className="error-display__action error-display__action--dismiss"
              onClick={onDismiss}
            >
              Dismiss
            </button>
          )}
        </div>

        {import.meta.env.DEV && (
          <details className="error-display__debug">
            <summary className="error-display__debug-summary">Debug Information</summary>
            <div className="error-display__debug-content">
              <p><strong>Type:</strong> {error.type}</p>
              <p><strong>Severity:</strong> {error.severity}</p>
              <p><strong>Technical Message:</strong> {error.technicalMessage}</p>
              <p><strong>Timestamp:</strong> {error.context.timestamp.toISOString()}</p>
              <p><strong>Action:</strong> {error.context.action}</p>
              {error.context.additionalData && (
                <pre className="error-display__debug-data">
                  {JSON.stringify(error.context.additionalData, null, 2)}
                </pre>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

// Network status indicator component
interface NetworkStatusProps {
  isOnline: boolean;
  onRetryConnection?: () => void;
  className?: string;
}

export const NetworkStatus: React.FC<NetworkStatusProps> = ({
  isOnline,
  onRetryConnection,
  className = '',
}) => {
  if (isOnline) {
    return null;
  }

  return (
    <div className={`network-status network-status--offline ${className}`} role="alert">
      <div className="network-status__content">
        <span className="network-status__icon" role="img" aria-label="Offline">
          📡
        </span>
        <span className="network-status__message">
          You're offline. Check your connection.
        </span>
        {onRetryConnection && (
          <button
            className="network-status__retry"
            onClick={onRetryConnection}
            aria-label="Test connection"
          >
            Test Connection
          </button>
        )}
      </div>
    </div>
  );
};

// Loading state with error fallback
interface LoadingWithErrorProps {
  isLoading: boolean;
  error: AppError | null;
  onRetry?: () => void;
  children: React.ReactNode;
  loadingText?: string;
}

export const LoadingWithError: React.FC<LoadingWithErrorProps> = ({
  isLoading,
  error,
  onRetry,
  children,
  loadingText = 'Loading...',
}) => {
  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={onRetry}
        showRetry={!!onRetry}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="loading-with-error" role="status" aria-live="polite">
        <div className="loading-with-error__spinner" aria-hidden="true">
          ⏳
        </div>
        <span className="loading-with-error__text">{loadingText}</span>
      </div>
    );
  }

  return <>{children}</>;
};