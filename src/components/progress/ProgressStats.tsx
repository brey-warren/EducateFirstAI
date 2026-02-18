import React from 'react';
import { UserProgress } from '../../types/progress';
import './ProgressStats.css';

interface ProgressStatsProps {
  progress: UserProgress | null;
  stats: {
    totalSections: number;
    completedSections: number;
    remainingSections: number;
    completionPercentage: number;
  };
}

export const ProgressStats: React.FC<ProgressStatsProps> = ({ progress, stats }) => {
  if (!progress) {
    return null;
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="progress-stats">
      <h3>Progress Statistics</h3>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <span className="stat-value">{stats.completionPercentage}%</span>
            <span className="stat-label">Overall Progress</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <span className="stat-value">{stats.completedSections}</span>
            <span className="stat-label">Sections Complete</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <span className="stat-value">{stats.remainingSections}</span>
            <span className="stat-label">Sections Remaining</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💬</div>
          <div className="stat-content">
            <span className="stat-value">{progress.totalInteractions}</span>
            <span className="stat-label">AI Interactions</span>
          </div>
        </div>
      </div>

      <div className="progress-metadata">
        <div className="metadata-item">
          <span className="metadata-label">Last Updated:</span>
          <span className="metadata-value">{formatDate(progress.lastUpdated)}</span>
        </div>
        
        {progress.currentSection && (
          <div className="metadata-item">
            <span className="metadata-label">Current Section:</span>
            <span className="metadata-value">{progress.currentSection}</span>
          </div>
        )}
      </div>
    </div>
  );
};