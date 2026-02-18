/**
 * Error logging and monitoring service
 * Provides centralized error tracking, reporting, and analytics
 */

import { AppError, ErrorNotification, ErrorContext } from '../utils/errorHandling';

interface ErrorLog {
  id: string;
  error: AppError;
  timestamp: Date;
  sessionId: string;
  userId?: string;
  userAgent: string;
  url: string;
  resolved: boolean;
  reportedToUser: boolean;
}

interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  errorsByHour: Record<string, number>;
  topErrors: Array<{ message: string; count: number }>;
  recoveryRate: number;
}

class ErrorLoggingService {
  private logs: ErrorLog[] = [];
  private sessionId: string;
  private maxLogs: number = 1000;
  private reportingEndpoint?: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupGlobalErrorHandlers();
  }

  /**
   * Initialize the service with configuration
   */
  initialize(config: {
    maxLogs?: number;
    reportingEndpoint?: string;
    enableConsoleLogging?: boolean;
  } = {}) {
    this.maxLogs = config.maxLogs ?? 1000;
    this.reportingEndpoint = config.reportingEndpoint;

    if (config.enableConsoleLogging !== false) {
      this.enableConsoleLogging();
    }
  }

  /**
   * Log an error
   */
  logError(error: AppError, context?: Partial<ErrorContext>): string {
    const logId = this.generateLogId();
    
    const errorLog: ErrorLog = {
      id: logId,
      error: {
        ...error,
        context: {
          ...error.context,
          ...context,
        },
      },
      timestamp: new Date(),
      sessionId: this.sessionId,
      userId: context?.userId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      resolved: false,
      reportedToUser: false,
    };

    this.logs.push(errorLog);
    this.trimLogs();

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Error logged:', ErrorNotification.formatForLogging(error));
    }

    // Report to external service if configured
    if (this.reportingEndpoint) {
      this.reportError(errorLog).catch(reportingError => {
        console.warn('Failed to report error:', reportingError);
      });
    }

    return logId;
  }

  /**
   * Mark an error as resolved
   */
  markErrorResolved(logId: string): void {
    const log = this.logs.find(l => l.id === logId);
    if (log) {
      log.resolved = true;
    }
  }

  /**
   * Mark an error as reported to user
   */
  markErrorReported(logId: string): void {
    const log = this.logs.find(l => l.id === logId);
    if (log) {
      log.reportedToUser = true;
    }
  }

  /**
   * Get error logs with optional filtering
   */
  getLogs(filter?: {
    type?: string;
    severity?: string;
    resolved?: boolean;
    userId?: string;
    since?: Date;
    limit?: number;
  }): ErrorLog[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.type) {
        filteredLogs = filteredLogs.filter(log => log.error.type === filter.type);
      }
      
      if (filter.severity) {
        filteredLogs = filteredLogs.filter(log => log.error.severity === filter.severity);
      }
      
      if (filter.resolved !== undefined) {
        filteredLogs = filteredLogs.filter(log => log.resolved === filter.resolved);
      }
      
      if (filter.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filter.userId);
      }
      
      if (filter.since) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.since!);
      }
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filter?.limit) {
      filteredLogs = filteredLogs.slice(0, filter.limit);
    }

    return filteredLogs;
  }

  /**
   * Get error metrics and analytics
   */
  getMetrics(timeRange?: { start: Date; end: Date }): ErrorMetrics {
    let logs = this.logs;

    if (timeRange) {
      logs = logs.filter(log => 
        log.timestamp >= timeRange.start && log.timestamp <= timeRange.end
      );
    }

    const totalErrors = logs.length;
    const resolvedErrors = logs.filter(log => log.resolved).length;

    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    const errorsByHour: Record<string, number> = {};
    const errorMessages: Record<string, number> = {};

    logs.forEach(log => {
      // Count by type
      errorsByType[log.error.type] = (errorsByType[log.error.type] || 0) + 1;
      
      // Count by severity
      errorsBySeverity[log.error.severity] = (errorsBySeverity[log.error.severity] || 0) + 1;
      
      // Count by hour
      const hour = log.timestamp.toISOString().slice(0, 13);
      errorsByHour[hour] = (errorsByHour[hour] || 0) + 1;
      
      // Count error messages
      const message = log.error.userMessage || log.error.technicalMessage;
      errorMessages[message] = (errorMessages[message] || 0) + 1;
    });

    const topErrors = Object.entries(errorMessages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([message, count]) => ({ message, count }));

    return {
      totalErrors,
      errorsByType,
      errorsBySeverity,
      errorsByHour,
      topErrors,
      recoveryRate: totalErrors > 0 ? resolvedErrors / totalErrors : 0,
    };
  }

  /**
   * Export logs for analysis
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = [
        'ID', 'Type', 'Severity', 'Message', 'Technical Message',
        'Timestamp', 'Session ID', 'User ID', 'URL', 'Resolved'
      ];
      
      const rows = this.logs.map(log => [
        log.id,
        log.error.type,
        log.error.severity,
        log.error.userMessage,
        log.error.technicalMessage,
        log.timestamp.toISOString(),
        log.sessionId,
        log.userId || '',
        log.url,
        log.resolved.toString(),
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get current session information
   */
  getSessionInfo(): {
    sessionId: string;
    startTime: Date;
    errorCount: number;
    lastError?: Date;
  } {
    const sessionLogs = this.logs.filter(log => log.sessionId === this.sessionId);
    const lastError = sessionLogs.length > 0 
      ? new Date(Math.max(...sessionLogs.map(log => log.timestamp.getTime())))
      : undefined;

    return {
      sessionId: this.sessionId,
      startTime: new Date(), // This would be tracked from session start in a real implementation
      errorCount: sessionLogs.length,
      lastError,
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private trimLogs(): void {
    if (this.logs.length > this.maxLogs) {
      // Keep the most recent logs
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = new Error(event.reason?.message || 'Unhandled promise rejection');
      const context: ErrorContext = {
        action: 'unhandled_promise_rejection',
        timestamp: new Date(),
        url: window.location.href,
        additionalData: {
          reason: event.reason,
          promise: event.promise,
        },
      };

      // Don't log if it's already an AppError (to avoid double logging)
      if (!event.reason?.type) {
        this.logError(error as any, context);
      }
    });

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      const error = new Error(event.message);
      const context: ErrorContext = {
        action: 'global_javascript_error',
        timestamp: new Date(),
        url: window.location.href,
        additionalData: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
        },
      };

      this.logError(error as any, context);
    });
  }

  private enableConsoleLogging(): void {
    // Override console.error to capture manual error logs
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      // Call original console.error
      originalConsoleError.apply(console, args);

      // Log structured errors
      args.forEach(arg => {
        if (arg instanceof Error && !arg.hasOwnProperty('type')) {
          const context: ErrorContext = {
            action: 'console_error',
            timestamp: new Date(),
            url: window.location.href,
            additionalData: { consoleArgs: args },
          };

          this.logError(arg as any, context);
        }
      });
    };
  }

  private async reportError(errorLog: ErrorLog): Promise<void> {
    if (!this.reportingEndpoint) return;

    try {
      await fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...ErrorNotification.formatForLogging(errorLog.error),
          logId: errorLog.id,
          sessionId: errorLog.sessionId,
          userId: errorLog.userId,
          url: errorLog.url,
          userAgent: errorLog.userAgent,
        }),
      });
    } catch (error) {
      // Silently fail to avoid infinite error loops
      console.warn('Failed to report error to external service:', error);
    }
  }
}

// Create singleton instance
export const errorLoggingService = new ErrorLoggingService();

// Export types and service
export type { ErrorLog, ErrorMetrics };
export { ErrorLoggingService };