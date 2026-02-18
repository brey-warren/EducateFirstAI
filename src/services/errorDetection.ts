import { 
  ErrorDetectionInput, 
  ErrorDetectionResult, 
  DetectedError, 
  FAFSAErrorPattern,
  ChecklistItem 
} from '../types/errors';
import { FAFSA_ERROR_PATTERNS, FAFSA_SECTION_CHECKLISTS } from '../data/fafsaErrorPatterns';

export class FAFSAErrorDetectionService {
  private static patterns: FAFSAErrorPattern[] = FAFSA_ERROR_PATTERNS;

  /**
   * Detect potential FAFSA errors in user input
   */
  static detectErrors(input: ErrorDetectionInput): ErrorDetectionResult {
    const { userInput, section, field } = input;
    const detectedErrors: DetectedError[] = [];
    const warnings: DetectedError[] = [];
    const suggestions: string[] = [];

    // Normalize input for pattern matching
    const normalizedInput = userInput.toLowerCase().trim();

    // Check each error pattern
    for (const pattern of this.patterns) {
      // Filter by section if specified
      if (section && pattern.section !== section) continue;
      
      // Filter by field if specified
      if (field && pattern.field && pattern.field !== field) continue;

      // Check if any pattern matches
      const matchScore = this.calculateMatchScore(normalizedInput, pattern);
      
      if (matchScore > 0.3) { // Threshold for detection
        const detectedError: DetectedError = {
          patternId: pattern.id,
          errorType: pattern.errorType,
          severity: pattern.severity,
          section: pattern.section,
          field: pattern.field,
          message: this.generateErrorMessage(pattern, normalizedInput),
          solution: pattern.solution,
          confidence: matchScore,
          context: userInput,
          timestamp: new Date()
        };

        if (pattern.severity === 'critical') {
          detectedErrors.push(detectedError);
        } else {
          warnings.push(detectedError);
        }

        // Add prevention tips as suggestions
        suggestions.push(...pattern.preventionTips);
      }
    }

    // Get section checklist if section is specified
    const checklist = section ? this.getSectionChecklist(section) : undefined;

    // Add general suggestions based on common patterns
    if (detectedErrors.length === 0 && warnings.length === 0) {
      suggestions.push(...this.getGeneralSuggestions(normalizedInput, section));
    }

    return {
      hasErrors: detectedErrors.length > 0 || warnings.length > 0,
      errors: detectedErrors,
      warnings: warnings,
      suggestions: [...new Set(suggestions)], // Remove duplicates
      checklist
    };
  }

  /**
   * Get field-specific warnings for a FAFSA field
   */
  static getFieldWarnings(field: string, section?: string): DetectedError[] {
    const fieldPatterns = this.patterns.filter(pattern => 
      pattern.field === field && (!section || pattern.section === section)
    );

    return fieldPatterns.map(pattern => ({
      patternId: pattern.id,
      errorType: pattern.errorType,
      severity: 'info' as const,
      section: pattern.section,
      field: pattern.field,
      message: `Common issue with ${field}: ${pattern.description}`,
      solution: pattern.solution,
      confidence: 1.0,
      timestamp: new Date()
    }));
  }

  /**
   * Get checklist for a specific FAFSA section
   */
  static getSectionChecklist(section: string): ChecklistItem[] {
    const sectionKey = section as keyof typeof FAFSA_SECTION_CHECKLISTS;
    return FAFSA_SECTION_CHECKLISTS[sectionKey] || [];
  }

  /**
   * Get all available checklists
   */
  static getAllChecklists(): Record<string, ChecklistItem[]> {
    return FAFSA_SECTION_CHECKLISTS;
  }

