import React, { useState } from 'react';
import { ChecklistItem } from '../../types/errors';
import './ChecklistDisplay.css';

interface ChecklistDisplayProps {
  items: ChecklistItem[];
  title?: string;
  section?: string;
  onItemComplete?: (itemId: string, completed: boolean) => void;
  completedItems?: Set<string>;
  className?: string;
}

export const ChecklistDisplay: React.FC<ChecklistDisplayProps> = ({
  items,
  title,
  section,
  onItemComplete,
  completedItems = new Set(),
  className = ''
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleItemToggle = (itemId: string, completed: boolean) => {
    onItemComplete?.(itemId, completed);
  };

  if (items.length === 0) {
    return null;
  }

  const requiredItems = items.filter(item => item.isRequired);
  const optionalItems = items.filter(item => !item.isRequired);
  const completedCount = items.filter(item => completedItems.has(item.id)).length;
  const progressPercentage = Math.round((completedCount / items.length) * 100);

  return (
    <div className={`checklist-display ${className}`}>
      <div className="checklist-header">
        <h3 className="checklist-title">
          {title || `${section ? section.replace('-', ' ') : 'FAFSA'} Checklist`}
        </h3>
        <div className="checklist-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="progress-text">
            {completedCount}/{items.length} completed ({progressPercentage}%)
          </span>
        </div>
      </div>

      {requiredItems.length > 0 && (
        <div className="checklist-section">
          <h4 className="checklist-section-title">
            <span className="required-indicator">*</span>
            Required Items
          </h4>
          <div className="checklist-items">
            {requiredItems.map(item => (
              <ChecklistItemComponent
                key={item.id}
                item={item}
                isCompleted={completedItems.has(item.id)}
                isExpanded={expandedItems.has(item.id)}
                onToggle={handleItemToggle}
                onExpand={toggleExpanded}
              />
            ))}
          </div>
        </div>
      )}

      {optionalItems.length > 0 && (
        <div className="checklist-section">
          <h4 className="checklist-section-title">Recommended Items</h4>
          <div className="checklist-items">
            {optionalItems.map(item => (
              <ChecklistItemComponent
                key={item.id}
                item={item}
                isCompleted={completedItems.has(item.id)}
                isExpanded={expandedItems.has(item.id)}
                onToggle={handleItemToggle}
                onExpand={toggleExpanded}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface ChecklistItemComponentProps {
  item: ChecklistItem;
  isCompleted: boolean;
  isExpanded: boolean;
  onToggle: (itemId: string, completed: boolean) => void;
  onExpand: (itemId: string) => void;
}

const ChecklistItemComponent: React.FC<ChecklistItemComponentProps> = ({
  item,
  isCompleted,
  isExpanded,
  onToggle,
  onExpand
}) => {
  return (
    <div className={`checklist-item ${isCompleted ? 'completed' : ''} ${item.isRequired ? 'required' : 'optional'}`}>
      <div className="checklist-item-header">
        <label className="checklist-item-main">
          <input
            type="checkbox"
            checked={isCompleted}
            onChange={(e) => onToggle(item.id, e.target.checked)}
            className="checklist-checkbox"
          />
          <div className="checklist-item-content">
            <h5 className="checklist-item-title">
              {item.title}
              {item.isRequired && <span className="required-indicator">*</span>}
            </h5>
            <p className="checklist-item-description">{item.description}</p>
          </div>
        </label>
        
        {(item.commonMistakes.length > 0 || item.tips.length > 0) && (
          <button
            className="checklist-expand-button"
            onClick={() => onExpand(item.id)}
            aria-label={isExpanded ? 'Hide details' : 'Show details'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="checklist-item-details">
          {item.commonMistakes.length > 0 && (
            <div className="checklist-mistakes">
              <h6>Common Mistakes:</h6>
              <ul>
                {item.commonMistakes.map((mistake, index) => (
                  <li key={index}>{mistake}</li>
                ))}
              </ul>
            </div>
          )}
          
          {item.tips.length > 0 && (
            <div className="checklist-tips">
              <h6>Tips:</h6>
              <ul>
                {item.tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
          
          {item.relatedFields && item.relatedFields.length > 0 && (
            <div className="checklist-related">
              <h6>Related Fields:</h6>
              <div className="related-fields">
                {item.relatedFields.map((field, index) => (
                  <span key={index} className="related-field">{field}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};