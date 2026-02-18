/**
 * Comprehensive error handling utilities for EducateFirstAI
 * Provides network error detection, service failure recovery, and user-friendly error messages
 */

export interface ErrorContext {
  userId?: string;
  conversationId?: string;
  action: string;
  timestamp: Date;
  userAgent?: string;
  url?: string;
  additionalData?: Record<string, any>;
}

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: Error) => boolean;
}

export interface ErrorRecoveryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attemptsMade: number;
  recoveryStrategy?: string;
}

export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface AppError extends Error {
  type: ErrorType;
  severity: ErrorSeverity;
  context: ErrorContext;
  userMessage: string;
  technicalMessage: string;
  recoverable: boolean;
  retryable: boolean;
}

export class NetworkError extends Error implements AppError {
  type = ErrorType.NETWORK_ERROR;
  severity = ErrorSeverity.HIGH;
  recoverable = true;
  retryable = true;

  constructor(
    public context: ErrorContext,
    public userMessage: string = 'Network connection lost. Please check your internet connection.',
    public technicalMessage: string = 'Network request failed'
  ) {
    super(technicalMessage);
    this.name = 'NetworkError';
  }
}

export class ServiceUnavailableError extends Error implements AppError {
  type = ErrorType.SERVICE_UNAVAILABLE;
  severity = ErrorSeverity.HIGH;
  recoverable = true;
  retryable = true;

  constructor(
    public context: ErrorContext,
    public userMessage: string = 'Service is temporarily unavailable. Please try again in a moment.',
    public technicalMessage: string = 'Service unavailable'
  ) {
    super(technicalMessage);
    this.name = 'ServiceUnavailableError';
  }
}

export class AuthenticationError extends Error implements AppError {
  type = ErrorType.AUTHENTICATION_ERROR;
  severity = ErrorSeverity.MEDIUM;
  recoverable = true;
  retryable = false;

