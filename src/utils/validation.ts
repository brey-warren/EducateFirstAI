import { z } from 'zod';

/**
 * Validation result type
 */
export type ValidationResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Safely validate data against a Zod schema
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    } else {
      const fieldErrors: Record<string, string> = {};
      let generalError = 'Validation failed';

      // Extract field-specific errors
      if (result.error && result.error.issues) {
        result.error.issues.forEach((issue: any) => {
          const path = issue.path.join('.');
          if (path) {
            fieldErrors[path] = issue.message;
          } else {
            generalError = issue.message;
          }
        });
      }

      return {
        success: false,
        error: Object.keys(fieldErrors).length === 0 ? generalError : undefined,
        fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown validation error',
    };
  }
}

/**
 * Validate chat input with specific error messages for empty/whitespace content
 */
export function validateChatInput(content: string): ValidationResult<string> {
  // Check for empty or whitespace-only content
  if (!content || content.trim().length === 0) {
    return {
      success: false,
      error: 'Please enter a FAFSA question or topic you\'d like help with.',
    };
  }

  // Check length limit
  if (content.length > 5000) {
    return {
      success: false,
      error: 'Please limit your question to 5000 characters or less.',
    };
  }

  return {
    success: true,
    data: content.trim(),
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult<string> {
  const emailSchema = z.string().email('Please enter a valid email address');
  return validateData(emailSchema, email);
}

/**
 * Validate password requirements
 */
export function validatePassword(password: string): ValidationResult<string> {
  const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number');
  
  return validateData(passwordSchema, password);
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): ValidationResult<string> {
  const uuidSchema = z.string().uuid('Invalid ID format');
  return validateData(uuidSchema, uuid);
}