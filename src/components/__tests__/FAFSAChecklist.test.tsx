import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import FAFSAChecklist from '../FAFSAChecklist';
import { ThemeProvider } from '../../context/ThemeContext';

// Mock translation function
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    fafsaChecklist: 'FAFSA Checklist',
    trackProgress: 'Track your application progress',
    complete: 'Complete',
    resetProgress: 'Reset Progress',
    checklistStep1: 'Create StudentAid.gov Account',
    checklistStep1Desc: 'Student and parent each need their own account (FSA ID)',
    checklistStep2: 'Social Security Numbers',
    checklistStep2Desc: 'SSN for student and all contributors (parents)',
  };
  return translations[key] || key;
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider>
    {children}
  </ThemeProvider>
);

describe('FAFSAChecklist', () => {
  const defaultProps = {
    t: mockT,
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('renders checklist when open', () => {
    render(
      <TestWrapper>
        <FAFSAChecklist {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText(/FAFSA Checklist/)).toBeInTheDocument();
    expect(screen.getByText('Track your application progress')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <TestWrapper>
        <FAFSAChecklist {...defaultProps} isOpen={false} />
      </TestWrapper>
    );

    expect(screen.queryByText('FAFSA Checklist')).not.toBeInTheDocument();
  });

  it('displays all checklist items', () => {
    render(
      <TestWrapper>
        <FAFSAChecklist {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Create StudentAid.gov Account')).toBeInTheDocument();
    expect(screen.getByText('Social Security Numbers')).toBeInTheDocument();
  });

  it('toggles item completion when clicked', () => {
    render(
      <TestWrapper>
        <FAFSAChecklist {...defaultProps} />
      </TestWrapper>
    );

    const firstItem = screen.getByText('Create StudentAid.gov Account').closest('div');
    expect(firstItem).toBeInTheDocument();

    fireEvent.click(firstItem!);

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'fafsaChecklist',
      JSON.stringify(['fsaId'])
    );
  });

  it('calculates progress correctly', () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify(['fsaId', 'ssn']));

    render(
      <TestWrapper>
        <FAFSAChecklist {...defaultProps} />
      </TestWrapper>
    );

    // 2 out of 11 items = 18%
    expect(screen.getByText('18% Complete')).toBeInTheDocument();
  });

  it('resets progress when reset button clicked', () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify(['fsaId', 'ssn']));

    render(
      <TestWrapper>
        <FAFSAChecklist {...defaultProps} />
      </TestWrapper>
    );

    const resetButton = screen.getByText(/Reset Progress/);
    fireEvent.click(resetButton);

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'fafsaChecklist',
      JSON.stringify([])
    );
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(
      <TestWrapper>
        <FAFSAChecklist {...defaultProps} onClose={onClose} />
      </TestWrapper>
    );

    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when overlay clicked', () => {
    const onClose = vi.fn();
    render(
      <TestWrapper>
        <FAFSAChecklist {...defaultProps} onClose={onClose} />
      </TestWrapper>
    );

    const overlay = document.querySelector('[style*="position: fixed"]');
    expect(overlay).toBeInTheDocument();

    fireEvent.click(overlay!);
    expect(onClose).toHaveBeenCalled();
  });
});