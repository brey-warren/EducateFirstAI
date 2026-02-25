import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import CopyButton from '../CopyButton';

// Mock translation function
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    copy: 'Copy',
    copied: 'Copied!',
  };
  return translations[key] || key;
});

// Mock clipboard API
const mockWriteText = vi.fn();
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
});

describe('CopyButton', () => {
  const defaultProps = {
    text: 'Sample text to copy',
    isDarkMode: false,
    t: mockT,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteText.mockResolvedValue(undefined);
  });

  it('renders copy button with correct text', () => {
    render(<CopyButton {...defaultProps} />);

    expect(screen.getByText('Copy')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('copies text to clipboard when clicked', async () => {
    render(<CopyButton {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockWriteText).toHaveBeenCalledWith('Sample text to copy');
  });

  it('shows "Copied!" feedback after successful copy', async () => {
    render(<CopyButton {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });

    // Should revert back to "Copy" after timeout
    await waitFor(() => {
      expect(screen.getByText('Copy')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles clipboard API failure gracefully', async () => {
    mockWriteText.mockRejectedValue(new Error('Clipboard not available'));

    render(<CopyButton {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Should still show the button and not crash
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('applies dark mode styling', () => {
    render(<CopyButton {...defaultProps} isDarkMode={true} />);

    const button = screen.getByRole('button');
    expect(button).toHaveStyle({ color: '#9CA3AF' }); // Correct dark mode color from component
  });

  it('applies light mode styling', () => {
    render(<CopyButton {...defaultProps} isDarkMode={false} />);

    const button = screen.getByRole('button');
    expect(button).toHaveStyle({ color: '#6B7280' }); // Correct light mode color
  });

  it('uses translation function for button text', () => {
    render(<CopyButton {...defaultProps} />);

    expect(mockT).toHaveBeenCalledWith('copy');
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });

  it('handles empty text gracefully', async () => {
    render(<CopyButton {...defaultProps} text="" />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockWriteText).toHaveBeenCalledWith('');
  });
});