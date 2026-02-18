import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { AuthService, User, AuthTokens } from '../services/auth';
import { AuthSignUpRequest, AuthSignInRequest, AuthResetPasswordRequest } from '../types';

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
}

export interface AuthActions {
  signUp: (request: AuthSignUpRequest) => Promise<void>;
  signIn: (request: AuthSignInRequest) => Promise<void>;
  signOut: () => Promise<void>;
  forgotPassword: (request: AuthResetPasswordRequest) => Promise<string>;
  continueAsGuest: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

export interface AuthContextType extends AuthState, AuthActions {}

// Create Auth Context
export const AuthContext = createContext<AuthContextType | null>(null);

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth hook implementation
export const useAuthState = (): AuthContextType => {
  const [state, setState] = useState<AuthState>({
    user: null,
    tokens: null,
    isLoading: true,
    isAuthenticated: false,
    isGuest: false,
  });

  // Initialize auth state from storage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const user = AuthService.getCurrentUser();
        const tokens = AuthService.getCurrentTokens();

        setState({
          user,
          tokens,
          isLoading: false,
          isAuthenticated: AuthService.isAuthenticated(),
          isGuest: AuthService.isGuest(),
        });
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
        }));
      }
    };

    initializeAuth();
  }, []);

  // Sign up action
  const signUp = useCallback(async (request: AuthSignUpRequest): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const { user } = await AuthService.signUp(request);
      
      setState({
        user,
        tokens: null, // Sign up doesn't return tokens immediately
        isLoading: false,
        isAuthenticated: true,
        isGuest: false,
      });
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  // Sign in action
  const signIn = useCallback(async (request: AuthSignInRequest): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const { user, tokens } = await AuthService.signIn(request);
      
      setState({
        user,
        tokens,
        isLoading: false,
        isAuthenticated: true,
        isGuest: false,
      });
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  // Sign out action
  const signOut = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      await AuthService.signOut();
      
      setState({
        user: null,
        tokens: null,
        isLoading: false,
        isAuthenticated: false,
        isGuest: false,
      });
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  // Forgot password action
  const forgotPassword = useCallback(async (request: AuthResetPasswordRequest): Promise<string> => {
    const { message } = await AuthService.forgotPassword(request);
    return message;
  }, []);

  // Continue as guest action
  const continueAsGuest = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const { user } = await AuthService.continueAsGuest();
      
      setState({
        user,
        tokens: null,
        isLoading: false,
        isAuthenticated: false,
        isGuest: true,
      });
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  // Refresh user profile action
  const refreshUserProfile = useCallback(async (): Promise<void> => {
    if (!state.user?.userId) return;
    
    try {
      const user = await AuthService.getUserProfile(state.user.userId);
      setState(prev => ({ ...prev, user }));
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
      // Don't throw here as this is often called in background
    }
  }, [state.user?.userId]);

  return {
    ...state,
    signUp,
    signIn,
    signOut,
    forgotPassword,
    continueAsGuest,
    refreshUserProfile,
  };
};