/**
 * System Health Check Utility
 * Verifies all components and services are working correctly
 */

import { AuthService } from '../services/auth';
import { SecurityService } from '../services/security';
import { PrivacyService } from '../services/privacy';
import { config } from '../config/environment';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  details?: any;
  timestamp: Date;
}

export interface SystemHealthReport {
  overall: 'healthy' | 'warning' | 'error';
  checks: HealthCheckResult[];
  timestamp: Date;
  environment: string;
}

export class SystemHealthChecker {
  /**
   * Run comprehensive system health check
   */
  static async runHealthCheck(): Promise<SystemHealthReport> {
    const checks: HealthCheckResult[] = [];
    const timestamp = new Date();

    // Check environment configuration
    checks.push(await this.checkEnvironmentConfig());

    // Check API connectivity
    checks.push(await this.checkAPIConnectivity());

    // Check authentication service
    checks.push(await this.checkAuthenticationService());

    // Check security configuration
    checks.push(await this.checkSecurityConfiguration());

    // Check privacy compliance
    checks.push(await this.checkPrivacyCompliance());

    // Check browser compatibility
    checks.push(await this.checkBrowserCompatibility());

    // Check accessibility features
    checks.push(await this.checkAccessibilityFeatures());

    // Check local storage
    checks.push(await this.checkLocalStorage());

    // Check network connectivity
    checks.push(await this.checkNetworkConnectivity());

    // Determine overall health
    const hasErrors = checks.some(check => check.status === 'error');
    const hasWarnings = checks.some(check => check.status === 'warning');
    
    const overall = hasErrors ? 'error' : hasWarnings ? 'warning' : 'healthy';

    return {
      overall,
      checks,
      timestamp,
      environment: config.isProduction ? 'production' : 'development',
    };
  }

