import { useState, useCallback, useEffect, useRef } from 'react';
import {
  AppError,
  ErrorContext,
  ErrorRecoveryResult,
  RetryOptions,
  NetworkDetection,
  ErrorClassifier,
  RetryManager,
  ErrorNotification,
  ErrorSeverity,
} from '../utils/errorHandling';

interface ErrorState {
  error: AppError | null;
  isRetrying: boolean;
  attemptsMade: number;
  isOnline: boolean;
  lastRecoveryAttempt: Date | null;
}

interface UseErrorHandlingOptions {
  maxRetries?: number;
  baseDelay?: number;
  enableNetworkDetection?: boolean;
  onError?: (error: AppError) => void;
  onRecovery?: (result: ErrorRecoveryResult<any>) => void;
}

export const useErrorHandling = (options: UseErrorHandlingOptions = {}) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    enableNetworkDetection = true,
    onError,
    onRecovery,
  } = options;

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isRetrying: false,
    attemptsMade: 0,
    isOnline: true,
    lastRecoveryAttempt: null,
  });

  const retryTimeoutRef = useRef<number>();

  // Network status monitoring
  useEffect(() => {
    if (!enableNetworkDetection) return;

    setErrorState(prev => ({ ...prev, isOnline: NetworkDetection.isOnline() }));

    const cleanup = NetworkDetection.onNetworkChange((isOnline) => {
      setErrorState(prev => {
        const newState = { ...prev, isOnline };
        return newState;
      });
    });

    return cleanup;
  }, [enableNetworkDetection]);

  // Clear error state
  const clearError = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    
    setErrorState({
      error: null,
      isRetrying: false,
      attemptsMade: 0,
      isOnline: NetworkDetection.isOnline(),
      lastRecoveryAttempt: null,
    });
  }, []);

  // Handle error
  const handleError = useCallback((error: Error, context: Partial<ErrorContext> = {}) => {
    const fullContext: ErrorContext = {
      action: 'unknown',
      timestamp: new Date(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...context,
    };

    const appError = ErrorClassifier.classifyError(error, fullContext);
    
    setErrorState(prev => ({
      ...prev,
      error: appError,
      isRetrying: false,
      attemptsMade: 0,
      lastRecoveryAttempt: null,
    }));

    onError?.(appError);
  }, [onError]);

  // Execute operation with error handling
  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    context: Partial<ErrorContext> = {},
    retryOptions: Partial<RetryOptions> = {}
  ): Promise<ErrorRecoveryResult<T>> => {
    const fullContext: ErrorContext = {
      action: 'api_call',
      timestamp: new Date(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...context,
    };

    setErrorState(prev => ({ ...prev, isRetrying: true }));

    const result = await RetryManager.withRetry(
      operation,
      fullContext,
      {
        maxAttempts: maxRetries,
        baseDelay,
        ...retryOptions,
      }
    );

    setErrorState(prev => ({
      ...prev,
      isRetrying: false,
      attemptsMade: result.attemptsMade,
      error: result.success ? null : ErrorClassifier.classifyError(result.error!, fullContext),
      lastRecoveryAttempt: new Date(),
    }));

    if (result.success) {
      clearError();
    } else if (result.error) {
      const appError = ErrorClassifier.classifyError(result.error, fullContext);
      onError?.(appError);
    }

    onRecovery?.(result);
    return result;
  }, [maxRetries, baseDelay, onError, onRecovery, clearError]);

  // Execute with context preservation
  const executeWithContextPreservation = useCallback(async <T>(
    operation: () => Promise<T>,
    preserveState: () => any,
    restoreState: (state: any) => void,
    context: Partial<ErrorContext> = {}
  ): Promise<ErrorRecoveryResult<T>> => {
    const fullContext: ErrorContext = {
      action: 'context_preserving_operation',
      timestamp: new Date(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...context,
    };

    setErrorState(prev => ({ ...prev, isRetrying: true }));

    const result = await RetryManager.withContextPreservation(
      operation,
      fullContext,
      preserveState,
      restoreState
    );

    setErrorState(prev => ({
      ...prev,
      isRetrying: false,
      attemptsMade: result.attemptsMade,
      error: result.success ? null : ErrorClassifier.classifyError(result.error!, fullContext),
      lastRecoveryAttempt: new Date(),
    }));

    if (result.success) {
      clearError();
    } else if (result.error) {
      const appError = ErrorClassifier.classifyError(result.error, fullContext);
      onError?.(appError);
    }

    onRecovery?.(result);
    return result;
  }, [onError, onRecovery, clearError]);

  // Manual retry
  const handleRetry = useCallback(async () => {
    if (!errorState.error || !ErrorClassifier.isRetryable(errorState.error)) {
      return;
    }

    const delay = ErrorClassifier.getRetryDelay(errorState.error, errorState.attemptsMade + 1, baseDelay);
    
    setErrorState(prev => ({ ...prev, isRetrying: true }));

    retryTimeoutRef.current = setTimeout(() => {
      setErrorState(prev => ({
        ...prev,
        isRetrying: false,
        attemptsMade: prev.attemptsMade + 1,
        lastRecoveryAttempt: new Date(),
      }));
    }, delay);
  }, [errorState.error, errorState.attemptsMade, baseDelay]);

  // Get user-friendly error message
  const getErrorMessage = useCallback(() => {
    if (!errorState.error) return null;
    return ErrorNotification.getUserMessage(errorState.error);
  }, [errorState.error]);

  // Get recovery suggestions
  const getRecoverySuggestions = useCallback(() => {
    if (!errorState.error) return [];
    return ErrorNotification.getRecoverySuggestions(errorState.error);
  }, [errorState.error]);

  // Check if error is recoverable
  const isRecoverable = useCallback(() => {
    return errorState.error?.recoverable ?? false;
  }, [errorState.error]);

  // Check if error is retryable
  const isRetryable = useCallback(() => {
    if (!errorState.error) return false;
    return ErrorClassifier.isRetryable(errorState.error);
  }, [errorState.error]);

  // Get error severity
  const getErrorSeverity = useCallback(() => {
    return errorState.error?.severity ?? ErrorSeverity.LOW;
  }, [errorState.error]);

  return {
    // State
    error: errorState.error,
    isRetrying: errorState.isRetrying,
    attemptsMade: errorState.attemptsMade,
    isOnline: errorState.isOnline,
    lastRecoveryAttempt: errorState.lastRecoveryAttempt,

    // Actions
    handleError,
    clearError,
    handleRetry,
    executeWithErrorHandling,
    executeWithContextPreservation,

    // Getters
    getErrorMessage,
    getRecoverySuggestions,
    isRecoverable,
    isRetryable,
    getErrorSeverity,

    // Computed state
    hasError: !!errorState.error,
    canRetry: isRetryable() && errorState.attemptsMade < maxRetries,
    shouldShowRetry: isRetryable() && !errorState.isRetrying,
  };
};