  constructor(
    public context: ErrorContext,
    public userMessage: string = 'Please sign in to continue.',
    public technicalMessage: string = 'Authentication failed'
  ) {
    super(technicalMessage);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends Error implements AppError {
  type = ErrorType.VALIDATION_ERROR;
  severity = ErrorSeverity.LOW;
  recoverable = true;
  retryable = false;

  constructor(
    public context: ErrorContext,
    public userMessage: string = 'Please check your input and try again.',
    public technicalMessage: string = 'Validation failed'
  ) {
    super(technicalMessage);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends Error implements AppError {
  type = ErrorType.RATE_LIMIT_ERROR;
  severity = ErrorSeverity.MEDIUM;
  recoverable = true;
  retryable = true;

  constructor(
    public context: ErrorContext,
    public userMessage: string = 'Too many requests. Please wait a moment before trying again.',
    public technicalMessage: string = 'Rate limit exceeded'
  ) {
    super(technicalMessage);
    this.name = 'RateLimitError';
  }
}

export class TimeoutError extends Error implements AppError {
  type = ErrorType.TIMEOUT_ERROR;
  severity = ErrorSeverity.MEDIUM;
  recoverable = true;
  retryable = true;

  constructor(
    public context: ErrorContext,
    public userMessage: string = 'Request timed out. Please try again.',
    public technicalMessage: string = 'Request timeout'
  ) {
    super(technicalMessage);
    this.name = 'TimeoutError';
  }
}

/**
 * Network error detection utilities
 */
export const NetworkDetection = {
  /**
   * Check if the browser is online
   */
  isOnline(): boolean {
    return navigator.onLine;
  },

  /**
   * Monitor network status changes
   */
  onNetworkChange(callback: (isOnline: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  },

  /**
   * Test network connectivity by making a simple request
   */
  async testConnectivity(timeout: number = 5000): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch('/api/health', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache',
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  },
};

/**
 * Error classification utilities
 */
export const ErrorClassifier = {
  /**
   * Classify an error based on its properties
   */
  classifyError(error: Error, context: ErrorContext): AppError {
    // Network-related errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return new NetworkError(context);
    }

    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return new TimeoutError(context);
    }

    // HTTP status-based classification
    if ('status' in error) {
      const status = (error as any).status;
      
      if (status === 401 || status === 403) {
        return new AuthenticationError(context);
      }
      
      if (status === 429) {
        return new RateLimitError(context);
      }
      
      if (status >= 500) {
        return new ServiceUnavailableError(context);
      }
      
      if (status >= 400) {
        return new ValidationError(context, 'Invalid request. Please check your input.');
      }
    }

    // Default to unknown error
    return {
      ...error,
      type: ErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.MEDIUM,
      context,
      userMessage: 'An unexpected error occurred. Please try again.',
      technicalMessage: error.message,
      recoverable: true,
      retryable: true,
    } as AppError;
  },

  /**
   * Check if an error is retryable
   */
  isRetryable(error: AppError): boolean {
    return error.retryable && [
      ErrorType.NETWORK_ERROR,
      ErrorType.SERVICE_UNAVAILABLE,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.RATE_LIMIT_ERROR,
    ].includes(error.type);
  },

  /**
   * Get retry delay based on error type and attempt number
   */
  getRetryDelay(error: AppError, attempt: number, baseDelay: number = 1000): number {
    const multipliers: Record<string, number> = {
      [ErrorType.NETWORK_ERROR]: 2,
      [ErrorType.SERVICE_UNAVAILABLE]: 3,
      [ErrorType.TIMEOUT_ERROR]: 2,
      [ErrorType.RATE_LIMIT_ERROR]: 5,
    };

    const multiplier = multipliers[error.type] || 2;
    return Math.min(baseDelay * Math.pow(multiplier, attempt - 1), 30000); // Max 30 seconds
  },
};

/**
 * Retry mechanism with exponential backoff
 */
export const RetryManager = {
  /**
   * Execute a function with retry logic
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    options: Partial<RetryOptions> = {}
  ): Promise<ErrorRecoveryResult<T>> {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      maxDelay = 30000,
      backoffMultiplier = 2,
      retryCondition = (_error: Error) => true,
    } = options;

    let lastError: Error;
    let attemptsMade = 0;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      attemptsMade = attempt;

      try {
        const result = await operation();
        return {
          success: true,
          data: result,
          attemptsMade,
          recoveryStrategy: attempt > 1 ? 'retry' : 'direct',
        };
      } catch (error) {
        lastError = error as Error;
        const appError = ErrorClassifier.classifyError(lastError, context);

        // Don't retry if error is not retryable or doesn't meet retry condition
        if (!ErrorClassifier.isRetryable(appError) || !retryCondition(lastError)) {
          break;
        }

        // Don't retry on last attempt
        if (attempt === maxAttempts) {
          break;
        }

        // Calculate delay for next attempt
        const delay = Math.min(
          baseDelay * Math.pow(backoffMultiplier, attempt - 1),
          maxDelay
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      error: lastError!,
      attemptsMade,
      recoveryStrategy: 'failed',
    };
  },

  /**
   * Execute with context preservation
   */
  async withContextPreservation<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    preserveState: () => any,
    restoreState: (state: any) => void
  ): Promise<ErrorRecoveryResult<T>> {
    const savedState = preserveState();

    const result = await this.withRetry(operation, context);

    if (!result.success) {
      // Restore state on failure
      restoreState(savedState);
    }

    return result;
  },
};

/**
 * User notification utilities
 */
export const ErrorNotification = {
  /**
   * Get user-friendly error message
   */
  getUserMessage(error: AppError): string {
    const messages = {
      [ErrorType.NETWORK_ERROR]: 'Connection lost. Please check your internet and try again.',
      [ErrorType.SERVICE_UNAVAILABLE]: 'Service is temporarily down. We\'re working to fix this.',
      [ErrorType.AUTHENTICATION_ERROR]: 'Please sign in to continue using the app.',
      [ErrorType.VALIDATION_ERROR]: 'Please check your input and try again.',
      [ErrorType.RATE_LIMIT_ERROR]: 'You\'re sending requests too quickly. Please wait a moment.',
      [ErrorType.TIMEOUT_ERROR]: 'Request took too long. Please try again.',
      [ErrorType.UNKNOWN_ERROR]: 'Something went wrong. Please try again.',
    };

    return error.userMessage || messages[error.type] || messages[ErrorType.UNKNOWN_ERROR];
  },

  /**
   * Get recovery suggestions for the user
   */
  getRecoverySuggestions(error: AppError): string[] {
    const suggestions: Record<string, string[]> = {
      [ErrorType.NETWORK_ERROR]: [
        'Check your internet connection',
        'Try refreshing the page',
        'Switch to a different network if available',
      ],
      [ErrorType.SERVICE_UNAVAILABLE]: [
        'Wait a few minutes and try again',
        'Check our status page for updates',
        'Contact support if the problem persists',
      ],
      [ErrorType.AUTHENTICATION_ERROR]: [
        'Sign in to your account',
        'Clear your browser cache and cookies',
        'Reset your password if needed',
      ],
      [ErrorType.VALIDATION_ERROR]: [
        'Double-check your input',
        'Make sure all required fields are filled',
        'Follow the format examples provided',
      ],
      [ErrorType.RATE_LIMIT_ERROR]: [
        'Wait a moment before trying again',
        'Reduce the frequency of your requests',
      ],
      [ErrorType.TIMEOUT_ERROR]: [
        'Try again with a stable connection',
        'Break large requests into smaller ones',
      ],
    };

    return suggestions[error.type] || [
      'Try refreshing the page',
      'Contact support if the problem continues',
    ];
  },

  /**
   * Format error for logging
   */
  formatForLogging(error: AppError): Record<string, any> {
    return {
      type: error.type,
      severity: error.severity,
      message: error.technicalMessage,
      userMessage: error.userMessage,
      context: error.context,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      recoverable: error.recoverable,
      retryable: error.retryable,
    };
  },
};

/**
 * Error boundary utilities for React components
 */
export const ErrorBoundaryUtils = {
  /**
   * Handle component errors gracefully
   */
  handleComponentError(error: Error, errorInfo: any, context: Partial<ErrorContext> = {}): AppError {
    const fullContext: ErrorContext = {
      action: 'component_render',
      timestamp: new Date(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      additionalData: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
      ...context,
    };

    return ErrorClassifier.classifyError(error, fullContext);
  },

  /**
   * Get fallback UI message
   */
  getFallbackMessage(error: AppError): string {
    if (error.severity === ErrorSeverity.CRITICAL) {
      return 'A critical error occurred. Please refresh the page.';
    }

    return 'Something went wrong with this section. Please try refreshing.';
  },
};