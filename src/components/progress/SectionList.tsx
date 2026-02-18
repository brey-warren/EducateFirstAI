import React from 'react';
import { UserProgress } from '../../types/progress';
import { ProgressService } from '../../services/progress';
import './SectionList.css';

interface SectionListProps {
  progress: UserProgress | null;
  selectedSection: string | null;
  onSectionToggle: (section: string, completed: boolean) => void;
  onSectionSelect: (section: string) => void;
  isLoading: boolean;
}

export const SectionList: React.FC<SectionListProps> = ({
  progress,
  selectedSection,
  onSectionToggle,
  onSectionSelect,
  isLoading
}) => {
  const sections = [
    'student-demographics',
    'dependency-status',
    'student-finances',
    'parent-finances',
    'school-selection',
    'review-submit'
  ];

  const getSectionStatus = (section: string): 'completed' | 'in-progress' | 'not-started' => {
    if (!progress) return 'not-started';
    
    if (progress.completedSections.includes(section)) {
      return 'completed';
    }
    
    if (progress.currentSection === section) {
      return 'in-progress';
    }
    
    return 'not-started';
  };

  const getSectionProgress = (section: string): number => {
    if (!progress || !progress.sections[section]) return 0;
    return progress.sections[section]?.progress || 0;
  };

  const handleSectionClick = (section: string) => {
    onSectionSelect(section);
  };

  const handleToggleComplete = (section: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isCompleted = progress?.completedSections.includes(section) || false;
    onSectionToggle(section, !isCompleted);
  };

  return (
    <div className="section-list">
      <h3>FAFSA Sections</h3>
      
      <div className="sections">
        {sections.map((section, index) => {
          const status = getSectionStatus(section);
          const sectionProgress = getSectionProgress(section);
          const isSelected = selectedSection === section;
          const isCompleted = status === 'completed';
          
          return (
            <div
              key={section}
              className={`section-item ${status} ${isSelected ? 'selected' : ''}`}
              onClick={() => handleSectionClick(section)}
            >
              <div className="section-number">
                {status === 'completed' ? '✓' : index + 1}
              </div>
              
              <div className="section-content">
                <div className="section-header">
                  <h4 className="section-title">
                    {ProgressService.formatSectionName(section)}
                  </h4>
                  <div className="section-actions">
                    <button
                      className={`toggle-complete ${isCompleted ? 'completed' : ''}`}
                      onClick={(e) => handleToggleComplete(section, e)}
                      disabled={isLoading}
                      title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {isCompleted ? '✓' : '○'}
                    </button>
                  </div>
                </div>
                
                <p className="section-description">
                  {ProgressService.getSectionDescription(section)}
                </p>
                
                {sectionProgress > 0 && sectionProgress < 100 && (
                  <div className="section-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${sectionProgress}%` }}
                      />
                    </div>
                    <span className="progress-text">{sectionProgress}% complete</span>
                  </div>
                )}
                
                <div className="section-status">
                  <span className={`status-badge ${status}`}>
                    {status === 'completed' && 'Completed'}
                    {status === 'in-progress' && 'In Progress'}
                    {status === 'not-started' && 'Not Started'}
                  </span>
                  
                  {progress?.sections[section]?.lastUpdated && (
                    <span className="last-updated">
                      Updated {new Date(progress.sections[section]?.lastUpdated || Date.now()).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};