// Hook for network status monitoring
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(NetworkDetection.isOnline());
  const [lastConnectivityTest, setLastConnectivityTest] = useState<Date | null>(null);
  const [isTestingConnectivity, setIsTestingConnectivity] = useState(false);

  useEffect(() => {
    const cleanup = NetworkDetection.onNetworkChange(setIsOnline);
    return cleanup;
  }, []);

  const testConnectivity = useCallback(async () => {
    setIsTestingConnectivity(true);
    try {
      const isConnected = await NetworkDetection.testConnectivity();
      setIsOnline(isConnected);
      setLastConnectivityTest(new Date());
      return isConnected;
    } finally {
      setIsTestingConnectivity(false);
    }
  }, []);

  return {
    isOnline,
    lastConnectivityTest,
    isTestingConnectivity,
    testConnectivity,
  };
};

// Hook for error boundary integration
export const useErrorBoundary = () => {
  const [error, setError] = useState<AppError | null>(null);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const captureError = useCallback((error: Error, errorInfo?: any, context: Partial<ErrorContext> = {}) => {
    const fullContext: ErrorContext = {
      action: 'component_error',
      timestamp: new Date(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      additionalData: errorInfo,
      ...context,
    };

    const appError = ErrorClassifier.classifyError(error, fullContext);
    setError(appError);
  }, []);

  return {
    error,
    resetError,
    captureError,
    hasError: !!error,
  };
};