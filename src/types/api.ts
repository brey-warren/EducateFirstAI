import { z } from 'zod';
import { MessageSchema } from './message';
import { UserProgressSchema } from './progress';
import { KnowledgeItemSchema } from './knowledge';

// API Response wrapper schema
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
  });

// Chat API schemas
export const ChatMessageRequestSchema = z.object({
  content: z.string().min(1).max(5000),
  userId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
});

export const ChatMessageResponseSchema = z.object({
  message: MessageSchema,
  sources: z.array(z.string()).optional(),
  errorWarnings: z.array(z.string()).optional(),
});

export const ChatHistoryRequestSchema = z.object({
  userId: z.string().uuid(),
  limit: z.number().int().positive().max(100).optional().default(50),
});

export const ChatHistoryResponseSchema = z.object({
  messages: z.array(MessageSchema),
  hasMore: z.boolean(),
});

// Progress API schemas
export const ProgressResponseSchema = UserProgressSchema;

export const UpdateProgressRequestSchema = z.object({
  sectionId: z.string().min(1),
  action: z.enum(['mark_reviewed', 'add_question']),
});

export const UpdateProgressResponseSchema = z.object({
  success: z.boolean(),
  updatedProgress: UserProgressSchema,
});

// Knowledge Base API schemas
export const KnowledgeSearchRequestSchema = z.object({
  query: z.string().min(1).max(500),
  section: z.string().optional(),
});

export const KnowledgeSearchResponseSchema = z.object({
  results: z.array(KnowledgeItemSchema),
  relevanceScore: z.number().min(0).max(1),
});

// Authentication API schemas
export const AuthSignUpRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const AuthSignInRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const AuthResetPasswordRequestSchema = z.object({
  email: z.string().email(),
});

export const AuthResponseSchema = z.object({
  user: z.object({
    userId: z.string().uuid(),
    email: z.string().email(),
    isGuest: z.boolean(),
  }),
  token: z.string().optional(),
  refreshToken: z.string().optional(),
});

// Error response schema
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.string(), z.any()).optional(),
});

// TypeScript interfaces for API types
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type ChatMessageRequest = z.infer<typeof ChatMessageRequestSchema>;
export type ChatMessageResponse = z.infer<typeof ChatMessageResponseSchema>;
export type ChatHistoryRequest = z.infer<typeof ChatHistoryRequestSchema>;
export type ChatHistoryResponse = z.infer<typeof ChatHistoryResponseSchema>;

export type ProgressResponse = z.infer<typeof ProgressResponseSchema>;
export type UpdateProgressRequest = z.infer<typeof UpdateProgressRequestSchema>;
export type UpdateProgressResponse = z.infer<typeof UpdateProgressResponseSchema>;

export type KnowledgeSearchRequest = z.infer<typeof KnowledgeSearchRequestSchema>;
export type KnowledgeSearchResponse = z.infer<typeof KnowledgeSearchResponseSchema>;

export type AuthSignUpRequest = z.infer<typeof AuthSignUpRequestSchema>;
export type AuthSignInRequest = z.infer<typeof AuthSignInRequestSchema>;
export type AuthResetPasswordRequest = z.infer<typeof AuthResetPasswordRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;