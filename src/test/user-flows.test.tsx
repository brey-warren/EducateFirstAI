/**
 * User Flow Integration Tests
 * Tests complete user journeys with simplified mocking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MainLayout } from '../components/layout/MainLayout';
import { AuthProvider } from '../components/AuthProvider';
import { ChatProvider } from '../contexts/ChatContext';

// Simple test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    <ChatProvider>
      {children}
    </ChatProvider>
  </AuthProvider>
);

// Mock all services with simple implementations
vi.mock('../services/auth', () => ({
  AuthService: {
    getCurrentUser: vi.fn(() => null),
    getCurrentTokens: vi.fn(() => null),
    isAuthenticated: vi.fn(() => false),
    isGuest: vi.fn(() => false),
    continueAsGuest: vi.fn(() => Promise.resolve({
      user: {
        userId: 'guest_123',
        email: null,
        isGuest: true,
      },
    })),
    signIn: vi.fn(() => Promise.resolve({
      user: {
        userId: 'user_123',
        email: 'test@example.com',
        isGuest: false,
      },
      tokens: {
        accessToken: 'mock_token',
        idToken: 'mock_id_token',
      },
    })),
    signUp: vi.fn(),
    signOut: vi.fn(),
    forgotPassword: vi.fn(),
  },
}));

vi.mock('../services/chat', () => ({
  ChatService: {
    sendMessage: vi.fn(() => Promise.resolve({
      message: {
        id: 'msg_123',
        content: 'Hello! I can help you with FAFSA questions.',
        sender: 'ai',
        timestamp: new Date(),
      },
      sources: [],
    })),
    getConversations: vi.fn(() => Promise.resolve([])),
    getMessages: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock('../services/progress', () => ({
  ProgressService: {
    getUserProgress: vi.fn(() => Promise.resolve({
      userId: 'user_123',
      exploredSections: [],
      totalInteractions: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    updateProgress: vi.fn(),
  },
}));

vi.mock('../services/errorDetection', () => ({
  ErrorDetectionService: {
    detectErrors: vi.fn(() => ({ errors: [] })),
  },
}));

vi.mock('../services/privacy', () => ({
  PrivacyService: {
    detectAndSanitizePII: vi.fn((text) => ({
      sanitizedText: text,
      hasPII: false,
      detectedTypes: [],
    })),
  },
}));

vi.mock('../services/security', () => ({
  SecurityService: {
    getSecurityConfig: vi.fn(() => ({
      enforceHTTPS: true,
      securityHeaders: {},
    })),
  },
}));

vi.mock('../hooks/useErrorDetection', () => ({
  useErrorDetection: () => ({
    errors: [],
    isAnalyzing: false,
    analyzeText: vi.fn(),
    detectErrors: vi.fn(() => ({ errors: [] })),
  }),
}));

describe('User Flow Integration Tests', () => {
  beforeEach(() => {
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

    // Mock fetch
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: {} }),
    });
  });

  describe('Basic Application Loading', () => {
    it('should render the main application structure', async () => {
      render(
        <TestWrapper>
          <MainLayout />
        </TestWrapper>
      );

      // Check main application elements
      expect(screen.getByText('EducateFirstAI')).toBeInTheDocument();
      expect(screen.getByText('Your FAFSA Assistant')).toBeInTheDocument();
      
      // Check navigation
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /chat/i })).toBeInTheDocument();
      
      // Check main content area (use getAllByRole since there might be multiple main elements)
      const mainElements = screen.getAllByRole('main');
      expect(mainElements.length).toBeGreaterThan(0);
      
      // Check footer
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    it('should show guest mode by default', async () => {
      render(
        <TestWrapper>
          <MainLayout />
        </TestWrapper>
      );

      // Should show sign in button for guests
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      
      // Should show chat interface
      expect(screen.getByRole('application', { name: /fafsa assistant chat/i })).toBeInTheDocument();
    });
  });

  describe('Chat Interface Flow', () => {
    it('should allow users to interact with the chat interface', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <MainLayout />
        </TestWrapper>
      );

      // Find message input
      const messageInput = screen.getByPlaceholderText(/ask me about fafsa/i);
      expect(messageInput).toBeInTheDocument();

      // Type a message
      await user.type(messageInput, 'What is FAFSA?');
      
      // Check that text was entered
      expect(messageInput).toHaveValue('What is FAFSA?');
      
      // Send button should be enabled
      const sendButton = screen.getByRole('button', { name: /send message/i });
      expect(sendButton).not.toBeDisabled();
    });

    it('should handle message sending', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <MainLayout />
        </TestWrapper>
      );

      const messageInput = screen.getByPlaceholderText(/ask me about fafsa/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });

      // Type and send a message
      await user.type(messageInput, 'Test message');
      await user.click(sendButton);

      // Input should be cleared after sending
      await waitFor(() => {
        expect(messageInput).toHaveValue('');
      });
    });
  });

  describe('Navigation Flow', () => {
    it('should handle tab navigation', async () => {
      render(
        <TestWrapper>
          <MainLayout />
        </TestWrapper>
      );

      // Should start on chat tab
      const chatTab = screen.getByRole('tab', { name: /chat/i });
      expect(chatTab).toHaveAttribute('aria-selected', 'true');

      // Should show chat panel
      const chatPanel = screen.getByRole('tabpanel');
      expect(chatPanel).toHaveAttribute('id', 'chat-panel');
      expect(chatPanel).toHaveAttribute('aria-hidden', 'false');
    });
  });

  describe('Accessibility Flow', () => {
    it('should provide proper ARIA structure', () => {
      render(
        <TestWrapper>
          <MainLayout />
        </TestWrapper>
      );

      // Check ARIA landmarks
      const banners = screen.getAllByRole('banner');
      expect(banners.length).toBeGreaterThan(0);
      
      const mainElements = screen.getAllByRole('main');
      expect(mainElements.length).toBeGreaterThan(0);
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();

      // Check tab structure
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      const chatTab = screen.getByRole('tab', { name: /chat/i });
      expect(chatTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <MainLayout />
        </TestWrapper>
      );

      // Should be able to focus on interactive elements
      const chatTab = screen.getByRole('tab', { name: /chat/i });
      chatTab.focus();
      
      expect(document.activeElement).toBe(chatTab);

      // Tab to next element
      await user.keyboard('{Tab}');
      
      // Should move focus to next interactive element
      expect(document.activeElement).not.toBe(chatTab);
    });
  });

  describe('Error Handling Flow', () => {
    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock network error
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <MainLayout />
        </TestWrapper>
      );

      const messageInput = screen.getByPlaceholderText(/ask me about fafsa/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });

      // Try to send a message
      await user.type(messageInput, 'Test message');
      await user.click(sendButton);

      // Should show some kind of error indication
      // (The exact error handling depends on implementation)
      await waitFor(() => {
        // Check that the input is re-enabled or error is shown
        expect(messageInput).not.toBeDisabled();
      });
    });
  });

  describe('Responsive Design Flow', () => {
    it('should have responsive design classes', () => {
      render(
        <TestWrapper>
          <MainLayout />
        </TestWrapper>
      );

      // Check that main layout has proper CSS classes
      const mainLayout = document.querySelector('.main-layout');
      expect(mainLayout).toBeInTheDocument();
      
      // Check that header has proper structure
      const header = document.querySelector('.main-header');
      expect(header).toBeInTheDocument();
      
      // Check that content area exists
      const content = document.querySelector('.main-content');
      expect(content).toBeInTheDocument();
    });
  });

  describe('External Links Flow', () => {
    it('should have proper external links', () => {
      render(
        <TestWrapper>
          <MainLayout />
        </TestWrapper>
      );

      // Should have external links in footer
      const studentAidLink = screen.getByRole('link', { name: /studentaid\.gov/i });
      expect(studentAidLink).toBeInTheDocument();
      expect(studentAidLink).toHaveAttribute('target', '_blank');
      expect(studentAidLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Form Validation Flow', () => {
    it('should handle empty message validation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <MainLayout />
        </TestWrapper>
      );

      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      // Send button should be disabled when input is empty
      expect(sendButton).toBeDisabled();

      const messageInput = screen.getByPlaceholderText(/ask me about fafsa/i);
      
      // Type something
      await user.type(messageInput, 'Hello');
      
      // Send button should be enabled
      expect(sendButton).not.toBeDisabled();
      
      // Clear the input
      await user.clear(messageInput);
      
      // Send button should be disabled again
      expect(sendButton).toBeDisabled();
    });
  });

  describe('Component Integration Flow', () => {
    it('should integrate all major components', () => {
      render(
        <TestWrapper>
          <MainLayout />
        </TestWrapper>
      );

      // Should have chat interface (visible by default)
      expect(screen.getByRole('application', { name: /fafsa assistant chat/i })).toBeInTheDocument();
      
      // Should have message input
      expect(screen.getByPlaceholderText(/ask me about fafsa/i)).toBeInTheDocument();
      
      // Should have send button
      expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
      
      // Should have clear button
      expect(screen.getByRole('button', { name: /clear current conversation/i })).toBeInTheDocument();
    });
  });
});