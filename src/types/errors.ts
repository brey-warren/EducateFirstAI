import { z } from 'zod';

// FAFSA error types
export const FAFSAErrorTypeSchema = z.enum([
  'missing_information',
  'incorrect_format',
  'dependency_status_error',
  'income_reporting_error',
  'asset_reporting_error',
  'tax_information_error',
  'school_selection_error',
  'deadline_warning',
  'verification_issue',
  'eligibility_concern'
]);

// Error severity levels
export const ErrorSeveritySchema = z.enum([
  'critical',    // Will prevent FAFSA submission
  'warning',     // May cause delays or issues
  'info'         // Helpful tips and reminders
]);

// FAFSA field error pattern
export const FAFSAErrorPatternSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  errorType: FAFSAErrorTypeSchema,
  severity: ErrorSeveritySchema,
  section: z.string(),
  field: z.string().optional(),
  patterns: z.array(z.string()), // Regex patterns or keywords to match
  solution: z.string(),
  commonCauses: z.array(z.string()),
  preventionTips: z.array(z.string()),
  relatedFields: z.array(z.string()).optional(),
});

// Detected error instance
export const DetectedErrorSchema = z.object({
  patternId: z.string(),
  errorType: FAFSAErrorTypeSchema,
  severity: ErrorSeveritySchema,
  section: z.string(),
  field: z.string().optional(),
  message: z.string(),
  solution: z.string(),
  confidence: z.number().min(0).max(1), // Confidence score 0-1
  context: z.string().optional(), // User input that triggered the error
  timestamp: z.date(),
});

// Section checklist item
export const ChecklistItemSchema = z.object({
  id: z.string(),
  section: z.string(),
  title: z.string(),
  description: z.string(),
  isRequired: z.boolean(),
  commonMistakes: z.array(z.string()),
  tips: z.array(z.string()),
  relatedFields: z.array(z.string()).optional(),
});

// Error detection result
export const ErrorDetectionResultSchema = z.object({
  hasErrors: z.boolean(),
  errors: z.array(DetectedErrorSchema),
  warnings: z.array(DetectedErrorSchema),
  suggestions: z.array(z.string()),
  checklist: z.array(ChecklistItemSchema).optional(),
});

// TypeScript interfaces
export type FAFSAErrorType = z.infer<typeof FAFSAErrorTypeSchema>;
export type ErrorSeverity = z.infer<typeof ErrorSeveritySchema>;
export type FAFSAErrorPattern = z.infer<typeof FAFSAErrorPatternSchema>;
export type DetectedError = z.infer<typeof DetectedErrorSchema>;
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;
export type ErrorDetectionResult = z.infer<typeof ErrorDetectionResultSchema>;

// Input validation schemas
export const ErrorDetectionInputSchema = z.object({
  userInput: z.string().min(1, 'User input is required'),
  section: z.string().optional(),
  field: z.string().optional(),
  context: z.record(z.string(), z.any()).optional(),
});

export type ErrorDetectionInput = z.infer<typeof ErrorDetectionInputSchema>;