import React, { Component, ReactNode } from 'react';
import { AppError, ErrorBoundaryUtils, ErrorContext } from '../../utils/errorHandling';
import { ErrorDisplay } from './ErrorDisplay';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: AppError, resetError: () => void) => ReactNode;
  onError?: (error: AppError, errorInfo: any) => void;
  context?: Partial<ErrorContext>;
}

interface ErrorBoundaryState {
  error: AppError | null;
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      error: null,
      hasError: false,
    };
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    const appError = ErrorBoundaryUtils.handleComponentError(
      error,
      errorInfo,
      this.props.context
    );

    this.setState({ error: appError });
    this.props.onError?.(appError, errorInfo);

    // Log error for debugging
    console.error('ErrorBoundary caught an error:', {
      error: appError,
      errorInfo,
      context: this.props.context,
    });
  }

  resetError = () => {
    this.setState({
      error: null,
      hasError: false,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <ErrorDisplay
          error={this.state.error}
          onRetry={this.resetError}
          showRetry={this.state.error.recoverable}
        />
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
};