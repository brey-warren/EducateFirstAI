/**
 * Security Service for EducateFirstAI
 * Handles HTTPS/TLS configuration, security headers, and secure communication
 */

export interface SecurityConfig {
  enforceHTTPS: boolean;
  securityHeaders: Record<string, string>;
  corsPolicy: {
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
  };
}

export interface SecureRequestOptions {
  timeout: number;
  retries: number;
  validateCertificate: boolean;
  headers: Record<string, string>;
}

export class SecurityService {
  private static readonly SECURITY_HEADERS = {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.amazonaws.com",
  };

  /**
   * Get security configuration for the application
   */
  static getSecurityConfig(): SecurityConfig {
    return {
      enforceHTTPS: true,
      securityHeaders: this.SECURITY_HEADERS,
      corsPolicy: {
        allowedOrigins: this.getAllowedOrigins(),
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key'],
      },
    };
  }

  /**
   * Validate that a URL uses HTTPS
   */
  static validateHTTPS(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }

  /**
   * Create secure request options for API calls
   */
  static createSecureRequestOptions(additionalHeaders?: Record<string, string>): SecureRequestOptions {
    return {
      timeout: 30000, // 30 seconds
      retries: 3,
      validateCertificate: true,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'EducateFirstAI/1.0.0',
        ...this.getSecurityHeaders(),
        ...additionalHeaders,
      },
    };
  }

  /**
   * Sanitize headers to remove sensitive information
   */
  static sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers };
    
    // Remove sensitive headers from logs
    delete sanitized.Authorization;
    delete sanitized['X-Api-Key'];
    delete sanitized.Cookie;
    delete sanitized['Set-Cookie'];
    
    return sanitized;
  }

  /**
   * Validate API endpoint security
   */
  static validateEndpointSecurity(endpoint: string): { isSecure: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check HTTPS
    if (!this.validateHTTPS(endpoint)) {
      issues.push('Endpoint must use HTTPS protocol');
    }
    
    // Check for AWS endpoints
    if (!endpoint.includes('amazonaws.com') && !endpoint.includes('localhost')) {
      issues.push('Endpoint should be an AWS service or localhost for development');
    }
    
    return {
      isSecure: issues.length === 0,
      issues,
    };
  }

  /**
   * Create secure fetch wrapper with automatic HTTPS enforcement
   */
  static async secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
    // Enforce HTTPS
    if (!this.validateHTTPS(url)) {
      throw new Error('HTTPS is required for all API communications');
    }
    
    // Add security headers
    const secureOptions: RequestInit = {
      ...options,
      headers: {
        ...this.getSecurityHeaders(),
        ...options.headers,
      },
    };
    
    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      const response = await fetch(url, {
        ...secureOptions,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Generate Content Security Policy for the application
   */
  static generateCSP(): string {
    const directives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // Allow inline scripts for React
      "style-src 'self' 'unsafe-inline'", // Allow inline styles for CSS-in-JS
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.amazonaws.com", // Allow AWS API calls
      "font-src 'self' data:",
      "object-src 'none'",
      "media-src 'self'",
      "frame-src 'none'",
    ];
    
    return directives.join('; ');
  }

  /**
   * Validate request origin for CORS
   */
  static validateOrigin(origin: string): boolean {
    const allowedOrigins = this.getAllowedOrigins();
    return allowedOrigins.includes(origin) || allowedOrigins.includes('*');
  }

  /**
   * Create security audit log entry
   */
  static createSecurityAuditLog(event: string, details: any): any {
    return {
      timestamp: new Date().toISOString(),
      event,
      severity: this.getEventSeverity(event),
      details: this.sanitizeAuditDetails(details),
      source: 'EducateFirstAI-Security',
    };
  }

  /**
   * Check if request is from a secure context
   */
  static isSecureContext(): boolean {
    // In browser environment
    if (typeof window !== 'undefined') {
      return window.isSecureContext || window.location.protocol === 'https:';
    }
    
    // In Node.js environment (Lambda)
    return true; // AWS Lambda runs in secure context
  }

  private static getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };
  }

  private static getAllowedOrigins(): string[] {
    const isDevelopment = import.meta.env?.DEV;
    
    if (isDevelopment) {
      return [
        'http://localhost:3000',
        'http://localhost:5173', // Vite dev server
        'https://localhost:3000',
        'https://localhost:5173',
      ];
    }
    
    return [
      'https://*.amplifyapp.com', // AWS Amplify domains
      'https://*.amazonaws.com', // AWS services
    ];
  }

  private static getEventSeverity(event: string): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'https_violation': 'high',
      'cors_violation': 'medium',
      'invalid_origin': 'medium',
      'security_header_missing': 'low',
      'pii_detected': 'high',
      'ferpa_violation': 'critical',
      'unauthorized_access': 'critical',
    };
    
    return severityMap[event] || 'medium';
  }

  private static sanitizeAuditDetails(details: any): any {
    const sanitized = { ...details };
    
    // Remove sensitive information from audit logs
    if (sanitized.headers) {
      sanitized.headers = this.sanitizeHeaders(sanitized.headers);
    }
    
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.accessToken;
    delete sanitized.personalData;
    
    return sanitized;
  }
}