/**
 * End-to-End Integration Tests for EducateFirstAI
 * Tests complete user journeys and component integration
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../components/AuthProvider';
import { ChatProvider } from '../contexts/ChatContext';
import { MainLayout } from '../components/layout/MainLayout';
import { AuthService } from '../services/auth';
import { ErrorBoundary } from '../components/errors/ErrorBoundary';

// Mock services
vi.mock('../services/auth');
vi.mock('../services/chat');
vi.mock('../services/progress');
vi.mock('../services/errorDetection');
vi.mock('../services/privacy');
vi.mock('../services/security');

const mockAuthService = vi.mocked(AuthService);

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary>
    <AuthProvider>
      <ChatProvider>
        {children}
      </ChatProvider>
    </AuthProvider>
  </ErrorBoundary>
);

describe('End-to-End Integration Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
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

    // Mock fetch for API calls
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Guest User Journey', () => {
    beforeEach(() => {
      // Mock guest user creation
      mockAuthService.continueAsGuest.mockResolvedValue({
        user: {
          userId: 'guest_123',
          email: null,
          isGuest: true,
        },
      });
    });

    it('should allow guest users to access chat interface', async () => {
      render(
        <TestWrapper>
          <MainLayout />
        </TestWrapper>
      );

      // Should show the main layout
      expect(screen.getByText('EducateFirstAI')).toBeInTheDocument();
      expect(screen.getByText('Your FAFSA Assistant')).toBeInTheDocument();

      // Should show guest mode indicator
      expect(screen.getByText('Guest Mode')).toBeInTheDocument();

      // Should show chat interface by default
      expect(screen.getByRole('application', { name: /fafsa assistant chat/i })).toBeInTheDocument();

      // Should not show progress or history tabs for guests
      expect(screen.queryByText('Progress')).not.toBeInTheDocument();
      expect(screen.queryByText('History')).not.toBeInTheDocument();
    });

    it('should allow guest users to send messages', async () => {
      const user = userEvent.setup();
      
      // Mock successful message sending
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            message: {
              id: 'msg_123',
              content: 'Hello! I can help you with FAFSA questions.',
              sender: 'ai',
              timestamp: new Date(),
            },
            sources: [],
          },
        }),
      });

      render(
        <TestWrapper>
          <MainLayout />
        </TestWrapper>
      );

      // Find and interact with message input
      const messageInput = screen.getByPlaceholderText(/ask me about fafsa/i);
      expect(messageInput).toBeInTheDocument();

      // Type a message
      await user.type(messageInput, 'What is FAFSA?');
      
      // Send the message
      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/sending/i)).toBeInTheDocument();
      });

      // Should show the response
      await waitFor(() => {
        expect(screen.getByText(/hello! i can help you with fafsa questions/i)).toBeInTheDocument();
      });
    });
  });

  describe('Authenticated User Journey', () => {
    const mockUser = {
      userId: 'user_123',
      email: 'test@example.com',
      isGuest: false,
    };

    beforeEach(() => {
      // Mock authenticated user
      mockAuthService.getCurrentUser.mockReturnValue(mockUser);
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.signIn.mockResolvedValue({
        user: mockUser,
        tokens: {
          accessToken: 'mock_access_token',
          idToken: 'mock_id_token',
        },
      });
    });

    it('should show all navigation options for authenticated users', async () => {
      render(
        <TestWrapper>
          <MainLayout />
        </TestWrapper>
      );

      // Should show user email
      expect(screen.getByText('test@example.com')).toBeInTheDocument();

      // Should show all navigation tabs
      expect(screen.getByRole('tab', { name: /chat/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /progress/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /history/i })).toBeInTheDocument();

      // Should show sign out button
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    });

    it('should allow navigation between different views', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <MainLayout />
        </TestWrapper>
      );

      // Start on chat view
      expect(screen.getByRole('tabpanel', { name: /chat/i })).toBeVisible();

      // Navigate to progress view
      const progressTab = screen.getByRole('tab', { name: /progress/i });
      await user.click(progressTab);

      await waitFor(() => {
        expect(screen.getByRole('tabpanel', { name: /progress/i })).toBeVisible();
      });

      // Navigate to history view
      const historyTab = screen.getByRole('tab', { name: /history/i });
      await user.click(historyTab);

      await waitFor(() => {
        expect(screen.getByRole('tabpanel', { name: /conversations/i })).toBeVisible();
      });
    });

    it('should integrate progress tracking with chat', async () => {
      const user = userEvent.setup();
      
      // Mock progress data
      const mockProgress = {
        userId: 'user_123',
        exploredSections: [
          {
            sectionId: 'student-demographics',
            questionsAsked: 3,
            lastVisited: new Date(),
            isComplete: false,
          },
        ],
        totalInteractions: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock progress service calls
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { progress: mockProgress },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              message: {
                id: 'msg_123',
                content: 'Let me help you with the Student Demographics section.',
                sender: 'ai',
                timestamp: new Date(),
              },
            },
          }),
        });

      render(
        <TestWrapper>
          <MainLayout />
        </TestWrapper>
      );

      // Navigate to progress view
      const progressTab = screen.getByRole('tab', { name: /progress/i });
      await user.click(progressTab);

      // Wait for progress to load
      await waitFor(() => {
        expect(screen.getByText(/your fafsa progress/i)).toBeInTheDocument();
      });

      // Click on a section to get help
      const sectionButton = screen.getByRole('button', { name: /student demographics/i });
      await user.click(sectionButton);

      // Should switch back to chat view
      await waitFor(() => {
        expect(screen.getByRole('tabpanel', { name: /chat/i })).toBeVisible();
      });

      // Should send a message about the selected section
      await waitFor(() => {
        expect(screen.getByText(/let me help you with the student demographics section/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock network error
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <MainLayout />
        </TestWrapper>
      );

      // Try to send a message
      const messageInput = screen.getByPlaceholderText(/ask me about fafsa/i);
      await user.type(messageInput, 'Test message');
      
      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      // Should show retry button
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should handle authentication errors', async () => {
      const user = userEvent.setup();
      
      // Mock authentication failure
      mockAuthService.signIn.mockRejectedValue(new Error('Invalid credentials'));

      render(
        <TestWrapper>
          <MainLayout />
        </TestWrapper>
      );

      // Click sign in button
      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      // Should show auth modal
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Fill in credentials
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Integration', () => {
    it('should provide proper ARIA labels and navigation', () => {
      render(
        <TestWrapper>
          <MainLayout />
        </TestWrapper>
      );

      // Should have proper landmarks
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();

      // Should have proper tab navigation
      const tabList = screen.getByRole('tablist');
      expect(tabList).toBeInTheDocument();

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

      // Should be able to navigate with keyboard
      const chatTab = screen.getByRole('tab', { name: /chat/i });
      chatTab.focus();
      
      expect(document.activeElement).toBe(chatTab);

      // Tab to next element
      await user.keyboard('{Tab}');
      
      // Should move focus to next interactive element
      expect(document.activeElement).not.toBe(chatTab);
    });
  });

  describe('Performance Integration', () => {
    it('should handle large conversation histories efficiently', async () => {
      const user = userEvent.setup();
      
      // Mock large conversation history
      const largeHistory = Array.from({ length: 100 }, (_, i) => ({
        id: `msg_${i}`,
        content: `Message ${i}`,
        sender: i % 2 === 0 ? 'user' : 'ai',
        timestamp: new Date(Date.now() - i * 1000),
      }));

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { messages: largeHistory },
        }),
      });

      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <MainLayout />
        </TestWrapper>
      );

      // Load history
      const loadHistoryButton = screen.getByRole('button', { name: /load history/i });
      await user.click(loadHistoryButton);

      await waitFor(() => {
        expect(screen.getByText('Message 0')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (less than 2 seconds)
      expect(renderTime).toBeLessThan(2000);
    });
  });
});