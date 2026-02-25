import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';

// Test wrapper with ThemeProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider>
    {children}
  </ThemeProvider>
);

describe('App', () => {
  it('renders EducateFirstAI brand name', () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );
    // Look for the brand name in the landing screen
    const brandName = screen.getByText('EducateFirstAI');
    expect(brandName).toBeInTheDocument();
  });

  it('renders welcome message', () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );
    const message = screen.getByText(/your friendly fafsa guide/i);
    expect(message).toBeInTheDocument();
  });
});