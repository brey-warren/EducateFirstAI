import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import TypingMessage from '../TypingMessage';

// Mock ReactMarkdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

describe('TypingMessage', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders with initial empty text', () => {
    render(<TypingMessage content="Hello world" />);

    const markdown = screen.getByTestId('markdown');
    expect(markdown).toHaveTextContent('');
  });

  it('shows typing cursor initially', () => {
    render(<TypingMessage content="Hello world" />);

    const cursor = screen.getByText('|');
    expect(cursor).toBeInTheDocument();
    expect(cursor).toHaveStyle({ color: '#10B981' });
  });

  it('renders content through ReactMarkdown', () => {
    render(<TypingMessage content="**Bold**" />);

    const markdown = screen.getByTestId('markdown');
    expect(markdown).toBeInTheDocument();
  });

  it('handles empty content', () => {
    const onComplete = vi.fn();
    render(<TypingMessage content="" onComplete={onComplete} />);

    const markdown = screen.getByTestId('markdown');
    expect(markdown).toHaveTextContent('');
  });

  it('cleans up timer on unmount', () => {
    const { unmount } = render(<TypingMessage content="Hello" />);

    // Unmount component
    unmount();

    // Should not cause errors
    expect(() => vi.advanceTimersByTime(100)).not.toThrow();
  });

  it('accepts speed prop', () => {
    render(<TypingMessage content="Test" speed={10} />);

    // Should render without errors
    expect(screen.getByTestId('markdown')).toBeInTheDocument();
  });

  it('accepts onComplete callback', () => {
    const onComplete = vi.fn();
    render(<TypingMessage content="Test" onComplete={onComplete} />);

    // Should render without errors
    expect(screen.getByTestId('markdown')).toBeInTheDocument();
  });
});