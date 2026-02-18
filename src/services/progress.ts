import { UserProgress } from '../types/progress';
import { PerformanceMonitoringService } from './performance';

export interface ProgressUpdateRequest {
  userId: string;
  section: string;
  completed: boolean;
  data?: Record<string, any>;
}

export interface ProgressResponse {
  progress: UserProgress;
  message?: string;
}

export class ProgressService {
  private static readonly BASE_URL = '/api/progress';
  private static readonly USE_MOCK_DATA = import.meta.env.DEV; // Use mock data in development

  /**
   * Generate mock progress data for development
   */
  private static generateMockProgress(userId: string): UserProgress {
    return {
      userId,
      sections: {
        'student-demographics': {
          sectionId: 'student-demographics',
          progress: 75,
          isComplete: false,
          questionsAsked: 8,
          lastVisited: new Date(Date.now() - 3600000), // 1 hour ago
          lastUpdated: new Date(Date.now() - 3600000),
        },
        'dependency-status': {
          sectionId: 'dependency-status',
          progress: 100,
          isComplete: true,
          questionsAsked: 5,
          lastVisited: new Date(Date.now() - 7200000), // 2 hours ago
          lastUpdated: new Date(Date.now() - 7200000),
        },
        'student-finances': {
          sectionId: 'student-finances',
          progress: 25,
          isComplete: false,
          questionsAsked: 3,
          lastVisited: new Date(Date.now() - 1800000), // 30 minutes ago
          lastUpdated: new Date(Date.now() - 1800000),
        },
      },
      overallProgress: 67,
      lastUpdated: new Date(Date.now() - 1800000),
      totalInteractions: 16,
      completedSections: ['dependency-status'],
      currentSection: 'student-demographics',
      createdAt: new Date(Date.now() - 86400000), // 1 day ago
      updatedAt: new Date(Date.now() - 1800000),
    };
  }

  /**
   * Get user progress for all FAFSA sections
   */
  static async getUserProgress(userId: string): Promise<UserProgress> {
    const startTime = Date.now();
    
    // Use mock data in development
    if (this.USE_MOCK_DATA) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
      
      const responseTime = Date.now() - startTime;
      PerformanceMonitoringService.recordMetric('get_user_progress', responseTime, true, false);
      
      return this.generateMockProgress(userId);
    }

