import { useState, useEffect, useCallback } from 'react';
import { UserProgress } from '../types/progress';
import { User } from '../services/auth';
import { ProgressService, ProgressUpdateRequest } from '../services/progress';

export interface UseProgressOptions {
  user?: User;
  autoLoad?: boolean;
}

export interface UseProgressReturn {
  progress: UserProgress | null;
  isLoading: boolean;
  error: string | null;
  loadProgress: () => Promise<void>;
  updateSectionProgress: (section: string, completed: boolean, data?: Record<string, any>) => Promise<void>;
  markSectionComplete: (section: string, data?: Record<string, any>) => Promise<void>;
  markSectionIncomplete: (section: string) => Promise<void>;
  getProgressStats: () => {
    totalSections: number;
    completedSections: number;
    remainingSections: number;
    completionPercentage: number;
  };
  getNextRecommendedSection: () => string | null;
  clearError: () => void;
  refreshProgress: () => Promise<void>;
}

export const useProgress = (options: UseProgressOptions = {}): UseProgressReturn => {
  const { user, autoLoad = true } = options;
  
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user progress
  const loadProgress = useCallback(async () => {
    if (!user || user.isGuest) {
      setProgress(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userProgress = await ProgressService.getUserProgress(user.userId);
      setProgress(userProgress);
    } catch (err) {
      console.error('Failed to load progress:', err);
      setError(err instanceof Error ? err.message : 'Failed to load progress');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Update section progress
  const updateSectionProgress = useCallback(async (
    section: string, 
    completed: boolean, 
    data?: Record<string, any>
  ) => {
    if (!user || user.isGuest) {
      throw new Error('User must be authenticated to update progress');
    }

    if (!ProgressService.isValidSection(section)) {
      throw new Error(`Invalid section: ${section}`);
    }

    setIsLoading(true);
    setError(null);

    try {
      const request: ProgressUpdateRequest = {
        userId: user.userId,
        section,
        completed,
        data,
      };

      const response = await ProgressService.updateSectionProgress(request);
      setProgress(response.progress);
    } catch (err) {
      console.error('Failed to update progress:', err);
      setError(err instanceof Error ? err.message : 'Failed to update progress');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Mark section as complete
  const markSectionComplete = useCallback(async (section: string, data?: Record<string, any>) => {
    await updateSectionProgress(section, true, data);
  }, [updateSectionProgress]);

  // Mark section as incomplete
  const markSectionIncomplete = useCallback(async (section: string) => {
    await updateSectionProgress(section, false);
  }, [updateSectionProgress]);

  // Get progress statistics
  const getProgressStats = useCallback(() => {
    if (!progress) {
      return {
        totalSections: 0,
        completedSections: 0,
        remainingSections: 0,
        completionPercentage: 0,
      };
    }

    return ProgressService.getProgressStats(progress);
  }, [progress]);

  // Get next recommended section
  const getNextRecommendedSection = useCallback(() => {
    if (!progress) return null;
    return ProgressService.getNextRecommendedSection(progress);
  }, [progress]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Refresh progress (alias for loadProgress)
  const refreshProgress = useCallback(async () => {
    await loadProgress();
  }, [loadProgress]);

  // Auto-load progress on mount and user change
  useEffect(() => {
    if (autoLoad && user && !user.isGuest) {
      loadProgress();
    } else if (!user || user.isGuest) {
      setProgress(null);
      setError(null);
    }
  }, [autoLoad, user, loadProgress]);

  return {
    progress,
    isLoading,
    error,
    loadProgress,
    updateSectionProgress,
    markSectionComplete,
    markSectionIncomplete,
    getProgressStats,
    getNextRecommendedSection,
    clearError,
    refreshProgress,
  };
};