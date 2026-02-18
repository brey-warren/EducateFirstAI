import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth';

// Mock fetch
(globalThis as any).fetch = vi.fn();

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

// Mock environment variable
vi.mock('../config/environment', () => ({
  environment: {
    api: {
      baseUrl: 'https://api.test.com',
    },
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signUp', () => {
    it('should successfully sign up a user', async () => {
      const mockUser = {
        userId: 'test-user-id',
        email: 'test@example.com',
        isGuest: false,
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { user: mockUser },
        }),
      });

      const result = await AuthService.signUp({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user).toEqual(mockUser);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'educate_first_ai_user',
        JSON.stringify(mockUser)
      );
    });

    it('should throw error on failed sign up', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Email already exists',
        }),
      });

      await expect(
        AuthService.signUp({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('signIn', () => {
    it('should successfully sign in a user', async () => {
      const mockUser = {
        userId: 'test-user-id',
        email: 'test@example.com',
        isGuest: false,
      };
      const mockTokens = {
        accessToken: 'access-token',
        idToken: 'id-token',
        refreshToken: 'refresh-token',
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { user: mockUser, tokens: mockTokens },
        }),
      });

      const result = await AuthService.signIn({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user).toEqual(mockUser);
      expect(result.tokens).toEqual(mockTokens);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'educate_first_ai_user',
        JSON.stringify(mockUser)
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'educate_first_ai_tokens',
        JSON.stringify(mockTokens)
      );
    });
  });

  describe('continueAsGuest', () => {
    it('should create a guest session', async () => {
      const mockGuestUser = {
        userId: 'guest_123',
        email: null,
        isGuest: true,
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { user: mockGuestUser },
        }),
      });

      const result = await AuthService.continueAsGuest();

      expect(result.user).toEqual(mockGuestUser);
      expect(result.user.isGuest).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'educate_first_ai_user',
        JSON.stringify(mockGuestUser)
      );
    });
  });

  describe('getCurrentUser', () => {
    it('should return user from localStorage', () => {
      const mockUser = {
        userId: 'test-user-id',
        email: 'test@example.com',
        isGuest: false,
      };

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mockUser));

      const result = AuthService.getCurrentUser();

      expect(result).toEqual(mockUser);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('educate_first_ai_user');
    });

    it('should return null if no user in storage', () => {
      localStorageMock.getItem.mockReturnValueOnce(null);

      const result = AuthService.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true for authenticated user', () => {
      const mockUser = {
        userId: 'test-user-id',
        email: 'test@example.com',
        isGuest: false,
      };

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mockUser));

      const result = AuthService.isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false for guest user', () => {
      const mockGuestUser = {
        userId: 'guest_123',
        email: null,
        isGuest: true,
      };

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mockGuestUser));

      const result = AuthService.isAuthenticated();

      expect(result).toBe(false);
    });

    it('should return false if no user', () => {
      localStorageMock.getItem.mockReturnValueOnce(null);

      const result = AuthService.isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe('signOut', () => {
    it('should clear storage', async () => {
      await AuthService.signOut();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('educate_first_ai_user');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('educate_first_ai_tokens');
    });
  });
});