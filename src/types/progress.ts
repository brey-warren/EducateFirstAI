import { z } from 'zod';

// FAFSA section progress schema
export const FAFSASectionProgressSchema = z.object({
  sectionId: z.string(),
  progress: z.number().min(0).max(100).default(0),
  isComplete: z.boolean().default(false),
  questionsAsked: z.number().int().nonnegative().default(0),
  lastVisited: z.date(),
  lastUpdated: z.date(),
  data: z.record(z.string(), z.any()).optional(),
});

// User progress schema
export const UserProgressSchema = z.object({
  userId: z.string().uuid(),
  sections: z.record(z.string(), FAFSASectionProgressSchema).default({}),
  overallProgress: z.number().min(0).max(100).default(0),
  completedSections: z.array(z.string()).default([]),
  currentSection: z.string().nullable().default(null),
  totalInteractions: z.number().int().nonnegative().default(0),
  lastUpdated: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Legacy FAFSA section schema for backward compatibility
export const FAFSASectionSchema = z.object({
  sectionId: z.string(),
  questionsAsked: z.number().int().nonnegative().default(0),
  lastVisited: z.date(),
  isComplete: z.boolean().default(false),
});

// TypeScript interfaces
export type FAFSASectionProgress = z.infer<typeof FAFSASectionProgressSchema>;
export type UserProgress = z.infer<typeof UserProgressSchema>;
export type FAFSASection = z.infer<typeof FAFSASectionSchema>; // Legacy type

// Input validation for progress operations
export const UpdateProgressInputSchema = z.object({
  sectionId: z.string().min(1, 'Section ID is required'),
  action: z.enum(['mark_reviewed', 'add_question', 'mark_complete', 'mark_incomplete']),
  data: z.record(z.string(), z.any()).optional(),
});

export const GetProgressInputSchema = z.object({
  userId: z.string().uuid(),
});

export type UpdateProgressInput = z.infer<typeof UpdateProgressInputSchema>;
export type GetProgressInput = z.infer<typeof GetProgressInputSchema>;