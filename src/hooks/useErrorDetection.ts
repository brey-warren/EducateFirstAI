import { useState, useCallback, useEffect } from 'react';
import { 
  ErrorDetectionResult, 
  DetectedError, 
  ChecklistItem,
  ErrorDetectionInput 
} from '../types/errors';
import { FAFSAErrorDetectionService } from '../services/errorDetection';

interface UseErrorDetectionOptions {
  autoDetect?: boolean;
  debounceMs?: number;
  maxErrors?: number;
}

interface UseErrorDetectionReturn {
  // State
  detectionResult: ErrorDetectionResult | null;
  isDetecting: boolean;
  dismissedErrors: Set<string>;
  
  // Actions
  detectErrors: (input: ErrorDetectionInput) => Promise<ErrorDetectionResult>;
  dismissError: (errorId: string) => void;
  clearDismissed: () => void;
  getFieldWarnings: (field: string, section?: string) => DetectedError[];
  getSectionChecklist: (section: string) => ChecklistItem[];
  
  // Computed values
  hasActiveErrors: boolean;
  criticalErrorCount: number;
  warningCount: number;
}

export const useErrorDetection = (
  options: UseErrorDetectionOptions = {}
): UseErrorDetectionReturn => {
  const {
    debounceMs = 500,
    maxErrors = 10
  } = options;

  const [detectionResult, setDetectionResult] = useState<ErrorDetectionResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [dismissedErrors, setDismissedErrors] = useState<Set<string>>(new Set());
  const [debounceTimer, setDebounceTimer] = useState<number | null>(null);

  // Clear debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  const detectErrors = useCallback(async (input: ErrorDetectionInput): Promise<ErrorDetectionResult> => {
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    return new Promise((resolve) => {
      const timer = setTimeout(async () => {
        setIsDetecting(true);
        
        try {
          // Validate input
          const validatedInput = FAFSAErrorDetectionService.validateInput(input);
          
          // Detect errors
          const result = FAFSAErrorDetectionService.detectErrors(validatedInput);
          
          // Limit number of errors if specified
          if (maxErrors && maxErrors > 0) {
            result.errors = result.errors.slice(0, maxErrors);
            result.warnings = result.warnings.slice(0, maxErrors);
          }
          
          // Filter out dismissed errors
          result.errors = result.errors.filter(error => !dismissedErrors.has(error.patternId));
          result.warnings = result.warnings.filter(warning => !dismissedErrors.has(warning.patternId));
          
          // Update has errors flag
          result.hasErrors = result.errors.length > 0 || result.warnings.length > 0;
          
          setDetectionResult(result);
          resolve(result);
        } catch (error) {
          console.error('Error detection failed:', error);
          const emptyResult: ErrorDetectionResult = {
            hasErrors: false,
            errors: [],
            warnings: [],
            suggestions: ['Unable to analyze input for errors. Please check your input and try again.']
          };
          setDetectionResult(emptyResult);
          resolve(emptyResult);
        } finally {
          setIsDetecting(false);
        }
      }, debounceMs);
      
      setDebounceTimer(timer);
    });
  }, [debounceMs, maxErrors, dismissedErrors, debounceTimer]);

  const dismissError = useCallback((errorId: string) => {
    setDismissedErrors(prev => new Set([...prev, errorId]));
    
    // Update current detection result to remove dismissed error
    setDetectionResult(prev => {
      if (!prev) return prev;
      
      const updatedResult = {
        ...prev,
        errors: prev.errors.filter(error => error.patternId !== errorId),
        warnings: prev.warnings.filter(warning => warning.patternId !== errorId)
      };
      
      updatedResult.hasErrors = updatedResult.errors.length > 0 || updatedResult.warnings.length > 0;
      
      return updatedResult;
    });
  }, []);

  const clearDismissed = useCallback(() => {
    setDismissedErrors(new Set());
  }, []);

  const getFieldWarnings = useCallback((field: string, section?: string): DetectedError[] => {
    return FAFSAErrorDetectionService.getFieldWarnings(field, section)
      .filter(warning => !dismissedErrors.has(warning.patternId));
  }, [dismissedErrors]);

  const getSectionChecklist = useCallback((section: string): ChecklistItem[] => {
    return FAFSAErrorDetectionService.getSectionChecklist(section);
  }, []);

  // Computed values
  const activeErrors = detectionResult?.errors.filter(error => !dismissedErrors.has(error.patternId)) || [];
  const activeWarnings = detectionResult?.warnings.filter(warning => !dismissedErrors.has(warning.patternId)) || [];
  
  const hasActiveErrors = activeErrors.length > 0 || activeWarnings.length > 0;
  const criticalErrorCount = activeErrors.length;
  const warningCount = activeWarnings.length;

  return {
    // State
    detectionResult,
    isDetecting,
    dismissedErrors,
    
    // Actions
    detectErrors,
    dismissError,
    clearDismissed,
    getFieldWarnings,
    getSectionChecklist,
    
    // Computed values
    hasActiveErrors,
    criticalErrorCount,
    warningCount
  };
};

// Hook for real-time error detection on user input
export const useRealtimeErrorDetection = (
  input: string,
  section?: string,
  field?: string,
  options: UseErrorDetectionOptions = {}
) => {
  const errorDetection = useErrorDetection(options);
  
  useEffect(() => {
    if (input.trim().length > 0 && options.autoDetect !== false) {
      errorDetection.detectErrors({
        userInput: input,
        section,
        field
      });
    }
  }, [input, section, field, options.autoDetect]);
  
  return errorDetection;
};

// Hook for section-specific error checking
export const useSectionErrorCheck = (section: string) => {
  const errorDetection = useErrorDetection({ autoDetect: false });
  
  const checkSection = useCallback(async (sectionData: Record<string, any>) => {
    const inputText = Object.entries(sectionData)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    
    return errorDetection.detectErrors({
      userInput: inputText,
      section,
      context: sectionData
    });
  }, [section, errorDetection]);
  
  const getChecklist = useCallback(() => {
    return errorDetection.getSectionChecklist(section);
  }, [section, errorDetection]);
  
  return {
    ...errorDetection,
    checkSection,
    getChecklist
  };
};