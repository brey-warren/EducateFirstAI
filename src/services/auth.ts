import { AuthSignUpRequest, AuthSignInRequest, AuthResetPasswordRequest } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL || '';

// Validate HTTPS enforcement
if (API_BASE_URL && !API_BASE_URL.startsWith('https://') && !API_BASE_URL.includes('localhost')) {
  throw new Error('HTTPS is required for all API communications in production');
}

export interface User {
  userId: string;
  email: string | null;
  isGuest: boolean;
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
}

export class AuthService {
  private static readonly STORAGE_KEYS = {
    USER: 'educate_first_ai_user',
    TOKENS: 'educate_first_ai_tokens',
  };

  // Security headers for all requests
  private static getSecurityHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };
  }

  // Secure fetch wrapper
  private static async secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
    // Enforce HTTPS
    if (!url.startsWith('https://') && !url.includes('localhost')) {
      throw new Error('HTTPS is required for all API communications');
    }

    const secureOptions: RequestInit = {
      ...options,
      headers: {
        ...this.getSecurityHeaders(),
        ...options.headers,
      },
    };

    return fetch(url, secureOptions);
  }

  /**
   * Sign up a new user
   */
  static async signUp(request: AuthSignUpRequest): Promise<{ user: User }> {
    // In development mode without API, create a mock user
    if (!API_BASE_URL || import.meta.env.DEV) {
      const mockUser: User = {
        userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: request.email,
        isGuest: false,
      };
      
      this.storeUser(mockUser);
      return { user: mockUser };
    }

    const response = await this.secureFetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create account');
    }

    const user = data.data.user;
    this.storeUser(user);

    return { user };
  }

  /**
   * Sign in an existing user
   */
  static async signIn(request: AuthSignInRequest): Promise<{ user: User; tokens: AuthTokens }> {
    // In development mode without API, create a mock user
    if (!API_BASE_URL || import.meta.env.DEV) {
      const mockUser: User = {
        userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: request.email,
        isGuest: false,
      };
      
      const mockTokens: AuthTokens = {
        accessToken: 'mock_access_token',
        idToken: 'mock_id_token',
        refreshToken: 'mock_refresh_token',
      };
      
      this.storeUser(mockUser);
      this.storeTokens(mockTokens);
      
      return { user: mockUser, tokens: mockTokens };
    }

    const response = await this.secureFetch(`${API_BASE_URL}/auth/signin`, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to sign in');
    }

    const user = data.data.user;
    const tokens = data.data.tokens;

    this.storeUser(user);
    this.storeTokens(tokens);

    return { user, tokens };
  }

  /**
   * Sign out the current user
   */
  static async signOut(): Promise<void> {
    this.clearStorage();
  }

  /**
   * Request password reset
   */
  static async forgotPassword(request: AuthResetPasswordRequest): Promise<{ message: string }> {
    // In development mode without API, return a mock success message
    if (!API_BASE_URL || import.meta.env.DEV) {
      return { 
        message: 'Password reset instructions have been sent to your email address.' 
      };
    }

    const response = await this.secureFetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to process password reset request');
    }

    return { message: data.data.message };
  }

  /**
   * Continue as guest
   */
  static async continueAsGuest(): Promise<{ user: User }> {
    // In development mode without API, create a mock guest user
    if (!API_BASE_URL || import.meta.env.DEV) {
      const guestUser: User = {
        userId: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: null,
        isGuest: true,
      };
      
      this.storeUser(guestUser);
      return { user: guestUser };
    }

    const response = await this.secureFetch(`${API_BASE_URL}/auth/guest`, {
      method: 'POST',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create guest session');
    }

    const user = data.data.user;
    this.storeUser(user);

    return { user };
  }

  /**
   * Get current user from storage
   */
  static getCurrentUser(): User | null {
    try {
      const userJson = localStorage.getItem(this.STORAGE_KEYS.USER);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Get current tokens from storage
   */
  static getCurrentTokens(): AuthTokens | null {
    try {
      const tokensJson = localStorage.getItem(this.STORAGE_KEYS.TOKENS);
      return tokensJson ? JSON.parse(tokensJson) : null;
    } catch (error) {
      console.error('Failed to get current tokens:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const user = this.getCurrentUser();
    return user !== null && !user.isGuest;
  }

  /**
   * Check if user is in guest mode
   */
  static isGuest(): boolean {
    const user = this.getCurrentUser();
    return user !== null && user.isGuest;
  }

  /**
   * Get user profile
   */
  static async getUserProfile(userId: string): Promise<User> {
    const tokens = this.getCurrentTokens();
    const headers: Record<string, string> = {};

    if (tokens?.accessToken) {
      headers.Authorization = `Bearer ${tokens.accessToken}`;
    }

    const response = await this.secureFetch(`${API_BASE_URL}/auth/user/${userId}`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get user profile');
    }

    return data.data.user;
  }

  /**
   * Store user in localStorage
   */
  private static storeUser(user: User): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS.USER, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to store user:', error);
    }
  }

  /**
   * Store tokens in localStorage
   */
  private static storeTokens(tokens: AuthTokens): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS.TOKENS, JSON.stringify(tokens));
    } catch (error) {
      console.error('Failed to store tokens:', error);
    }
  }

  /**
   * Clear all stored data
   */
  private static clearStorage(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEYS.USER);
      localStorage.removeItem(this.STORAGE_KEYS.TOKENS);
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }
}