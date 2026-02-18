import { z } from 'zod';
import { MessageSchema } from './message';

// Conversation schema
export const ConversationSchema = z.object({
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
  messages: z.array(MessageSchema),
  createdAt: z.date(),
  lastUpdatedAt: z.date(),
  expiresAt: z.date(), // 24 hours from creation
});

// TypeScript interface
export type Conversation = z.infer<typeof ConversationSchema>;

// Input validation for conversation operations
export const GetConversationHistoryInputSchema = z.object({
  userId: z.string().uuid(),
  limit: z.number().int().positive().max(100).optional().default(50),
});

export const CreateConversationInputSchema = z.object({
  userId: z.string().uuid(),
});

export type GetConversationHistoryInput = z.infer<typeof GetConversationHistoryInputSchema>;
export type CreateConversationInput = z.infer<typeof CreateConversationInputSchema>;