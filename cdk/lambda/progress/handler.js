"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFAFSASections = exports.getProgressSummary = exports.updateProgress = exports.getProgress = exports.ProgressHandler = void 0;
const types_1 = require("../shared/types");
const dynamodb_1 = require("../shared/dynamodb");
class ProgressHandler {
    static async handleGetProgress(event, context) {
        try {
            const userId = event.pathParameters?.userId;
            if (!userId) {
                return (0, types_1.createErrorResponse)(400, 'User ID is required');
            }
            // Get user progress from DynamoDB
            const progress = await dynamodb_1.DynamoDBService.getItem(dynamodb_1.TABLES.USER_PROGRESS, { userId });
            if (!progress) {
                // Create initial progress record if it doesn't exist
                const initialProgress = {
                    userId,
                    exploredSections: [],
                    totalInteractions: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                await dynamodb_1.DynamoDBService.putItem(dynamodb_1.TABLES.USER_PROGRESS, initialProgress);
                return (0, types_1.createSuccessResponse)(initialProgress);
            }
            return (0, types_1.createSuccessResponse)(progress);
        }
        catch (error) {
            console.error('Get progress error:', error);
            return (0, types_1.createErrorResponse)(500, 'Failed to get user progress');
        }
    }
    static async handleUpdateProgress(event, context) {
        try {
            const userId = event.pathParameters?.userId;
            if (!userId) {
                return (0, types_1.createErrorResponse)(400, 'User ID is required');
            }
            if (!event.body) {
                return (0, types_1.createErrorResponse)(400, 'Request body is required');
            }
            const { sectionId, action } = JSON.parse(event.body);
            if (!sectionId || !action) {
                return (0, types_1.createErrorResponse)(400, 'Section ID and action are required');
            }
            if (!['mark_reviewed', 'add_question'].includes(action)) {
                return (0, types_1.createErrorResponse)(400, 'Invalid action. Must be "mark_reviewed" or "add_question"');
            }
            // Get current progress
            let progress = await dynamodb_1.DynamoDBService.getItem(dynamodb_1.TABLES.USER_PROGRESS, { userId });
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
            let sectionIndex = progress.exploredSections.findIndex((section) => section.sectionId === sectionId);
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
            }
            else if (action === 'mark_reviewed') {
                section.isComplete = true;
            }
            // Update progress in DynamoDB
            progress.updatedAt = new Date().toISOString();
            await dynamodb_1.DynamoDBService.putItem(dynamodb_1.TABLES.USER_PROGRESS, progress);
            return (0, types_1.createSuccessResponse)({
                success: true,
                updatedProgress: progress,
            });
        }
        catch (error) {
            console.error('Update progress error:', error);
            return (0, types_1.createErrorResponse)(500, 'Failed to update user progress');
        }
    }
    static async handleGetProgressSummary(event, context) {
        try {
            const userId = event.pathParameters?.userId;
            if (!userId) {
                return (0, types_1.createErrorResponse)(400, 'User ID is required');
            }
            // Get user progress
            const progress = await dynamodb_1.DynamoDBService.getItem(dynamodb_1.TABLES.USER_PROGRESS, { userId });
            if (!progress) {
                return (0, types_1.createSuccessResponse)({
                    totalSections: 0,
                    completedSections: 0,
                    totalQuestions: 0,
                    completionPercentage: 0,
                    recentActivity: [],
                });
            }
            // Calculate summary statistics
            const totalSections = progress.exploredSections.length;
            const completedSections = progress.exploredSections.filter((section) => section.isComplete).length;
            const totalQuestions = progress.totalInteractions;
            const completionPercentage = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;
            // Get recent activity (last 5 sections visited)
            const recentActivity = progress.exploredSections
                .sort((a, b) => new Date(b.lastVisited).getTime() - new Date(a.lastVisited).getTime())
                .slice(0, 5)
                .map((section) => ({
                sectionId: section.sectionId,
                lastVisited: section.lastVisited,
                questionsAsked: section.questionsAsked,
                isComplete: section.isComplete,
            }));
            return (0, types_1.createSuccessResponse)({
                totalSections,
                completedSections,
                totalQuestions,
                completionPercentage,
                recentActivity,
                lastUpdated: progress.updatedAt,
            });
        }
        catch (error) {
            console.error('Get progress summary error:', error);
            return (0, types_1.createErrorResponse)(500, 'Failed to get progress summary');
        }
    }
    static async handleGetFAFSASections(event, context) {
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
            return (0, types_1.createSuccessResponse)({
                sections: fafsaSections,
            });
        }
        catch (error) {
            console.error('Get FAFSA sections error:', error);
            return (0, types_1.createErrorResponse)(500, 'Failed to get FAFSA sections');
        }
    }
}
exports.ProgressHandler = ProgressHandler;
// Lambda handler functions
const getProgress = async (event, context) => {
    return ProgressHandler.handleGetProgress(event, context);
};
exports.getProgress = getProgress;
const updateProgress = async (event, context) => {
    return ProgressHandler.handleUpdateProgress(event, context);
};
exports.updateProgress = updateProgress;
const getProgressSummary = async (event, context) => {
    return ProgressHandler.handleGetProgressSummary(event, context);
};
exports.getProgressSummary = getProgressSummary;
const getFAFSASections = async (event, context) => {
    return ProgressHandler.handleGetFAFSASections(event, context);
};
exports.getFAFSASections = getFAFSASections;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsMkNBQTZFO0FBQzdFLGlEQUE2RDtBQUU3RCxNQUFhLGVBQWU7SUFDMUIsTUFBTSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxLQUEyQixFQUFFLE9BQXNCO1FBQ2hGLElBQUk7WUFDRixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQztZQUM1QyxJQUFJLENBQUMsTUFBTSxFQUFFO2dCQUNYLE9BQU8sSUFBQSwyQkFBbUIsRUFBQyxHQUFHLEVBQUUscUJBQXFCLENBQUMsQ0FBQzthQUN4RDtZQUVELGtDQUFrQztZQUNsQyxNQUFNLFFBQVEsR0FBRyxNQUFNLDBCQUFlLENBQUMsT0FBTyxDQUFDLGlCQUFNLENBQUMsYUFBYSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztZQUVqRixJQUFJLENBQUMsUUFBUSxFQUFFO2dCQUNiLHFEQUFxRDtnQkFDckQsTUFBTSxlQUFlLEdBQUc7b0JBQ3RCLE1BQU07b0JBQ04sZ0JBQWdCLEVBQUUsRUFBRTtvQkFDcEIsaUJBQWlCLEVBQUUsQ0FBQztvQkFDcEIsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO29CQUNuQyxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7aUJBQ3BDLENBQUM7Z0JBRUYsTUFBTSwwQkFBZSxDQUFDLE9BQU8sQ0FBQyxpQkFBTSxDQUFDLGFBQWEsRUFBRSxlQUFlLENBQUMsQ0FBQztnQkFFckUsT0FBTyxJQUFBLDZCQUFxQixFQUFDLGVBQWUsQ0FBQyxDQUFDO2FBQy9DO1lBRUQsT0FBTyxJQUFBLDZCQUFxQixFQUFDLFFBQVEsQ0FBQyxDQUFDO1NBRXhDO1FBQUMsT0FBTyxLQUFLLEVBQUU7WUFDZCxPQUFPLENBQUMsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEtB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QkFFekI7QUFFSyxNQUFNLGtCQUFrQixHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFFLE9BQXNCLEVBQWtDLEVBQUU7SUFDOUgsT0FBTyxlQUFlLENBQUMsd0JBQXdCLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ2xFLENBQUMsQ0FBQztBQUZXLFFBQUEsa0JBQWtCLHNCQUU3QjtBQUVLLE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxFQUFFLEtBQTJCLEVBQUUsT0FBc0IsRUFBa0MsRUFBRTtJQUM1SCxPQUFPLGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDaEUsQ0FBQyxDQUFDO0FBRlcsUUFBQSxnQkFBZ0Isb0JBRTNCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCwgTGFtYmRhQ29udGV4dCB9IGZyb20gJy4uL3NoYXJlZC90eXBlcyc7XG5pbXBvcnQgeyBjcmVhdGVTdWNjZXNzUmVzcG9uc2UsIGNyZWF0ZUVycm9yUmVzcG9uc2UgfSBmcm9tICcuLi9zaGFyZWQvdHlwZXMnO1xuaW1wb3J0IHsgRHluYW1vREJTZXJ2aWNlLCBUQUJMRVMgfSBmcm9tICcuLi9zaGFyZWQvZHluYW1vZGInO1xuXG5leHBvcnQgY2xhc3MgUHJvZ3Jlc3NIYW5kbGVyIHtcbiAgc3RhdGljIGFzeW5jIGhhbmRsZUdldFByb2dyZXNzKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCwgY29udGV4dDogTGFtYmRhQ29udGV4dCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHVzZXJJZCA9IGV2ZW50LnBhdGhQYXJhbWV0ZXJzPy51c2VySWQ7XG4gICAgICBpZiAoIXVzZXJJZCkge1xuICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdVc2VyIElEIGlzIHJlcXVpcmVkJyk7XG4gICAgICB9XG5cbiAgICAgIC8vIEdldCB1c2VyIHByb2dyZXNzIGZyb20gRHluYW1vREJcbiAgICAgIGNvbnN0IHByb2dyZXNzID0gYXdhaXQgRHluYW1vREJTZXJ2aWNlLmdldEl0ZW0oVEFCTEVTLlVTRVJfUFJPR1JFU1MsIHsgdXNlcklkIH0pO1xuXG4gICAgICBpZiAoIXByb2dyZXNzKSB7XG4gICAgICAgIC8vIENyZWF0ZSBpbml0aWFsIHByb2dyZXNzIHJlY29yZCBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgICAgIGNvbnN0IGluaXRpYWxQcm9ncmVzcyA9IHtcbiAgICAgICAgICB1c2VySWQsXG4gICAgICAgICAgZXhwbG9yZWRTZWN0aW9uczogW10sXG4gICAgICAgICAgdG90YWxJbnRlcmFjdGlvbnM6IDAsXG4gICAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgIH07XG5cbiAgICAgICAgYXdhaXQgRHluYW1vREJTZXJ2aWNlLnB1dEl0ZW0oVEFCTEVTLlVTRVJfUFJPR1JFU1MsIGluaXRpYWxQcm9ncmVzcyk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKGluaXRpYWxQcm9ncmVzcyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBjcmVhdGVTdWNjZXNzUmVzcG9uc2UocHJvZ3Jlc3MpO1xuXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0dldCBwcm9ncmVzcyBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg1MDAsICdGYWlsZWQgdG8gZ2V0IHVzZXIgcHJvZ3Jlc3MnKTtcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgYXN5bmMgaGFuZGxlVXBkYXRlUHJvZ3Jlc3MoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBjb250ZXh0OiBMYW1iZGFDb250ZXh0KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgdXNlcklkID0gZXZlbnQucGF0aFBhcmFtZXRlcnM/LnVzZXJJZDtcbiAgICAgIGlmICghdXNlcklkKSB7XG4gICAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMCwgJ1VzZXIgSUQgaXMgcmVxdWlyZWQnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFldmVudC5ib2R5KSB7XG4gICAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMCwgJ1JlcXVlc3QgYm9keSBpcyByZXF1aXJlZCcpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7IHNlY3Rpb25JZCwgYWN0aW9uIH0gPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkpO1xuXG4gICAgICBpZiAoIXNlY3Rpb25JZCB8fCAhYWN0aW9uKSB7XG4gICAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMCwgJ1NlY3Rpb24gSUQgYW5kIGFjdGlvbiBhcmUgcmVxdWlyZWQnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFbJ21hcmtfcmV2aWV3ZWQnLCAnYWRkX3F1ZXN0aW9uJ10uaW5jbHVkZXMoYWN0aW9uKSkge1xuICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdJbnZhbGlkIGFjdGlvbi4gTXVzdCBiZSBcIm1hcmtfcmV2aWV3ZWRcIiBvciBcImFkZF9xdWVzdGlvblwiJyk7XG4gICAgICB9XG5cbiAgICAgIC8vIEdldCBjdXJyZW50IHByb2dyZXNzXG4gICAgICBsZXQgcHJvZ3Jlc3MgPSBhd2FpdCBEeW5hbW9EQlNlcnZpY2UuZ2V0SXRlbShUQUJMRVMuVVNFUl9QUk9HUkVTUywgeyB1c2VySWQgfSk7XG5cbiAgICAgIGlmICghcHJvZ3Jlc3MpIHtcbiAgICAgICAgLy8gQ3JlYXRlIGluaXRpYWwgcHJvZ3Jlc3MgaWYgaXQgZG9lc24ndCBleGlzdFxuICAgICAgICBwcm9ncmVzcyA9IHtcbiAgICAgICAgICB1c2VySWQsXG4gICAgICAgICAgZXhwbG9yZWRTZWN0aW9uczogW10sXG4gICAgICAgICAgdG90YWxJbnRlcmFjdGlvbnM6IDAsXG4gICAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIC8vIEZpbmQgb3IgY3JlYXRlIHNlY3Rpb25cbiAgICAgIGxldCBzZWN0aW9uSW5kZXggPSBwcm9ncmVzcy5leHBsb3JlZFNlY3Rpb25zLmZpbmRJbmRleCgoc2VjdGlvbjogYW55KSA9PiBzZWN0aW9uLnNlY3Rpb25JZCA9PT0gc2VjdGlvbklkKTtcbiAgICAgIFxuICAgICAgaWYgKHNlY3Rpb25JbmRleCA9PT0gLTEpIHtcbiAgICAgICAgLy8gQWRkIG5ldyBzZWN0aW9uXG4gICAgICAgIHByb2dyZXNzLmV4cGxvcmVkU2VjdGlvbnMucHVzaCh7XG4gICAgICAgICAgc2VjdGlvbklkLFxuICAgICAgICAgIHF1ZXN0aW9uc0Fza2VkOiAwLFxuICAgICAgICAgIGxhc3RWaXNpdGVkOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgaXNDb21wbGV0ZTogZmFsc2UsXG4gICAgICAgIH0pO1xuICAgICAgICBzZWN0aW9uSW5kZXggPSBwcm9ncmVzcy5leHBsb3JlZFNlY3Rpb25zLmxlbmd0aCAtIDE7XG4gICAgICB9XG5cbiAgICAgIC8vIFVwZGF0ZSBzZWN0aW9uIGJhc2VkIG9uIGFjdGlvblxuICAgICAgY29uc3Qgc2VjdGlvbiA9IHByb2dyZXNzLmV4cGxvcmVkU2VjdGlvbnNbc2VjdGlvbkluZGV4XTtcbiAgICAgIHNlY3Rpb24ubGFzdFZpc2l0ZWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG5cbiAgICAgIGlmIChhY3Rpb24gPT09ICdhZGRfcXVlc3Rpb24nKSB7XG4gICAgICAgIHNlY3Rpb24ucXVlc3Rpb25zQXNrZWQgKz0gMTtcbiAgICAgICAgcHJvZ3Jlc3MudG90YWxJbnRlcmFjdGlvbnMgKz0gMTtcbiAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSAnbWFya19yZXZpZXdlZCcpIHtcbiAgICAgICAgc2VjdGlvbi5pc0NvbXBsZXRlID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgLy8gVXBkYXRlIHByb2dyZXNzIGluIER5bmFtb0RCXG4gICAgICBwcm9ncmVzcy51cGRhdGVkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICBhd2FpdCBEeW5hbW9EQlNlcnZpY2UucHV0SXRlbShUQUJMRVMuVVNFUl9QUk9HUkVTUywgcHJvZ3Jlc3MpO1xuXG4gICAgICByZXR1cm4gY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgdXBkYXRlZFByb2dyZXNzOiBwcm9ncmVzcyxcbiAgICAgIH0pO1xuXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1VwZGF0ZSBwcm9ncmVzcyBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg1MDAsICdGYWlsZWQgdG8gdXBkYXRlIHVzZXIgcHJvZ3Jlc3MnKTtcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgYXN5bmMgaGFuZGxlR2V0UHJvZ3Jlc3NTdW1tYXJ5KGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCwgY29udGV4dDogTGFtYmRhQ29udGV4dCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHVzZXJJZCA9IGV2ZW50LnBhdGhQYXJhbWV0ZXJzPy51c2VySWQ7XG4gICAgICBpZiAoIXVzZXJJZCkge1xuICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdVc2VyIElEIGlzIHJlcXVpcmVkJyk7XG4gICAgICB9XG5cbiAgICAgIC8vIEdldCB1c2VyIHByb2dyZXNzXG4gICAgICBjb25zdCBwcm9ncmVzcyA9IGF3YWl0IER5bmFtb0RCU2VydmljZS5nZXRJdGVtKFRBQkxFUy5VU0VSX1BST0dSRVNTLCB7IHVzZXJJZCB9KTtcblxuICAgICAgaWYgKCFwcm9ncmVzcykge1xuICAgICAgICByZXR1cm4gY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICB0b3RhbFNlY3Rpb25zOiAwLFxuICAgICAgICAgIGNvbXBsZXRlZFNlY3Rpb25zOiAwLFxuICAgICAgICAgIHRvdGFsUXVlc3Rpb25zOiAwLFxuICAgICAgICAgIGNvbXBsZXRpb25QZXJjZW50YWdlOiAwLFxuICAgICAgICAgIHJlY2VudEFjdGl2aXR5OiBbXSxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIENhbGN1bGF0ZSBzdW1tYXJ5IHN0YXRpc3RpY3NcbiAgICAgIGNvbnN0IHRvdGFsU2VjdGlvbnMgPSBwcm9ncmVzcy5leHBsb3JlZFNlY3Rpb25zLmxlbmd0aDtcbiAgICAgIGNvbnN0IGNvbXBsZXRlZFNlY3Rpb25zID0gcHJvZ3Jlc3MuZXhwbG9yZWRTZWN0aW9ucy5maWx0ZXIoKHNlY3Rpb246IGFueSkgPT4gc2VjdGlvbi5pc0NvbXBsZXRlKS5sZW5ndGg7XG4gICAgICBjb25zdCB0b3RhbFF1ZXN0aW9ucyA9IHByb2dyZXNzLnRvdGFsSW50ZXJhY3Rpb25zO1xuICAgICAgY29uc3QgY29tcGxldGlvblBlcmNlbnRhZ2UgPSB0b3RhbFNlY3Rpb25zID4gMCA/IE1hdGgucm91bmQoKGNvbXBsZXRlZFNlY3Rpb25zIC8gdG90YWxTZWN0aW9ucykgKiAxMDApIDogMDtcblxuICAgICAgLy8gR2V0IHJlY2VudCBhY3Rpdml0eSAobGFzdCA1IHNlY3Rpb25zIHZpc2l0ZWQpXG4gICAgICBjb25zdCByZWNlbnRBY3Rpdml0eSA9IHByb2dyZXNzLmV4cGxvcmVkU2VjdGlvbnNcbiAgICAgICAgLnNvcnQoKGE6IGFueSwgYjogYW55KSA9PiBuZXcgRGF0ZShiLmxhc3RWaXNpdGVkKS5nZXRUaW1lKCkgLSBuZXcgRGF0ZShhLmxhc3RWaXNpdGVkKS5nZXRUaW1lKCkpXG4gICAgICAgIC5zbGljZSgwLCA1KVxuICAgICAgICAubWFwKChzZWN0aW9uOiBhbnkpID0+ICh7XG4gICAgICAgICAgc2VjdGlvbklkOiBzZWN0aW9uLnNlY3Rpb25JZCxcbiAgICAgICAgICBsYXN0VmlzaXRlZDogc2VjdGlvbi5sYXN0VmlzaXRlZCxcbiAgICAgICAgICBxdWVzdGlvbnNBc2tlZDogc2VjdGlvbi5xdWVzdGlvbnNBc2tlZCxcbiAgICAgICAgICBpc0NvbXBsZXRlOiBzZWN0aW9uLmlzQ29tcGxldGUsXG4gICAgICAgIH0pKTtcblxuICAgICAgcmV0dXJuIGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgIHRvdGFsU2VjdGlvbnMsXG4gICAgICAgIGNvbXBsZXRlZFNlY3Rpb25zLFxuICAgICAgICB0b3RhbFF1ZXN0aW9ucyxcbiAgICAgICAgY29tcGxldGlvblBlcmNlbnRhZ2UsXG4gICAgICAgIHJlY2VudEFjdGl2aXR5LFxuICAgICAgICBsYXN0VXBkYXRlZDogcHJvZ3Jlc3MudXBkYXRlZEF0LFxuICAgICAgfSk7XG5cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignR2V0IHByb2dyZXNzIHN1bW1hcnkgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNTAwLCAnRmFpbGVkIHRvIGdldCBwcm9ncmVzcyBzdW1tYXJ5Jyk7XG4gICAgfVxuICB9XG5cbiAgc3RhdGljIGFzeW5jIGhhbmRsZUdldEZBRlNBU2VjdGlvbnMoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBjb250ZXh0OiBMYW1iZGFDb250ZXh0KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcbiAgICB0cnkge1xuICAgICAgLy8gUmV0dXJuIHByZWRlZmluZWQgRkFGU0Egc2VjdGlvbnNcbiAgICAgIGNvbnN0IGZhZnNhU2VjdGlvbnMgPSBbXG4gICAgICAgIHtcbiAgICAgICAgICBzZWN0aW9uSWQ6ICdzdHVkZW50LWRlbW9ncmFwaGljcycsXG4gICAgICAgICAgdGl0bGU6ICdTdHVkZW50IERlbW9ncmFwaGljcycsXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdCYXNpYyBpbmZvcm1hdGlvbiBhYm91dCB0aGUgc3R1ZGVudCcsXG4gICAgICAgICAgdG9waWNzOiBbJ05hbWUnLCAnU29jaWFsIFNlY3VyaXR5IE51bWJlcicsICdEYXRlIG9mIEJpcnRoJywgJ0NpdGl6ZW5zaGlwIFN0YXR1cyddLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgc2VjdGlvbklkOiAnc3R1ZGVudC1maW5hbmNlcycsXG4gICAgICAgICAgdGl0bGU6ICdTdHVkZW50IEZpbmFuY2lhbCBJbmZvcm1hdGlvbicsXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdTdHVkZW50IGluY29tZSBhbmQgYXNzZXQgaW5mb3JtYXRpb24nLFxuICAgICAgICAgIHRvcGljczogWydJbmNvbWUnLCAnQXNzZXRzJywgJ0JlbmVmaXRzJywgJ1RheCBJbmZvcm1hdGlvbiddLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgc2VjdGlvbklkOiAnZGVwZW5kZW5jeS1zdGF0dXMnLFxuICAgICAgICAgIHRpdGxlOiAnRGVwZW5kZW5jeSBTdGF0dXMnLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRGV0ZXJtaW5pbmcgaWYgc3R1ZGVudCBpcyBkZXBlbmRlbnQgb3IgaW5kZXBlbmRlbnQnLFxuICAgICAgICAgIHRvcGljczogWydBZ2UnLCAnTWFyaXRhbCBTdGF0dXMnLCAnTWlsaXRhcnkgU2VydmljZScsICdHcmFkdWF0ZSBTdHVkZW50J10sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBzZWN0aW9uSWQ6ICdwYXJlbnQtZGVtb2dyYXBoaWNzJyxcbiAgICAgICAgICB0aXRsZTogJ1BhcmVudCBEZW1vZ3JhcGhpY3MnLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnSW5mb3JtYXRpb24gYWJvdXQgc3R1ZGVudFxcJ3MgcGFyZW50cyAoaWYgZGVwZW5kZW50KScsXG4gICAgICAgICAgdG9waWNzOiBbJ1BhcmVudCBOYW1lcycsICdTb2NpYWwgU2VjdXJpdHkgTnVtYmVycycsICdFZHVjYXRpb24gTGV2ZWwnXSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHNlY3Rpb25JZDogJ3BhcmVudC1maW5hbmNlcycsXG4gICAgICAgICAgdGl0bGU6ICdQYXJlbnQgRmluYW5jaWFsIEluZm9ybWF0aW9uJyxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ1BhcmVudCBpbmNvbWUgYW5kIGFzc2V0IGluZm9ybWF0aW9uIChpZiBkZXBlbmRlbnQpJyxcbiAgICAgICAgICB0b3BpY3M6IFsnUGFyZW50IEluY29tZScsICdQYXJlbnQgQXNzZXRzJywgJ1RheCBJbmZvcm1hdGlvbicsICdIb3VzZWhvbGQgU2l6ZSddLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgc2VjdGlvbklkOiAnc2Nob29sLXNlbGVjdGlvbicsXG4gICAgICAgICAgdGl0bGU6ICdTY2hvb2wgU2VsZWN0aW9uJyxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NvbGxlZ2VzIGFuZCB1bml2ZXJzaXRpZXMgdG8gcmVjZWl2ZSBGQUZTQSBpbmZvcm1hdGlvbicsXG4gICAgICAgICAgdG9waWNzOiBbJ1NjaG9vbCBDb2RlcycsICdIb3VzaW5nIFBsYW5zJywgJ0dyYWRlIExldmVsJywgJ0RlZ3JlZSBUeXBlJ10sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBzZWN0aW9uSWQ6ICdzaWduYXR1cmVzJyxcbiAgICAgICAgICB0aXRsZTogJ1NpZ25hdHVyZXMgYW5kIFN1Ym1pc3Npb24nLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRmluYWwgcmV2aWV3IGFuZCBlbGVjdHJvbmljIHNpZ25hdHVyZXMnLFxuICAgICAgICAgIHRvcGljczogWydTdHVkZW50IFNpZ25hdHVyZScsICdQYXJlbnQgU2lnbmF0dXJlJywgJ0ZTQSBJRCcsICdTdWJtaXNzaW9uJ10sXG4gICAgICAgIH0sXG4gICAgICBdO1xuXG4gICAgICByZXR1cm4gY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgc2VjdGlvbnM6IGZhZnNhU2VjdGlvbnMsXG4gICAgICB9KTtcblxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdHZXQgRkFGU0Egc2VjdGlvbnMgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNTAwLCAnRmFpbGVkIHRvIGdldCBGQUZTQSBzZWN0aW9ucycpO1xuICAgIH1cbiAgfVxufVxuXG4vLyBMYW1iZGEgaGFuZGxlciBmdW5jdGlvbnNcbmV4cG9ydCBjb25zdCBnZXRQcm9ncmVzcyA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQsIGNvbnRleHQ6IExhbWJkYUNvbnRleHQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xuICByZXR1cm4gUHJvZ3Jlc3NIYW5kbGVyLmhhbmRsZUdldFByb2dyZXNzKGV2ZW50LCBjb250ZXh0KTtcbn07XG5cbmV4cG9ydCBjb25zdCB1cGRhdGVQcm9ncmVzcyA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQsIGNvbnRleHQ6IExhbWJkYUNvbnRleHQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xuICByZXR1cm4gUHJvZ3Jlc3NIYW5kbGVyLmhhbmRsZVVwZGF0ZVByb2dyZXNzKGV2ZW50LCBjb250ZXh0KTtcbn07XG5cbmV4cG9ydCBjb25zdCBnZXRQcm9ncmVzc1N1bW1hcnkgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBjb250ZXh0OiBMYW1iZGFDb250ZXh0KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcbiAgcmV0dXJuIFByb2dyZXNzSGFuZGxlci5oYW5kbGVHZXRQcm9ncmVzc1N1bW1hcnkoZXZlbnQsIGNvbnRleHQpO1xufTtcblxuZXhwb3J0IGNvbnN0IGdldEZBRlNBU2VjdGlvbnMgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBjb250ZXh0OiBMYW1iZGFDb250ZXh0KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcbiAgcmV0dXJuIFByb2dyZXNzSGFuZGxlci5oYW5kbGVHZXRGQUZTQVNlY3Rpb25zKGV2ZW50LCBjb250ZXh0KTtcbn07Il19