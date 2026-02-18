import { z } from 'zod';

// Knowledge item schema
export const KnowledgeItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  source: z.string().url('Source must be a valid URL'),
  fafsa_section: z.string().min(1, 'FAFSA section is required'),
  commonErrors: z.array(z.string()).optional(),
});

// FAFSA document schema
export const FAFSADocumentSchema = z.object({
  documentId: z.string().uuid(),
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  section: z.string().min(1, 'Section is required'),
  subsection: z.string().optional(),
  sourceUrl: z.string().url('Source URL must be valid'),
  lastUpdated: z.date(),
  commonErrors: z.array(z.string()),
  keywords: z.array(z.string()),
});

// TypeScript interfaces
export type KnowledgeItem = z.infer<typeof KnowledgeItemSchema>;
export type FAFSADocument = z.infer<typeof FAFSADocumentSchema>;

// Input validation for knowledge base operations
export const KnowledgeSearchInputSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(500, 'Search query too long'),
  section: z.string().optional(),
});

export type KnowledgeSearchInput = z.infer<typeof KnowledgeSearchInputSchema>;