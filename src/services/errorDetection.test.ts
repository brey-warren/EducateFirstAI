import { describe, it, expect } from 'vitest';
import { FAFSAErrorDetectionService } from './errorDetection';

describe('FAFSAErrorDetectionService', () => {
  describe('detectErrors', () => {
    it('should detect SSN format errors', () => {
      const result = FAFSAErrorDetectionService.detectErrors({
        userInput: 'My SSN is 123-45-6789',
        section: 'student-demographics',
        field: 'ssn'
      });

      expect(result.hasErrors).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].errorType).toBe('incorrect_format');
    });

    it('should detect dependency status confusion', () => {
      const result = FAFSAErrorDetectionService.detectErrors({
        userInput: 'I want to be independent but I live with parents and am under 24',
        section: 'dependency-status'
      });

      expect(result.hasErrors || result.warnings.length > 0).toBe(true);
    });

    it('should provide suggestions for valid input', () => {
      const result = FAFSAErrorDetectionService.detectErrors({
        userInput: 'I need help with my tax information',
        section: 'student-finances'
      });

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some(s => s.includes('tax'))).toBe(true);
    });

    it('should return empty results for unrelated input', () => {
      const result = FAFSAErrorDetectionService.detectErrors({
        userInput: 'Hello world'
      });

      expect(result.hasErrors).toBe(false);
      expect(result.errors.length).toBe(0);
      expect(result.warnings.length).toBe(0);
    });
  });

  describe('getFieldWarnings', () => {
    it('should return warnings for SSN field', () => {
      const warnings = FAFSAErrorDetectionService.getFieldWarnings('ssn', 'student-demographics');
      
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].field).toBe('ssn');
    });
  });

  describe('getSectionChecklist', () => {
    it('should return checklist for student demographics', () => {
      const checklist = FAFSAErrorDetectionService.getSectionChecklist('student-demographics');
      
      expect(checklist.length).toBeGreaterThan(0);
      expect(checklist[0].section).toBe('student-demographics');
    });

    it('should return empty array for unknown section', () => {
      const checklist = FAFSAErrorDetectionService.getSectionChecklist('unknown-section');
      
      expect(checklist.length).toBe(0);
    });
  });

  describe('validateInput', () => {
    it('should validate correct input', () => {
      const input = {
        userInput: 'Test input',
        section: 'test-section'
      };

      const result = FAFSAErrorDetectionService.validateInput(input);
      expect(result.userInput).toBe('Test input');
      expect(result.section).toBe('test-section');
    });

    it('should throw error for invalid input', () => {
      expect(() => {
        FAFSAErrorDetectionService.validateInput({});
      }).toThrow('User input is required');
    });
  });

  describe('getErrorStats', () => {
    it('should return error statistics', () => {
      const stats = FAFSAErrorDetectionService.getErrorStats();
      
      expect(stats.totalPatterns).toBeGreaterThan(0);
      expect(typeof stats.patternsByType).toBe('object');
      expect(typeof stats.patternsBySeverity).toBe('object');
      expect(typeof stats.patternsBySection).toBe('object');
    });
  });
});