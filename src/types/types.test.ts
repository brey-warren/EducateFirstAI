import { describe, it, expect } from 'vitest';
import {
  UserSchema,
  MessageSchema,
  ConversationSchema,
  UserProgressSchema,
  KnowledgeItemSchema,
  ChatMessageInputSchema,
} from './index';
import { validateChatInput } from '../utils/validation';

describe('Data Model Types and Validation', () => {
  describe('User Schema', () => {
    it('should validate a valid user object', () => {
      const validUser = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        preferences: {
          theme: 'light' as const,
          notifications: true,
        },
        isGuest: false,
      };

      const result = UserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const invalidUser = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'invalid-email',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        preferences: {
          theme: 'light' as const,
          notifications: true,
        },
        isGuest: false,
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });
  });

  describe('Message Schema', () => {
    it('should validate a valid message object', () => {
      const validMessage = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        content: 'What is the FAFSA?',
        sender: 'user' as const,
        timestamp: new Date(),
        metadata: {
          fafsa_section: 'general',
        },
      };

      const result = MessageSchema.safeParse(validMessage);
      expect(result.success).toBe(true);
    });

    it('should reject empty message content', () => {
      const invalidMessage = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        content: '',
        sender: 'user' as const,
        timestamp: new Date(),
      };

      const result = MessageSchema.safeParse(invalidMessage);
      expect(result.success).toBe(false);
    });

    it('should reject message content exceeding 5000 characters', () => {
      const longContent = 'a'.repeat(5001);
      const invalidMessage = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        content: longContent,
        sender: 'user' as const,
        timestamp: new Date(),
      };

      const result = MessageSchema.safeParse(invalidMessage);
      expect(result.success).toBe(false);
    });
  });

  describe('Chat Input Validation', () => {
    it('should accept valid chat input', () => {
      const result = validateChatInput('What is the FAFSA?');
      expect(result.success).toBe(true);
      expect(result.data).toBe('What is the FAFSA?');
    });

    it('should reject empty input with appropriate message', () => {
      const result = validateChatInput('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Please enter a FAFSA question or topic you\'d like help with.');
    });

    it('should reject whitespace-only input', () => {
      const result = validateChatInput('   \n\t   ');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Please enter a FAFSA question or topic you\'d like help with.');
    });

    it('should reject input exceeding 5000 characters', () => {
      const longInput = 'a'.repeat(5001);
      const result = validateChatInput(longInput);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Please limit your question to 5000 characters or less.');
    });

    it('should trim whitespace from valid input', () => {
      const result = validateChatInput('  What is the FAFSA?  ');
      expect(result.success).toBe(true);
      expect(result.data).toBe('What is the FAFSA?');
    });
  });

  describe('Conversation Schema', () => {
    it('should validate a valid conversation object', () => {
      const validConversation = {
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        messages: [],
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      };

      const result = ConversationSchema.safeParse(validConversation);
      expect(result.success).toBe(true);
    });
  });

  describe('UserProgress Schema', () => {
    it('should validate a valid user progress object', () => {
      const validProgress = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        sections: {
          'student-demographics': {
            sectionId: 'student-demographics',
            progress: 75,
            isComplete: false,
            questionsAsked: 5,
            lastVisited: new Date(),
            lastUpdated: new Date(),
          },
        },
        overallProgress: 25,
        completedSections: [],
        currentSection: 'student-demographics',
        totalInteractions: 10,
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = UserProgressSchema.safeParse(validProgress);
      expect(result.success).toBe(true);
    });
  });

  describe('KnowledgeItem Schema', () => {
    it('should validate a valid knowledge item object', () => {
      const validKnowledgeItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'FAFSA Student Information',
        content: 'Information about student details required for FAFSA',
        source: 'https://studentaid.gov/fafsa',
        fafsa_section: 'student-info',
        commonErrors: ['Missing SSN', 'Incorrect name spelling'],
      };

      const result = KnowledgeItemSchema.safeParse(validKnowledgeItem);
      expect(result.success).toBe(true);
    });

    it('should reject invalid URL in source field', () => {
      const invalidKnowledgeItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'FAFSA Student Information',
        content: 'Information about student details required for FAFSA',
        source: 'not-a-valid-url',
        fafsa_section: 'student-info',
      };

      const result = KnowledgeItemSchema.safeParse(invalidKnowledgeItem);
      expect(result.success).toBe(false);
    });
  });

  describe('ChatMessageInput Schema', () => {
    it('should validate valid chat message input', () => {
      const validInput = {
        content: 'What is the FAFSA?',
        userId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = ChatMessageInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject empty content', () => {
      const invalidInput = {
        content: '',
        userId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = ChatMessageInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });
});