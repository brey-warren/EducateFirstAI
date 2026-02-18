import React from 'react';
import { DetectedError } from '../../types/errors';
import { useAccessibility } from '../../hooks/useAccessibility';
import './ErrorWarning.css';

interface ErrorWarningProps {
  error: DetectedError;
  onDismiss?: (errorId: string) => void;
  className?: string;
}

export const ErrorWarning: React.FC<ErrorWarningProps> = ({ 
  error, 
  onDismiss, 
  className = '' 
}) => {
  const { announce } = useAccessibility();
  
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '💡';
    }
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error-critical';
      case 'warning': return 'error-warning';
      case 'info': return 'error-info';
      default: return 'error-info';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical': return 'Critical Issue';
      case 'warning': return 'Warning';
      case 'info': return 'Tip';
      default: return 'Information';
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss(error.patternId);
      announce(`${getSeverityLabel(error.severity)} dismissed`, 'polite');
    }
  };

  return (
    <div 
      className={`error-warning ${getSeverityClass(error.severity)} ${className}`}
      role="alert"
      aria-labelledby={`error-title-${error.patternId}`}
      aria-describedby={`error-solution-${error.patternId}`}
    >
      <div className="error-header">
        <div className="error-icon" aria-hidden="true">
          {getSeverityIcon(error.severity)}
        </div>
        <div className="error-content">
          <h4 id={`error-title-${error.patternId}`} className="error-title">
            {getSeverityLabel(error.severity)}
          </h4>
          <p className="error-message">{error.message}</p>
        </div>
        {onDismiss && (
          <button 
            className="error-dismiss"
            onClick={handleDismiss}
            aria-label={`Dismiss ${getSeverityLabel(error.severity).toLowerCase()}`}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>
      
      <div className="error-details">
        <div id={`error-solution-${error.patternId}`} className="error-solution">
          <strong>Solution:</strong> {error.solution}
        </div>
        
        {error.field && (
          <div className="error-field">
            <strong>Related to:</strong> {error.field}
          </div>
        )}
        
        <div className="error-meta">
          <span className="error-section">Section: {error.section}</span>
          <span className="error-confidence">
            Confidence: {Math.round(error.confidence * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};