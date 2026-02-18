import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useProgress } from '../../hooks/useProgress';
import { ProgressService } from '../../services/progress';
import { ProgressOverview } from './ProgressOverview';
import { SectionList } from './SectionList';
import { ProgressStats } from './ProgressStats';
import './ProgressDashboard.css';

interface ProgressDashboardProps {
  className?: string;
  onSectionSelect?: (section: string) => void;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ 
  className = '',
  onSectionSelect 
}) => {
  const { user } = useAuth();
  const {
    progress,
    isLoading,
    error,
    markSectionComplete,
    markSectionIncomplete,
    getProgressStats,
    getNextRecommendedSection,
    clearError,
    refreshProgress,
  } = useProgress({ user: user || undefined });

  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  // Don't show dashboard for guest users
  if (!user || user.isGuest) {
    return (
      <div className={`progress-dashboard guest-message ${className}`}>
        <div className="guest-notice">
          <h3>Track Your FAFSA Progress</h3>
          <p>Sign up or log in to track your progress through the FAFSA application process.</p>
          <p>We'll help you keep track of completed sections and guide you through the remaining steps.</p>
        </div>
      </div>
    );
  }

  const handleSectionToggle = async (section: string, completed: boolean) => {
    try {
      if (completed) {
        await markSectionComplete(section);
      } else {
        await markSectionIncomplete(section);
      }
    } catch (err) {
      console.error('Failed to update section:', err);
    }
  };

  const handleSectionSelect = (section: string) => {
    setSelectedSection(section);
    onSectionSelect?.(section);
  };

  const handleRefresh = async () => {
    await refreshProgress();
  };

  const progressStats = getProgressStats();
  const nextSection = getNextRecommendedSection();

  if (isLoading && !progress) {
    return (
      <div className={`progress-dashboard loading ${className}`}>
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`progress-dashboard ${className}`}>
      <div className="dashboard-header">
        <h2>Your FAFSA Progress</h2>
        <div className="dashboard-actions">
          <button 
            onClick={handleRefresh}
            className="refresh-button"
            disabled={isLoading}
            title="Refresh progress"
          >
            🔄
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <div className="error-content">
            <span className="error-message">{error}</span>
            <button onClick={clearError} className="dismiss-button">
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="dashboard-content">
        <ProgressOverview 
          stats={progressStats}
          nextSection={nextSection}
          onNextSectionClick={handleSectionSelect}
        />

        <ProgressStats 
          progress={progress}
          stats={progressStats}
        />

        <SectionList
          progress={progress}
          selectedSection={selectedSection}
          onSectionToggle={handleSectionToggle}
          onSectionSelect={handleSectionSelect}
          isLoading={isLoading}
        />
      </div>

      {nextSection && (
        <div className="next-steps">
          <h3>Next Steps</h3>
          <div className="next-section-card">
            <div className="section-info">
              <h4>{ProgressService.formatSectionName(nextSection)}</h4>
              <p>{ProgressService.getSectionDescription(nextSection)}</p>
            </div>
            <button 
              onClick={() => handleSectionSelect(nextSection)}
              className="continue-button"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};