  /**
   * Check environment configuration
   */
  private static async checkEnvironmentConfig(): Promise<HealthCheckResult> {
    try {
      const requiredVars = [
        'VITE_API_GATEWAY_URL',
        'VITE_USER_POOL_ID',
        'VITE_USER_POOL_CLIENT_ID',
        'VITE_AWS_REGION',
      ];

      const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);

      if (missingVars.length > 0) {
        return {
          service: 'Environment Configuration',
          status: 'error',
          message: `Missing required environment variables: ${missingVars.join(', ')}`,
          details: { missingVars },
          timestamp: new Date(),
        };
      }

      // Check if URLs are valid
      const apiUrl = config.api.baseUrl;
      if (apiUrl && !SecurityService.validateHTTPS(apiUrl) && !apiUrl.includes('localhost')) {
        return {
          service: 'Environment Configuration',
          status: 'warning',
          message: 'API URL is not using HTTPS in production',
          details: { apiUrl },
          timestamp: new Date(),
        };
      }

      return {
        service: 'Environment Configuration',
        status: 'healthy',
        message: 'All required environment variables are configured',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        service: 'Environment Configuration',
        status: 'error',
        message: `Failed to check environment configuration: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check API connectivity
   */
  private static async checkAPIConnectivity(): Promise<HealthCheckResult> {
    try {
      if (!config.api.baseUrl) {
        return {
          service: 'API Connectivity',
          status: 'error',
          message: 'API base URL is not configured',
          timestamp: new Date(),
        };
      }

      // Test basic connectivity with a simple request
      const response = await fetch(`${config.api.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (response.ok) {
        return {
          service: 'API Connectivity',
          status: 'healthy',
          message: 'API is reachable and responding',
          details: { status: response.status },
          timestamp: new Date(),
        };
      } else {
        return {
          service: 'API Connectivity',
          status: 'warning',
          message: `API returned status ${response.status}`,
          details: { status: response.status },
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        service: 'API Connectivity',
        status: 'error',
        message: `Failed to connect to API: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check authentication service
   */
  private static async checkAuthenticationService(): Promise<HealthCheckResult> {
    try {
      // Check if user is already authenticated
      const currentUser = AuthService.getCurrentUser();
      const isAuthenticated = AuthService.isAuthenticated();

      // Test guest mode functionality
      const guestResult = await AuthService.continueAsGuest();
      
      if (guestResult.user && guestResult.user.isGuest) {
        return {
          service: 'Authentication Service',
          status: 'healthy',
          message: 'Authentication service is working correctly',
          details: { 
            currentUser: currentUser?.userId || 'none',
            isAuthenticated,
            guestModeWorking: true,
          },
          timestamp: new Date(),
        };
      } else {
        return {
          service: 'Authentication Service',
          status: 'warning',
          message: 'Guest mode may not be working correctly',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        service: 'Authentication Service',
        status: 'error',
        message: `Authentication service error: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check security configuration
   */
  private static async checkSecurityConfiguration(): Promise<HealthCheckResult> {
    try {
      const securityConfig = SecurityService.getSecurityConfig();
      const isSecureContext = SecurityService.isSecureContext();

      const issues: string[] = [];

      // Check HTTPS enforcement
      if (!securityConfig.enforceHTTPS && config.isProduction) {
        issues.push('HTTPS enforcement is disabled in production');
      }

      // Check secure context
      if (!isSecureContext && config.isProduction) {
        issues.push('Application is not running in a secure context');
      }

      // Check security headers
      const requiredHeaders = ['Strict-Transport-Security', 'X-Content-Type-Options', 'X-Frame-Options'];
      const missingHeaders = requiredHeaders.filter(header => !securityConfig.securityHeaders[header]);
      
      if (missingHeaders.length > 0) {
        issues.push(`Missing security headers: ${missingHeaders.join(', ')}`);
      }

      if (issues.length > 0) {
        return {
          service: 'Security Configuration',
          status: 'warning',
          message: `Security issues detected: ${issues.join('; ')}`,
          details: { issues },
          timestamp: new Date(),
        };
      }

      return {
        service: 'Security Configuration',
        status: 'healthy',
        message: 'Security configuration is properly set up',
        details: { 
          httpsEnforced: securityConfig.enforceHTTPS,
          secureContext: isSecureContext,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        service: 'Security Configuration',
        status: 'error',
        message: `Failed to check security configuration: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check privacy compliance
   */
  private static async checkPrivacyCompliance(): Promise<HealthCheckResult> {
    try {
      // Test PII detection
      const testText = "My SSN is 123-45-6789 and my email is test@example.com";
      const piiResult = PrivacyService.detectAndSanitizePII(testText);

      if (!piiResult.hasPII || piiResult.detectedTypes.length === 0) {
        return {
          service: 'Privacy Compliance',
          status: 'error',
          message: 'PII detection is not working correctly',
          timestamp: new Date(),
        };
      }

      // Test data validation
      const validationResult = PrivacyService.validateDataForStorage({ content: testText });
      
      if (validationResult.isValid) {
        return {
          service: 'Privacy Compliance',
          status: 'error',
          message: 'Data validation is not preventing PII storage',
          timestamp: new Date(),
        };
      }

      // Check data retention policy
      const retentionPolicy = PrivacyService.getDataRetentionPolicy();
      
      if (retentionPolicy.conversationTTL !== 24 * 60 * 60) {
        return {
          service: 'Privacy Compliance',
          status: 'warning',
          message: 'Conversation TTL is not set to 24 hours as required by FERPA',
          details: { actualTTL: retentionPolicy.conversationTTL },
          timestamp: new Date(),
        };
      }

      return {
        service: 'Privacy Compliance',
        status: 'healthy',
        message: 'Privacy compliance features are working correctly',
        details: {
          piiDetectionWorking: true,
          dataValidationWorking: true,
          ferpaCompliant: true,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        service: 'Privacy Compliance',
        status: 'error',
        message: `Failed to check privacy compliance: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check browser compatibility
   */
  private static async checkBrowserCompatibility(): Promise<HealthCheckResult> {
    try {
      const issues: string[] = [];

      // Check for required APIs
      if (!window.fetch) {
        issues.push('Fetch API not supported');
      }

      if (!window.localStorage) {
        issues.push('Local Storage not supported');
      }

      if (!window.AbortController) {
        issues.push('AbortController not supported');
      }

      if (!window.IntersectionObserver) {
        issues.push('IntersectionObserver not supported');
      }

      // Check for modern JavaScript features
      try {
        // Test async/await
        await Promise.resolve();
        
        // Test arrow functions and destructuring
        const test = { a: 1 };
        const { a } = test;
        const arrow = () => a;
        arrow();
      } catch {
        issues.push('Modern JavaScript features not supported');
      }

      if (issues.length > 0) {
        return {
          service: 'Browser Compatibility',
          status: 'warning',
          message: `Browser compatibility issues: ${issues.join(', ')}`,
          details: { issues },
          timestamp: new Date(),
        };
      }

      return {
        service: 'Browser Compatibility',
        status: 'healthy',
        message: 'Browser supports all required features',
        details: {
          userAgent: navigator.userAgent,
          language: navigator.language,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        service: 'Browser Compatibility',
        status: 'error',
        message: `Failed to check browser compatibility: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check accessibility features
   */
  private static async checkAccessibilityFeatures(): Promise<HealthCheckResult> {
    try {
      const issues: string[] = [];

      // Check for screen reader support
      if (!document.querySelector('[aria-live]')) {
        issues.push('No live regions found for screen reader announcements');
      }

      // Check for skip links
      if (!document.querySelector('.skip-link')) {
        issues.push('No skip links found for keyboard navigation');
      }

      // Check for proper heading structure
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      if (headings.length === 0) {
        issues.push('No heading structure found');
      }

      // Check for alt text on images
      const images = document.querySelectorAll('img:not([alt])');
      if (images.length > 0) {
        issues.push(`${images.length} images missing alt text`);
      }

      if (issues.length > 0) {
        return {
          service: 'Accessibility Features',
          status: 'warning',
          message: `Accessibility issues found: ${issues.join(', ')}`,
          details: { issues },
          timestamp: new Date(),
        };
      }

      return {
        service: 'Accessibility Features',
        status: 'healthy',
        message: 'Accessibility features are properly implemented',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        service: 'Accessibility Features',
        status: 'error',
        message: `Failed to check accessibility features: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check local storage functionality
   */
  private static async checkLocalStorage(): Promise<HealthCheckResult> {
    try {
      const testKey = 'health_check_test';
      const testValue = 'test_value';

      // Test write
      localStorage.setItem(testKey, testValue);

      // Test read
      const retrievedValue = localStorage.getItem(testKey);

      // Test delete
      localStorage.removeItem(testKey);

      if (retrievedValue !== testValue) {
        return {
          service: 'Local Storage',
          status: 'error',
          message: 'Local storage read/write test failed',
          timestamp: new Date(),
        };
      }

      return {
        service: 'Local Storage',
        status: 'healthy',
        message: 'Local storage is working correctly',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        service: 'Local Storage',
        status: 'error',
        message: `Local storage error: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check network connectivity
   */
  private static async checkNetworkConnectivity(): Promise<HealthCheckResult> {
    try {
      // Check online status
      const isOnline = navigator.onLine;

      if (!isOnline) {
        return {
          service: 'Network Connectivity',
          status: 'warning',
          message: 'Browser reports offline status',
          timestamp: new Date(),
        };
      }

      // Test actual connectivity with a simple request
      const response = await fetch('https://httpbin.org/get', {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        return {
          service: 'Network Connectivity',
          status: 'healthy',
          message: 'Network connectivity is working',
          details: { responseTime: response.headers.get('x-response-time') },
          timestamp: new Date(),
        };
      } else {
        return {
          service: 'Network Connectivity',
          status: 'warning',
          message: `Network test returned status ${response.status}`,
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        service: 'Network Connectivity',
        status: 'error',
        message: `Network connectivity test failed: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Generate health report summary
   */
  static generateHealthSummary(report: SystemHealthReport): string {
    const { overall, checks } = report;
    const healthyCount = checks.filter(c => c.status === 'healthy').length;
    const warningCount = checks.filter(c => c.status === 'warning').length;
    const errorCount = checks.filter(c => c.status === 'error').length;

    let summary = `System Health: ${overall.toUpperCase()}\n`;
    summary += `✅ Healthy: ${healthyCount}\n`;
    summary += `⚠️  Warnings: ${warningCount}\n`;
    summary += `❌ Errors: ${errorCount}\n\n`;

    if (warningCount > 0 || errorCount > 0) {
      summary += 'Issues:\n';
      checks
        .filter(c => c.status !== 'healthy')
        .forEach(check => {
          const icon = check.status === 'error' ? '❌' : '⚠️';
          summary += `${icon} ${check.service}: ${check.message}\n`;
        });
    }

    return summary;
  }
}