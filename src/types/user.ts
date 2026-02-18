import { z } from 'zod';

// User preferences schema
export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark']).default('light'),
  notifications: z.boolean().default(true),
});

// User data model schema
export const UserSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  createdAt: z.date(),
  lastLoginAt: z.date(),
  preferences: UserPreferencesSchema,
  isGuest: z.boolean().default(false),
});

// TypeScript interfaces derived from schemas
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type User = z.infer<typeof UserSchema>;

// Input validation schemas for user operations
export const CreateUserInputSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

export const LoginInputSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const ResetPasswordInputSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;
export type LoginInput = z.infer<typeof LoginInputSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordInputSchema>;