import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders FAFSA Assistant heading', () => {
    render(<App />);
    // Look for the visible heading in the chat interface
    const heading = screen.getByRole('heading', { name: 'FAFSA Assistant', level: 2 });
    expect(heading).toBeInTheDocument();
  });

  it('renders FAFSA assistance message', () => {
    render(<App />);
    const message = screen.getByText(/hi there! i'm here to help you with fafsa questions/i);
    expect(message).toBeInTheDocument();
  });
});