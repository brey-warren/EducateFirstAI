import { APIGatewayProxyEvent, APIGatewayProxyResult, LambdaContext } from '../shared/types';
import { createSuccessResponse, createErrorResponse } from '../shared/types';
import { DynamoDBService, TABLES } from '../shared/dynamodb';

export class ProgressHandler {
  static async handleGetProgress(event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult> {
    try {
      const userId = event.pathParameters?.userId;
      if (!userId) {
        return createErrorResponse(400, 'User ID is required');
      }

      // Get user progress from DynamoDB
      const progress = await DynamoDBService.getItem(TABLES.USER_PROGRESS, { userId });

      if (!progress) {
        // Create initial progress record if it doesn't exist
        const initialProgress = {
          userId,
          exploredSections: [],
          totalInteractions: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await DynamoDBService.putItem(TABLES.USER_PROGRESS, initialProgress);
        
        return createSuccessResponse(initialProgress);
      }

      return createSuccessResponse(progress);

    } catch (error) {
      console.error('Get progress error:', error);
      return createErrorResponse(500, 'Failed to get user progress');
    }
  }

  static async handleUpdateProgress(event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult> {
    try {
      const userId = event.pathParameters?.userId;
      if (!userId) {
        return createErrorResponse(400, 'User ID is required');
      }

      if (!event.body) {
        return createErrorResponse(400, 'Request body is required');
      }

      const { sectionId, action } = JSON.parse(event.body);

      if (!sectionId || !action) {
        return createErrorResponse(400, 'Section ID and action are required');
      }

      if (!['mark_reviewed', 'add_question'].includes(action)) {
        return createErrorResponse(400, 'Invalid action. Must be "mark_reviewed" or "add_question"');
      }

      // Get current progress
      let progress = await DynamoDBService.getItem(TABLES.USER_PROGRESS, { userId });

      if (!progress) {
        // Create initial progress if it doesn't exist
        progress = {
          userId,
          exploredSections: [],
          totalInteractions: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      // Find or create section
      let sectionIndex = progress.exploredSections.findIndex((section: any) => section.sectionId === sectionId);
      
      if (sectionIndex === -1) {
        // Add new section
        progress.exploredSections.push({
          sectionId,
          questionsAsked: 0,
          lastVisited: new Date().toISOString(),
          isComplete: false,
        });
        sectionIndex = progress.exploredSections.length - 1;
      }

      // Update section based on action
      const section = progress.exploredSections[sectionIndex];
      section.lastVisited = new Date().toISOString();

      if (action === 'add_question') {
        section.questionsAsked += 1;
        progress.totalInteractions += 1;
      } else if (action === 'mark_reviewed') {
        section.isComplete = true;
      }

      // Update progress in DynamoDB
      progress.updatedAt = new Date().toISOString();
      await DynamoDBService.putItem(TABLES.USER_PROGRESS, progress);

      return createSuccessResponse({
        success: true,
        updatedProgress: progress,
      });

    } catch (error) {
      console.error('Update progress error:', error);
      return createErrorResponse(500, 'Failed to update user progress');
    }
  }

  static async handleGetProgressSummary(event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult> {
    try {
      const userId = event.pathParameters?.userId;
      if (!userId) {
        return createErrorResponse(400, 'User ID is required');
      }

      // Get user progress
      const progress = await DynamoDBService.getItem(TABLES.USER_PROGRESS, { userId });

      if (!progress) {
        return createSuccessResponse({
          totalSections: 0,
          completedSections: 0,
          totalQuestions: 0,
          completionPercentage: 0,
          recentActivity: [],
        });
      }

      // Calculate summary statistics
      const totalSections = progress.exploredSections.length;
      const completedSections = progress.exploredSections.filter((section: any) => section.isComplete).length;
      const totalQuestions = progress.totalInteractions;
      const completionPercentage = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

      // Get recent activity (last 5 sections visited)
      const recentActivity = progress.exploredSections
        .sort((a: any, b: any) => new Date(b.lastVisited).getTime() - new Date(a.lastVisited).getTime())
        .slice(0, 5)
        .map((section: any) => ({
          sectionId: section.sectionId,
          lastVisited: section.lastVisited,
          questionsAsked: section.questionsAsked,
          isComplete: section.isComplete,
        }));

      return createSuccessResponse({
        totalSections,
        completedSections,
        totalQuestions,
        completionPercentage,
        recentActivity,
        lastUpdated: progress.updatedAt,
      });

    } catch (error) {
      console.error('Get progress summary error:', error);
      return createErrorResponse(500, 'Failed to get progress summary');
    }
  }

  static async handleGetFAFSASections(event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult> {
    try {
      // Return predefined FAFSA sections
      const fafsaSections = [
        {
          sectionId: 'student-demographics',
          title: 'Student Demographics',
          description: 'Basic information about the student',
          topics: ['Name', 'Social Security Number', 'Date of Birth', 'Citizenship Status'],
        },
        {
          sectionId: 'student-finances',
          title: 'Student Financial Information',
          description: 'Student income and asset information',
          topics: ['Income', 'Assets', 'Benefits', 'Tax Information'],
        },
        {
          sectionId: 'dependency-status',
          title: 'Dependency Status',
          description: 'Determining if student is dependent or independent',
          topics: ['Age', 'Marital Status', 'Military Service', 'Graduate Student'],
        },
        {
          sectionId: 'parent-demographics',
          title: 'Parent Demographics',
          description: 'Information about student\'s parents (if dependent)',
          topics: ['Parent Names', 'Social Security Numbers', 'Education Level'],
        },
        {
          sectionId: 'parent-finances',
          title: 'Parent Financial Information',
          description: 'Parent income and asset information (if dependent)',
          topics: ['Parent Income', 'Parent Assets', 'Tax Information', 'Household Size'],
        },
        {
          sectionId: 'school-selection',
          title: 'School Selection',
          description: 'Colleges and universities to receive FAFSA information',
          topics: ['School Codes', 'Housing Plans', 'Grade Level', 'Degree Type'],
        },
        {
          sectionId: 'signatures',
          title: 'Signatures and Submission',
          description: 'Final review and electronic signatures',
          topics: ['Student Signature', 'Parent Signature', 'FSA ID', 'Submission'],
        },
      ];

      return createSuccessResponse({
        sections: fafsaSections,
      });

    } catch (error) {
      console.error('Get FAFSA sections error:', error);
      return createErrorResponse(500, 'Failed to get FAFSA sections');
    }
  }
}

// Lambda handler functions
export const getProgress = async (event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult> => {
  return ProgressHandler.handleGetProgress(event, context);
};

export const updateProgress = async (event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult> => {
  return ProgressHandler.handleUpdateProgress(event, context);
};

export const getProgressSummary = async (event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult> => {
  return ProgressHandler.handleGetProgressSummary(event, context);
};

export const getFAFSASections = async (event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult> => {
  return ProgressHandler.handleGetFAFSASections(event, context);
};