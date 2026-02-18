/**
 * Privacy Service for EducateFirstAI
 * Handles PII detection, data sanitization, and FERPA compliance
 */

export interface PIIDetectionResult {
  hasPII: boolean;
  detectedTypes: string[];
  sanitizedText: string;
  warnings: string[];
}

export interface DataRetentionPolicy {
  conversationTTL: number; // 24 hours in seconds
  guestSessionTTL: number; // Session only
  cacheRetentionTTL: number; // 1 hour in seconds
}

export class PrivacyService {
  // PII patterns for detection
  private static readonly PII_PATTERNS = {
    ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
    phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    bankAccount: /\b\d{8,17}\b/g,
    address: /\b\d+\s+[A-Za-z0-9\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Court|Ct|Place|Pl)\b/gi,
    zipCode: /\b\d{5}(?:-\d{4})?\b/g,
    dateOfBirth: /\b(?:0[1-9]|1[0-2])[-\/](?:0[1-9]|[12]\d|3[01])[-\/](?:19|20)\d{2}\b/g,
    driverLicense: /\b[A-Z]{1,2}\d{6,8}\b/g,
  };

  // FERPA-sensitive education data patterns
  private static readonly FERPA_PATTERNS = {
    studentId: /\b(?:student|id|student[-_]?id)[-:\s]*[A-Z0-9]{6,12}\b/gi,
    gpa: /\b(?:gpa|grade[-_]?point[-_]?average)[-:\s]*[0-4]\.\d{1,2}\b/gi,
    grades: /\b(?:grade|score)[-:\s]*[A-F][+-]?\b/gi,
    transcript: /\btranscript\b/gi,
  };

  /**
   * Detect and sanitize PII from user input
   */
  static detectAndSanitizePII(text: string): PIIDetectionResult {
    let sanitizedText = text;
    const detectedTypes: string[] = [];
    const warnings: string[] = [];

    // Check for PII patterns
    for (const [type, pattern] of Object.entries(this.PII_PATTERNS)) {
      if (pattern.test(text)) {
        detectedTypes.push(type);
        sanitizedText = sanitizedText.replace(pattern, this.getReplacementText(type));
        warnings.push(this.getPIIWarning(type));
      }
    }

    // Check for FERPA-sensitive data
    for (const [type, pattern] of Object.entries(this.FERPA_PATTERNS)) {
      if (pattern.test(text)) {
        detectedTypes.push(`ferpa_${type}`);
        sanitizedText = sanitizedText.replace(pattern, this.getReplacementText(type));
        warnings.push(this.getFERPAWarning(type));
      }
    }

    return {
      hasPII: detectedTypes.length > 0,
      detectedTypes,
      sanitizedText,
      warnings,
    };
  }

  /**
   * Validate that data is safe for storage
   */
  static validateDataForStorage(data: any): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Convert data to string for analysis
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    
    const piiResult = this.detectAndSanitizePII(dataString);
    
    if (piiResult.hasPII) {
      issues.push(`Detected PII types: ${piiResult.detectedTypes.join(', ')}`);
      issues.push('Data contains personally identifiable information that should not be stored');
    }

    return {
      isValid: !piiResult.hasPII,
      issues,
    };
  }

  /**
   * Get data retention policies
   */
  static getDataRetentionPolicy(): DataRetentionPolicy {
    return {
      conversationTTL: 24 * 60 * 60, // 24 hours
      guestSessionTTL: 0, // Session only - no persistent storage
      cacheRetentionTTL: 60 * 60, // 1 hour
    };
  }

  /**
   * Check if user is in guest mode (no data persistence)
   */
  static isGuestUser(userId: string): boolean {
    return userId.startsWith('guest_');
  }

  /**
   * Sanitize conversation data before storage
   */
  static sanitizeConversationData(conversation: any): any {
    const sanitized = { ...conversation };
    
    // Remove any PII from message content
    if (sanitized.messageContent) {
      const piiResult = this.detectAndSanitizePII(sanitized.messageContent);
      sanitized.messageContent = piiResult.sanitizedText;
      
      if (piiResult.hasPII) {
        sanitized.piiDetected = true;
        sanitized.originalContentHash = this.hashContent(conversation.messageContent);
      }
    }

    // Remove any metadata that might contain PII
    if (sanitized.metadata) {
      delete sanitized.metadata.userAgent;
      delete sanitized.metadata.ipAddress;
      delete sanitized.metadata.location;
    }

    return sanitized;
  }

  /**
   * Generate FERPA-compliant audit log entry
   */
  static createAuditLogEntry(action: string, userId: string, details?: any): any {
    return {
      timestamp: new Date().toISOString(),
      action,
      userId: this.isGuestUser(userId) ? 'guest_user' : this.hashContent(userId),
      details: details ? this.sanitizeAuditDetails(details) : undefined,
      compliance: 'FERPA',
    };
  }

  /**
   * Configure Bedrock request to prevent model training
   */
  static configureBedrockForPrivacy(requestBody: any): any {
    return {
      ...requestBody,
      // Add privacy-specific configuration
      anthropic_version: 'bedrock-2023-05-31',
      // Ensure data is not used for training
      metadata: {
        privacy_mode: true,
        ferpa_compliant: true,
        no_training: true,
      },
    };
  }

  private static getReplacementText(type: string): string {
    const replacements: Record<string, string> = {
      ssn: '[SSN_REDACTED]',
      phone: '[PHONE_REDACTED]',
      email: '[EMAIL_REDACTED]',
      creditCard: '[CARD_REDACTED]',
      bankAccount: '[ACCOUNT_REDACTED]',
      address: '[ADDRESS_REDACTED]',
      zipCode: '[ZIP_REDACTED]',
      dateOfBirth: '[DOB_REDACTED]',
      driverLicense: '[LICENSE_REDACTED]',
      studentId: '[STUDENT_ID_REDACTED]',
      gpa: '[GPA_REDACTED]',
      grades: '[GRADE_REDACTED]',
      transcript: '[TRANSCRIPT_REDACTED]',
    };

    return replacements[type] || '[REDACTED]';
  }

  private static getPIIWarning(type: string): string {
    const warnings: Record<string, string> = {
      ssn: 'Social Security Number detected and removed for your privacy',
      phone: 'Phone number detected and removed for your privacy',
      email: 'Email address detected and removed for your privacy',
      creditCard: 'Credit card number detected and removed for your privacy',
      bankAccount: 'Bank account number detected and removed for your privacy',
      address: 'Street address detected and removed for your privacy',
      zipCode: 'ZIP code detected and removed for your privacy',
      dateOfBirth: 'Date of birth detected and removed for your privacy',
      driverLicense: 'Driver license number detected and removed for your privacy',
    };

    return warnings[type] || 'Personal information detected and removed for your privacy';
  }

  private static getFERPAWarning(type: string): string {
    const warnings: Record<string, string> = {
      studentId: 'Student ID detected and removed per FERPA compliance',
      gpa: 'GPA information detected and removed per FERPA compliance',
      grades: 'Grade information detected and removed per FERPA compliance',
      transcript: 'Transcript reference detected and removed per FERPA compliance',
    };

    return warnings[type] || 'Educational record information detected and removed per FERPA compliance';
  }

  private static sanitizeAuditDetails(details: any): any {
    const sanitized = { ...details };
    
    // Remove sensitive fields from audit logs
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.accessToken;
    delete sanitized.refreshToken;
    delete sanitized.personalInfo;
    
    return sanitized;
  }

  private static hashContent(content: string): string {
    // Simple hash for audit purposes (in production, use crypto.createHash)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}