    try {
      const response = await fetch(`${this.BASE_URL}/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const responseTime = Date.now() - startTime;
        PerformanceMonitoringService.recordMetric('get_user_progress', responseTime, false, false, 'server_error');
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const data = await response.json();
      const responseTime = Date.now() - startTime;
      PerformanceMonitoringService.recordMetric('get_user_progress', responseTime, true, false);
      
      return {
        userId: data.userId,
        sections: data.sections || {},
        overallProgress: data.overallProgress || 0,
        lastUpdated: new Date(data.lastUpdated || Date.now()),
        totalInteractions: data.totalInteractions || 0,
        completedSections: data.completedSections || [],
        currentSection: data.currentSection || null,
        createdAt: new Date(data.createdAt || Date.now()),
        updatedAt: new Date(data.updatedAt || Date.now()),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      PerformanceMonitoringService.recordMetric('get_user_progress', responseTime, false, false, 'network_error');
      console.error('Progress service error:', error);
      throw error instanceof Error ? error : new Error('Failed to load progress');
    }
  }

  /**
   * Update progress for a specific FAFSA section
   */
  static async updateSectionProgress(request: ProgressUpdateRequest): Promise<ProgressResponse> {
    const startTime = Date.now();
    
    // Use mock data in development
    if (this.USE_MOCK_DATA) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
      
      // Return updated mock progress
      const mockProgress = this.generateMockProgress(request.userId);
      
      // Update the specific section
      if (mockProgress.sections[request.section]) {
        mockProgress.sections[request.section].isComplete = request.completed;
        mockProgress.sections[request.section].progress = request.completed ? 100 : 
          Math.min(mockProgress.sections[request.section].progress + 10, 95);
        mockProgress.sections[request.section].lastUpdated = new Date();
        mockProgress.sections[request.section].questionsAsked += 1;
      }
      
      // Update overall progress
      const completedCount = Object.values(mockProgress.sections).filter(s => s.isComplete).length;
      mockProgress.overallProgress = Math.round((completedCount / Object.keys(mockProgress.sections).length) * 100);
      mockProgress.completedSections = Object.keys(mockProgress.sections).filter(
        key => mockProgress.sections[key].isComplete
      );
      mockProgress.updatedAt = new Date();
      
      const responseTime = Date.now() - startTime;
      PerformanceMonitoringService.recordMetric('update_progress', responseTime, true, false);
      
      return {
        progress: mockProgress,
        message: `Progress updated for ${request.section}`,
      };
    }

    try {
      const response = await fetch(`${this.BASE_URL}/section`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const responseTime = Date.now() - startTime;
        PerformanceMonitoringService.recordMetric('update_progress', responseTime, false, false, 'server_error');
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const data = await response.json();
      const responseTime = Date.now() - startTime;
      PerformanceMonitoringService.recordMetric('update_progress', responseTime, true, false);
      
      return {
        progress: {
          userId: data.progress.userId,
          sections: data.progress.sections || {},
          overallProgress: data.progress.overallProgress || 0,
          lastUpdated: new Date(data.progress.lastUpdated || Date.now()),
          totalInteractions: data.progress.totalInteractions || 0,
          completedSections: data.progress.completedSections || [],
          currentSection: data.progress.currentSection || null,
          createdAt: new Date(data.progress.createdAt || Date.now()),
          updatedAt: new Date(data.progress.updatedAt || Date.now()),
        },
        message: data.message,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      PerformanceMonitoringService.recordMetric('update_progress', responseTime, false, false, 'network_error');
      console.error('Progress update error:', error);
      throw error instanceof Error ? error : new Error('Failed to update progress');
    }
  }

  /**
   * Mark a FAFSA section as completed
   */
  static async markSectionComplete(userId: string, section: string, data?: Record<string, any>): Promise<ProgressResponse> {
    return this.updateSectionProgress({
      userId,
      section,
      completed: true,
      data,
    });
  }

  /**
   * Mark a FAFSA section as incomplete
   */
  static async markSectionIncomplete(userId: string, section: string): Promise<ProgressResponse> {
    return this.updateSectionProgress({
      userId,
      section,
      completed: false,
    });
  }

  /**
   * Get progress statistics
   */
  static getProgressStats(progress: UserProgress): {
    totalSections: number;
    completedSections: number;
    remainingSections: number;
    completionPercentage: number;
  } {
    const totalSections = Object.keys(progress.sections).length;
    const completedSections = progress.completedSections.length;
    const remainingSections = totalSections - completedSections;
    const completionPercentage = totalSections > 0 ? (completedSections / totalSections) * 100 : 0;

    return {
      totalSections,
      completedSections,
      remainingSections,
      completionPercentage: Math.round(completionPercentage),
    };
  }

  /**
   * Get next recommended section based on current progress
   */
  static getNextRecommendedSection(progress: UserProgress): string | null {
    const sectionOrder = [
      'student-demographics',
      'dependency-status',
      'student-finances',
      'parent-finances',
      'school-selection',
      'review-submit'
    ];

    for (const section of sectionOrder) {
      if (!progress.completedSections.includes(section)) {
        return section;
      }
    }

    return null; // All sections completed
  }

  /**
   * Format section name for display
   */
  static formatSectionName(section: string): string {
    const sectionNames: Record<string, string> = {
      'student-demographics': 'Student Demographics',
      'dependency-status': 'Dependency Status',
      'student-finances': 'Student Financial Information',
      'parent-finances': 'Parent Financial Information',
      'school-selection': 'School Selection',
      'review-submit': 'Review & Submit',
    };

    return sectionNames[section] || section.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get section description
   */
  static getSectionDescription(section: string): string {
    const descriptions: Record<string, string> = {
      'student-demographics': 'Basic information about you including name, address, and contact details.',
      'dependency-status': 'Questions to determine if you are dependent or independent for financial aid purposes.',
      'student-finances': 'Your income, assets, and tax information.',
      'parent-finances': 'Your parents\' income, assets, and tax information (if you are dependent).',
      'school-selection': 'Choose the schools you want to receive your FAFSA information.',
      'review-submit': 'Review all your information and submit your FAFSA application.',
    };

    return descriptions[section] || 'Complete this section of your FAFSA application.';
  }

  /**
   * Validate section name
   */
  static isValidSection(section: string): boolean {
    const validSections = [
      'student-demographics',
      'dependency-status',
      'student-finances',
      'parent-finances',
      'school-selection',
      'review-submit'
    ];

    return validSections.includes(section);
  }
}