import React, { useState } from 'react';
import { DetectedError } from '../../types/errors';
import { ErrorWarning } from './ErrorWarning';
import './ErrorList.css';

interface ErrorListProps {
  errors: DetectedError[];
  warnings: DetectedError[];
  title?: string;
  maxVisible?: number;
  onDismissError?: (errorId: string) => void;
  className?: string;
}

export const ErrorList: React.FC<ErrorListProps> = ({
  errors,
  warnings,
  title = 'FAFSA Issues Detected',
  maxVisible = 3,
  onDismissError,
  className = ''
}) => {
  const [showAll, setShowAll] = useState(false);
  const [dismissedErrors, setDismissedErrors] = useState<Set<string>>(new Set());

  const allIssues = [...errors, ...warnings];
  const visibleIssues = allIssues.filter(issue => !dismissedErrors.has(issue.patternId));
  const displayedIssues = showAll ? visibleIssues : visibleIssues.slice(0, maxVisible);
  const hasMoreIssues = visibleIssues.length > maxVisible;

  const handleDismiss = (errorId: string) => {
    setDismissedErrors(prev => new Set([...prev, errorId]));
    onDismissError?.(errorId);
  };

  if (visibleIssues.length === 0) {
    return null;
  }

  const criticalCount = errors.filter(e => !dismissedErrors.has(e.patternId)).length;
  const warningCount = warnings.filter(w => !dismissedErrors.has(w.patternId)).length;

  return (
    <div className={`error-list ${className}`}>
      <div className="error-list-header">
        <h3 className="error-list-title">{title}</h3>
        <div className="error-list-summary">
          {criticalCount > 0 && (
            <span className="error-count critical">
              🚨 {criticalCount} critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="error-count warning">
              ⚠️ {warningCount} warnings
            </span>
          )}
        </div>
      </div>

      <div className="error-list-content">
        {displayedIssues.map((issue, index) => (
          <ErrorWarning
            key={`${issue.patternId}-${index}`}
            error={issue}
            onDismiss={handleDismiss}
          />
        ))}
      </div>

      {hasMoreIssues && !showAll && (
        <button
          className="error-list-toggle"
          onClick={() => setShowAll(true)}
        >
          Show {visibleIssues.length - maxVisible} more issues
        </button>
      )}

      {showAll && hasMoreIssues && (
        <button
          className="error-list-toggle"
          onClick={() => setShowAll(false)}
        >
          Show fewer issues
        </button>
      )}

      {criticalCount > 0 && (
        <div className="error-list-footer">
          <p className="error-list-note">
            <strong>Note:</strong> Critical issues must be resolved before submitting your FAFSA.
          </p>
        </div>
      )}
    </div>
  );
};