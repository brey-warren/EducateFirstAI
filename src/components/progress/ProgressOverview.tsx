import React from 'react';
import { ProgressService } from '../../services/progress';
import './ProgressOverview.css';

interface ProgressOverviewProps {
  stats: {
    totalSections: number;
    completedSections: number;
    remainingSections: number;
    completionPercentage: number;
  };
  nextSection: string | null;
  onNextSectionClick?: (section: string) => void;
}

export const ProgressOverview: React.FC<ProgressOverviewProps> = ({
  stats,
  nextSection,
  onNextSectionClick
}) => {
  const { completionPercentage, completedSections, totalSections } = stats;

  return (
    <div className="progress-overview">
      <div className="progress-circle-container">
        <div className="progress-circle">
          <svg viewBox="0 0 100 100" className="progress-ring">
            <circle
              cx="50"
              cy="50"
              r="45"
              className="progress-ring-background"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              className="progress-ring-progress"
              style={{
                strokeDasharray: `${completionPercentage * 2.827} 282.7`,
              }}
            />
          </svg>
          <div className="progress-text">
            <span className="progress-percentage">{completionPercentage}%</span>
            <span className="progress-label">Complete</span>
          </div>
        </div>
      </div>

      <div className="progress-summary">
        <h3>FAFSA Application Progress</h3>
        <p className="progress-description">
          You've completed {completedSections} of {totalSections} sections.
          {completionPercentage === 100 
            ? ' Congratulations! Your FAFSA is ready for review.'
            : ` Keep going - you're ${completionPercentage}% of the way there!`
          }
        </p>

        {nextSection && (
          <div className="next-section">
            <p className="next-section-label">Next up:</p>
            <button
              className="next-section-button"
              onClick={() => onNextSectionClick?.(nextSection)}
            >
              {ProgressService.formatSectionName(nextSection)}
            </button>
          </div>
        )}

        {completionPercentage === 100 && (
          <div className="completion-message">
            <div className="completion-icon">🎉</div>
            <p>
              Great job! You've completed all FAFSA sections. 
              Review your information and submit your application.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};