  /**
   * Calculate match score between user input and error pattern
   */
  private static calculateMatchScore(input: string, pattern: FAFSAErrorPattern): number {
    let score = 0;
    let matches = 0;

    for (const patternStr of pattern.patterns) {
      try {
        // Try as regex first
        const regex = new RegExp(patternStr, 'i');
        if (regex.test(input)) {
          matches++;
          score += 0.8; // High score for regex match
        }
      } catch {
        // Fall back to simple string matching
        if (input.includes(patternStr.toLowerCase())) {
          matches++;
          score += 0.6; // Medium score for string match
        }
      }
    }

    // Special handling for SSN format errors
    if (pattern.id === 'ssn_format_error') {
      // Look for SSN with dashes (incorrect format)
      if (/\d{3}-\d{2}-\d{4}/.test(input)) {
        score += 0.9;
        matches++;
      }
      // Look for mentions of SSN
      if (/ssn|social security/i.test(input)) {
        score += 0.3;
      }
    }

    // Special handling for dependency status confusion
    if (pattern.id === 'dependency_status_confusion') {
      // Look for independence-related keywords
      if (/independent|live with parents|parents support|under 24/i.test(input)) {
        score += 0.5;
        matches++;
      }
    }

    // Check for keyword matches in description and common causes
    const keywords = [
      ...pattern.description.toLowerCase().split(' '),
      ...pattern.commonCauses.join(' ').toLowerCase().split(' ')
    ].filter(word => word.length > 3); // Only consider words longer than 3 chars

    for (const keyword of keywords) {
      if (input.includes(keyword)) {
        score += 0.1; // Small boost for keyword matches
      }
    }

    // Normalize score based on number of patterns
    return Math.min(score / Math.max(pattern.patterns.length, 1), 1.0);
  }

  /**
   * Generate contextual error message
   */
  private static generateErrorMessage(pattern: FAFSAErrorPattern, input: string): string {
    const baseMessage = pattern.description;
    
    // Add context-specific details
    if (pattern.errorType === 'incorrect_format' && input.includes('-')) {
      return `${baseMessage}. Remove dashes and spaces from your entry.`;
    }
    
    if (pattern.errorType === 'missing_information') {
      return `${baseMessage}. This information is required to process your FAFSA.`;
    }

    if (pattern.severity === 'critical') {
      return `⚠️ ${baseMessage}. This must be corrected before submitting your FAFSA.`;
    }

    return baseMessage;
  }

  /**
   * Get general suggestions based on input content
   */
  private static getGeneralSuggestions(input: string, section?: string): string[] {
    const suggestions: string[] = [];

    // General FAFSA tips based on input content
    if (input.includes('deadline') || input.includes('due')) {
      suggestions.push('Submit your FAFSA as early as possible to maximize aid opportunities');
    }

    if (input.includes('parent') && section === 'dependency-status') {
      suggestions.push('Most students under 24 are considered dependent and need parent information');
    }

    if (input.includes('tax') || input.includes('income')) {
      suggestions.push('Use exact figures from your completed tax return when possible');
      suggestions.push('Consider using the IRS Data Retrieval Tool for accuracy');
    }

    if (input.includes('asset') || input.includes('savings')) {
      suggestions.push('Don\'t report retirement accounts or your primary residence as assets');
    }

    if (input.includes('school') || input.includes('college')) {
      suggestions.push('Use the Federal School Code search to find correct 6-digit codes');
    }

    return suggestions;
  }

  /**
   * Validate error detection input
   */
  static validateInput(input: any): ErrorDetectionInput {
    // This would use the Zod schema in a real implementation
    if (!input.userInput || typeof input.userInput !== 'string') {
      throw new Error('User input is required and must be a string');
    }

    return {
      userInput: input.userInput.trim(),
      section: input.section,
      field: input.field,
      context: input.context
    };
  }

  /**
   * Get error statistics for monitoring
   */
  static getErrorStats(): {
    totalPatterns: number;
    patternsByType: Record<string, number>;
    patternsBySeverity: Record<string, number>;
    patternsBySection: Record<string, number>;
  } {
    const stats = {
      totalPatterns: this.patterns.length,
      patternsByType: {} as Record<string, number>,
      patternsBySeverity: {} as Record<string, number>,
      patternsBySection: {} as Record<string, number>
    };

    for (const pattern of this.patterns) {
      // Count by error type
      stats.patternsByType[pattern.errorType] = 
        (stats.patternsByType[pattern.errorType] || 0) + 1;

      // Count by severity
      stats.patternsBySeverity[pattern.severity] = 
        (stats.patternsBySeverity[pattern.severity] || 0) + 1;

      // Count by section
      stats.patternsBySection[pattern.section] = 
        (stats.patternsBySection[pattern.section] || 0) + 1;
    }

    return stats;
  }
}