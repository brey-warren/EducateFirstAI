import { z } from 'zod';

// Message metadata schema
export const MessageMetadataSchema = z.object({
  sources: z.array(z.string()).optional(),
  errorDetected: z.boolean().optional(),
  fafsa_section: z.string().optional(),
  isError: z.boolean().optional(),
  errorType: z.string().optional(),
  errorSeverity: z.string().optional(),
  recoverable: z.boolean().optional(),
}).optional();

// Message schema
export const MessageSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1, 'Message content cannot be empty').max(5000, 'Message content cannot exceed 5000 characters'),
  sender: z.enum(['user', 'ai']),
  timestamp: z.date(),
  metadata: MessageMetadataSchema,
});

// TypeScript interfaces
export type MessageMetadata = z.infer<typeof MessageMetadataSchema>;
export type Message = z.infer<typeof MessageSchema>;

// Input validation for chat messages
export const ChatMessageInputSchema = z.object({
  content: z.string()
    .min(1, 'Please enter a FAFSA question or topic you\'d like help with.')
    .max(5000, 'Please limit your question to 5000 characters or less.')
    .refine(
      (content) => content.trim().length > 0,
      'Please enter a FAFSA question or topic you\'d like help with.'
    ),
  userId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
});

export type ChatMessageInput = z.infer<typeof ChatMessageInputSchema>;