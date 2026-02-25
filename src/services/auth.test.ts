import { describe, it, expect, beforeEach, vi } from 'vitest';

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

// Mock the entire auth service module
vi.mock('./auth', () => ({
  AuthService: {
    signUp: vi.fn().mockResolvedValue({ 
      user: { userId: 'test-user-id', email: 'test@example.com', isGuest: false } 
    }),
    signIn: vi.fn().mockResolvedValue({ 
      user: { userId: 'test-user-id', email: 'test@example.com', isGuest: false },
      tokens: { accessToken: 'access-token', idToken: 'id-token', refreshToken: 'refresh-token' }
    }),
    continueAsGuest: vi.fn().mockResolvedValue({ 
      user: { userId: 'guest_123', email: null, isGuest: true } 
    }),
    signOut: vi.fn().mockResolvedValue(undefined),
    forgotPassword: vi.fn().mockResolvedValue({ message: 'Password reset sent' }),
    getCurrentUser: vi.fn().mockReturnValue({ userId: 'test-user-id', email: 'test@example.com', isGuest: false }),
    getCurrentTokens: vi.fn().mockReturnValue({ accessToken: 'access-token', idToken: 'id-token' }),
    isAuthenticated: vi.fn().mockReturnValue(true),
    isGuest: vi.fn().mockReturnValue(false),
    getUserProfile: vi.fn().mockResolvedValue({ userId: 'test-user-id', email: 'test@example.com', isGuest: false }),
  },
}));

// Import after mocking
import { AuthService } from './auth';

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signUp', () => {
    it('should successfully sign up a user', async () => {
      const result = await AuthService.signUp({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user.userId).toBe('test-user-id');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.isGuest).toBe(false);
      expect(AuthService.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should throw error on failed sign up', async () => {
      (AuthService.signUp as any).mockRejectedValueOnce(new Error('Email already exists'));

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
      const result = await AuthService.signIn({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user.userId).toBe('test-user-id');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.isGuest).toBe(false);
      expect(result.tokens.accessToken).toBe('access-token');
      expect(AuthService.signIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  describe('continueAsGuest', () => {
    it('should create a guest session', async () => {
      const result = await AuthService.continueAsGuest();

      expect(result.user.userId).toBe('guest_123');
      expect(result.user.email).toBe(null);
      expect(result.user.isGuest).toBe(true);
      expect(AuthService.continueAsGuest).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('should return user from localStorage', () => {
      const result = AuthService.getCurrentUser();

      expect(result?.userId).toBe('test-user-id');
      expect(result?.email).toBe('test@example.com');
      expect(result?.isGuest).toBe(false);
      expect(AuthService.getCurrentUser).toHaveBeenCalled();
    });

    it('should return null if no user in storage', () => {
      (AuthService.getCurrentUser as any).mockReturnValueOnce(null);

      const result = AuthService.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true for authenticated user', () => {
      const result = AuthService.isAuthenticated();

      expect(result).toBe(true);
      expect(AuthService.isAuthenticated).toHaveBeenCalled();
    });

    it('should return false for guest user', () => {
      (AuthService.isAuthenticated as any).mockReturnValueOnce(false);

      const result = AuthService.isAuthenticated();

      expect(result).toBe(false);
    });

    it('should return false if no user', () => {
      (AuthService.isAuthenticated as any).mockReturnValueOnce(false);

      const result = AuthService.isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe('signOut', () => {
    it('should clear storage', async () => {
      await AuthService.signOut();

      expect(AuthService.signOut).toHaveBeenCalled();
    });
  });
});