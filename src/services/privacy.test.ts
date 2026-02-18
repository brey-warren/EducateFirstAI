/**
 * Property-based tests for privacy and data protection
 * Feature: educate-first-ai
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { PrivacyService } from './privacy';

describe('Privacy Service Property Tests', () => {
  // Property 14: PII Exclusion
  // **Validates: Requirements 6.2**
  it('Property 14: PII Exclusion - should detect and sanitize PII from any user input', () => {
    // Test with valid SSN
    fc.assert(fc.property(
      fc.tuple(
        fc.integer({ min: 100, max: 999 }),
        fc.integer({ min: 10, max: 99 }),
        fc.integer({ min: 1000, max: 9999 })
      ),
      fc.string({ minLength: 0, maxLength: 100 }),
      ([area, group, serial], otherText) => {
        const ssn = `${area}-${group.toString().padStart(2, '0')}-${serial}`;
        const input = `${otherText} My SSN is ${ssn}`;
        const result = PrivacyService.detectAndSanitizePII(input);
        
        // Should detect PII
        expect(result.hasPII).toBe(true);
        expect(result.detectedTypes).toContain('ssn');
        
        // Should sanitize the SSN
        expect(result.sanitizedText).not.toContain(ssn);
        expect(result.sanitizedText).toContain('[SSN_REDACTED]');
        
        // Should provide warning
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings.some(w => w.includes('Social Security Number'))).toBe(true);
      }
    ), { numRuns: 50 });

    // Test with valid phone number
    fc.assert(fc.property(
      fc.tuple(
        fc.integer({ min: 200, max: 999 }),
        fc.integer({ min: 200, max: 999 }),
        fc.integer({ min: 1000, max: 9999 })
      ),
      fc.string({ minLength: 0, maxLength: 100 }),
      ([area, exchange, number], otherText) => {
        const phone = `${area}-${exchange}-${number}`;
        const input = `${otherText} Call me at ${phone}`;
        const result = PrivacyService.detectAndSanitizePII(input);
        
        // Should detect PII
        expect(result.hasPII).toBe(true);
        expect(result.detectedTypes).toContain('phone');
        
        // Should sanitize the phone
        expect(result.sanitizedText).not.toContain(phone);
        expect(result.sanitizedText).toContain('[PHONE_REDACTED]');
        
        // Should provide warning
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings.some(w => w.includes('Phone number'))).toBe(true);
      }
    ), { numRuns: 50 });

    // Test with valid email
    fc.assert(fc.property(
      fc.string({ minLength: 3, maxLength: 10 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
      fc.string({ minLength: 3, maxLength: 10 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
      fc.constantFrom('com', 'org', 'net', 'edu'),
      fc.string({ minLength: 0, maxLength: 100 }),
      (username, domain, tld, otherText) => {
        const email = `${username}@${domain}.${tld}`;
        const input = `${otherText} Email me at ${email}`;
        const result = PrivacyService.detectAndSanitizePII(input);
        
        // Should detect PII
        expect(result.hasPII).toBe(true);
        expect(result.detectedTypes).toContain('email');
        
        // Should sanitize the email
        expect(result.sanitizedText).not.toContain(email);
        expect(result.sanitizedText).toContain('[EMAIL_REDACTED]');
        
        // Should provide warning
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings.some(w => w.includes('Email address'))).toBe(true);
      }
    ), { numRuns: 50 });

    // Test with clean text (no PII)
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 1000 }).filter(s => 
        !s.match(/\b\d{3}-?\d{2}-?\d{4}\b/) && // No SSN
        !s.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/) && // No phone
        !s.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/) && // No email
        !s.match(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/) // No credit card
      ),
      (cleanText) => {
        const result = PrivacyService.detectAndSanitizePII(cleanText);
        
        // Should not detect PII
        expect(result.hasPII).toBe(false);
        expect(result.detectedTypes).toHaveLength(0);
        
        // Should not modify text
        expect(result.sanitizedText).toBe(cleanText);
        
        // Should not provide warnings
        expect(result.warnings).toHaveLength(0);
      }
    ), { numRuns: 50 });
  });

  it('should validate data for storage correctly', () => {
    fc.assert(fc.property(
      fc.record({
        content: fc.string({ minLength: 1, maxLength: 500 }),
        userId: fc.string({ minLength: 1, maxLength: 50 }),
        timestamp: fc.date(),
      }),
      (data) => {
        const result = PrivacyService.validateDataForStorage(data);
        
        // Result should have isValid boolean and issues array
        expect(typeof result.isValid).toBe('boolean');
        expect(Array.isArray(result.issues)).toBe(true);
        
        // If not valid, should have issues
        if (!result.isValid) {
          expect(result.issues.length).toBeGreaterThan(0);
        }
      }
    ), { numRuns: 100 });
  });

  it('should correctly identify guest users', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 50 }),
      (userId) => {
        const isGuest = PrivacyService.isGuestUser(userId);
        
        // Should return true only if userId starts with 'guest_'
        expect(isGuest).toBe(userId.startsWith('guest_'));
      }
    ), { numRuns: 100 });
  });

  it('should sanitize conversation data properly', () => {
    fc.assert(fc.property(
      fc.record({
        messageContent: fc.string({ minLength: 1, maxLength: 500 }),
        userId: fc.string({ minLength: 1, maxLength: 50 }),
        timestamp: fc.date(),
        metadata: fc.record({
          userAgent: fc.string(),
          ipAddress: fc.string(),
          location: fc.string(),
          sources: fc.array(fc.string()),
        }),
      }),
      (conversation) => {
        const sanitized = PrivacyService.sanitizeConversationData(conversation);
        
        // Should preserve structure
        expect(sanitized).toHaveProperty('messageContent');
        expect(sanitized).toHaveProperty('userId');
        expect(sanitized).toHaveProperty('timestamp');
        
        // Should remove sensitive metadata
        if (sanitized.metadata) {
          expect(sanitized.metadata).not.toHaveProperty('userAgent');
          expect(sanitized.metadata).not.toHaveProperty('ipAddress');
          expect(sanitized.metadata).not.toHaveProperty('location');
        }
        
        // Should sanitize message content if PII detected
        const piiResult = PrivacyService.detectAndSanitizePII(conversation.messageContent);
        if (piiResult.hasPII) {
          expect(sanitized.messageContent).toBe(piiResult.sanitizedText);
          expect(sanitized.piiDetected).toBe(true);
          expect(sanitized).toHaveProperty('originalContentHash');
        }
      }
    ), { numRuns: 100 });
  });

  it('should create compliant audit log entries', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 50 }),
      fc.string({ minLength: 1, maxLength: 50 }),
      fc.record({
        action: fc.string(),
        details: fc.string(),
      }),
      (action, userId, details) => {
        const auditLog = PrivacyService.createAuditLogEntry(action, userId, details);
        
        // Should have required fields
        expect(auditLog).toHaveProperty('timestamp');
        expect(auditLog).toHaveProperty('action');
        expect(auditLog).toHaveProperty('userId');
        expect(auditLog).toHaveProperty('compliance');
        
        // Should be FERPA compliant
        expect(auditLog.compliance).toBe('FERPA');
        
        // Should hash guest user IDs
        if (userId.startsWith('guest_')) {
          expect(auditLog.userId).toBe('guest_user');
        } else {
          expect(auditLog.userId).not.toBe(userId); // Should be hashed
        }
        
        // Should have valid timestamp
        expect(new Date(auditLog.timestamp)).toBeInstanceOf(Date);
      }
    ), { numRuns: 100 });
  });
});