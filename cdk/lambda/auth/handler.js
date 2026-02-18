"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserProfile = exports.guestMode = exports.forgotPassword = exports.signIn = exports.signUp = exports.AuthHandler = void 0;
const types_1 = require("../shared/types");
const dynamodb_1 = require("../shared/dynamodb");
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const uuid_1 = require("uuid");
const cognitoClient = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({
    region: process.env.AWS_REGION || 'us-east-1'
});
const USER_POOL_ID = process.env.USER_POOL_ID;
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID;
class AuthHandler {
    static async handleSignUp(event, context) {
        try {
            if (!event.body) {
                return (0, types_1.createErrorResponse)(400, 'Request body is required');
            }
            const { email, password } = JSON.parse(event.body);
            // Validate input
            if (!email || !password) {
                return (0, types_1.createErrorResponse)(400, 'Email and password are required');
            }
            if (!this.isValidEmail(email)) {
                return (0, types_1.createErrorResponse)(400, 'Please enter a valid email address');
            }
            if (password.length < 8) {
                return (0, types_1.createErrorResponse)(400, 'Password must be at least 8 characters long');
            }
            // Create user in Cognito
            const userId = (0, uuid_1.v4)();
            const createUserCommand = new client_cognito_identity_provider_1.AdminCreateUserCommand({
                UserPoolId: USER_POOL_ID,
                Username: email,
                UserAttributes: [
                    { Name: 'email', Value: email },
                    { Name: 'email_verified', Value: 'true' },
                    { Name: 'custom:userId', Value: userId },
                ],
                TemporaryPassword: password,
                MessageAction: 'SUPPRESS', // Don't send welcome email
            });
            await cognitoClient.send(createUserCommand);
            // Set permanent password
            const setPasswordCommand = new client_cognito_identity_provider_1.AdminSetUserPasswordCommand({
                UserPoolId: USER_POOL_ID,
                Username: email,
                Password: password,
                Permanent: true,
            });
            await cognitoClient.send(setPasswordCommand);
            // Create user record in DynamoDB
            const userRecord = {
                userId,
                email,
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
                preferences: {
                    theme: 'light',
                    notifications: true,
                },
                isGuest: false,
            };
            await dynamodb_1.DynamoDBService.putItem(dynamodb_1.TABLES.USERS, userRecord);
            // Initialize user progress
            const progressRecord = {
                userId,
                exploredSections: [],
                totalInteractions: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            await dynamodb_1.DynamoDBService.putItem(dynamodb_1.TABLES.USER_PROGRESS, progressRecord);
            return (0, types_1.createSuccessResponse)({
                user: {
                    userId,
                    email,
                    isGuest: false,
                },
                message: 'Account created successfully',
            });
        }
        catch (error) {
            console.error('Sign up error:', error);
            if (error.name === 'UsernameExistsException') {
                return (0, types_1.createErrorResponse)(409, 'An account with this email already exists');
            }
            return (0, types_1.createErrorResponse)(500, 'Failed to create account');
        }
    }
    static async handleSignIn(event, context) {
        try {
            if (!event.body) {
                return (0, types_1.createErrorResponse)(400, 'Request body is required');
            }
            const { email, password } = JSON.parse(event.body);
            // Validate input
            if (!email || !password) {
                return (0, types_1.createErrorResponse)(400, 'Email and password are required');
            }
            // Authenticate with Cognito
            const authCommand = new client_cognito_identity_provider_1.AdminInitiateAuthCommand({
                UserPoolId: USER_POOL_ID,
                ClientId: USER_POOL_CLIENT_ID,
                AuthFlow: 'ADMIN_NO_SRP_AUTH',
                AuthParameters: {
                    USERNAME: email,
                    PASSWORD: password,
                },
            });
            const authResponse = await cognitoClient.send(authCommand);
            if (!authResponse.AuthenticationResult) {
                return (0, types_1.createErrorResponse)(401, 'Invalid email or password');
            }
            // Get user info from token
            const accessToken = authResponse.AuthenticationResult.AccessToken;
            const idToken = authResponse.AuthenticationResult.IdToken;
            // Decode the ID token to get user info (simplified - in production, use proper JWT library)
            const tokenPayload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
            const userId = tokenPayload['custom:userId'] || tokenPayload.sub;
            // Update last login time
            await dynamodb_1.DynamoDBService.updateItem(dynamodb_1.TABLES.USERS, { userId }, 'SET lastLoginAt = :now', { ':now': new Date().toISOString() });
            return (0, types_1.createSuccessResponse)({
                user: {
                    userId,
                    email: tokenPayload.email,
                    isGuest: false,
                },
                tokens: {
                    accessToken,
                    idToken,
                    refreshToken: authResponse.AuthenticationResult.RefreshToken,
                },
            });
        }
        catch (error) {
            console.error('Sign in error:', error);
            if (error.name === 'NotAuthorizedException') {
                return (0, types_1.createErrorResponse)(401, 'Invalid email or password');
            }
            return (0, types_1.createErrorResponse)(500, 'Failed to sign in');
        }
    }
    static async handleForgotPassword(event, context) {
        try {
            if (!event.body) {
                return (0, types_1.createErrorResponse)(400, 'Request body is required');
            }
            const { email } = JSON.parse(event.body);
            if (!email) {
                return (0, types_1.createErrorResponse)(400, 'Email is required');
            }
            if (!this.isValidEmail(email)) {
                return (0, types_1.createErrorResponse)(400, 'Please enter a valid email address');
            }
            const forgotPasswordCommand = new client_cognito_identity_provider_1.ForgotPasswordCommand({
                ClientId: USER_POOL_CLIENT_ID,
                Username: email,
            });
            await cognitoClient.send(forgotPasswordCommand);
            return (0, types_1.createSuccessResponse)({
                message: 'Password reset code sent to your email',
            });
        }
        catch (error) {
            console.error('Forgot password error:', error);
            if (error.name === 'UserNotFoundException') {
                // Don't reveal if user exists or not for security
                return (0, types_1.createSuccessResponse)({
                    message: 'If an account with this email exists, a password reset code has been sent',
                });
            }
            return (0, types_1.createErrorResponse)(500, 'Failed to process password reset request');
        }
    }
    static async handleGuestMode(event, context) {
        try {
            // Create a temporary guest user ID
            const guestUserId = `guest_${(0, uuid_1.v4)()}`;
            return (0, types_1.createSuccessResponse)({
                user: {
                    userId: guestUserId,
                    email: null,
                    isGuest: true,
                },
                message: 'Guest session created',
            });
        }
        catch (error) {
            console.error('Guest mode error:', error);
            return (0, types_1.createErrorResponse)(500, 'Failed to create guest session');
        }
    }
    static async handleGetUserProfile(event, context) {
        try {
            const userId = event.pathParameters?.userId;
            if (!userId) {
                return (0, types_1.createErrorResponse)(400, 'User ID is required');
            }
            // Get user from DynamoDB
            const user = await dynamodb_1.DynamoDBService.getItem(dynamodb_1.TABLES.USERS, { userId });
            if (!user) {
                return (0, types_1.createErrorResponse)(404, 'User not found');
            }
            return (0, types_1.createSuccessResponse)({
                user: {
                    userId: user.userId,
                    email: user.email,
                    preferences: user.preferences,
                    createdAt: user.createdAt,
                    lastLoginAt: user.lastLoginAt,
                    isGuest: user.isGuest || false,
                },
            });
        }
        catch (error) {
            console.error('Get user profile error:', error);
            return (0, types_1.createErrorResponse)(500, 'Failed to get user profile');
        }
    }
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}
exports.AuthHandler = AuthHandler;
// Lambda handler functions
const signUp = async (event, context) => {
    return AuthHandler.handleSignUp(event, context);
};
exports.signUp = signUp;
const signIn = async (event, context) => {
    return AuthHandler.handleSignIn(event, context);
};
exports.signIn = signIn;
const forgotPassword = async (event, context) => {
    return AuthHandler.handleForgotPassword(event, context);
};
exports.forgotPassword = forgotPassword;
const guestMode = async (event, context) => {
    return AuthHandler.handleGuestMode(event, context);
};
exports.guestMode = guestMode;
const getUserProfile = async (event, context) => {
    return AuthHandler.handleGetUserProfile(event, context);
};
exports.getUserProfile = getUserProfile;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsMkNBQTZFO0FBQzdFLGlEQUE2RDtBQUM3RCxnR0FBa1E7QUFDbFEsK0JBQW9DO0FBRXBDLE1BQU0sYUFBYSxHQUFHLElBQUksZ0VBQTZCLENBQUM7SUFDdEQsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVc7Q0FDOUMsQ0FBQyxDQUFDO0FBRUgsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFhLENBQUM7QUFDL0MsTUFBTSxtQkFBbUIsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFvQixDQUFDO0FBRTdELE1BQWEsV0FBVztJQUN0QixNQUFNLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxLQUEyQixFQUFFLE9BQXNCO1FBQzNFLElBQUk7WUFDRixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRTtnQkFDZixPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLDBCQUEwQixDQUFDLENBQUM7YUFDN0Q7WUFFRCxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRW5ELGlCQUFpQjtZQUNqQixJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsUUFBUSxFQUFFO2dCQUN2QixPQUFPLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxFQUFFLGlDQUFpQyxDQUFDLENBQUM7YUFDcEU7WUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDN0IsT0FBTyxJQUFBLDJCQUFtQixFQUFDLEdBQUcsRUFBRSxvQ0FBb0MsQ0FBQyxDQUFDO2FBQ3ZFO1lBRUQsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDdkIsT0FB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QUssRUFBRSxLQUEyQixFQUFFLE9BQXNCLEVBQWtDLEVBQUU7SUFDMUgsT0FBTyxXQUFXLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQzFELENBQUMsQ0FBQztBQUZXLFFBQUEsY0FBYyxrQkFFekIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0LCBMYW1iZGFDb250ZXh0IH0gZnJvbSAnLi4vc2hhcmVkL3R5cGVzJztcbmltcG9ydCB7IGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSwgY3JlYXRlRXJyb3JSZXNwb25zZSB9IGZyb20gJy4uL3NoYXJlZC90eXBlcyc7XG5pbXBvcnQgeyBEeW5hbW9EQlNlcnZpY2UsIFRBQkxFUyB9IGZyb20gJy4uL3NoYXJlZC9keW5hbW9kYic7XG5pbXBvcnQgeyBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCwgQWRtaW5DcmVhdGVVc2VyQ29tbWFuZCwgQWRtaW5TZXRVc2VyUGFzc3dvcmRDb21tYW5kLCBBZG1pbkluaXRpYXRlQXV0aENvbW1hbmQsIEFkbWluUmVzcG9uZFRvQXV0aENoYWxsZW5nZUNvbW1hbmQsIEZvcmdvdFBhc3N3b3JkQ29tbWFuZCwgQ29uZmlybUZvcmdvdFBhc3N3b3JkQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1jb2duaXRvLWlkZW50aXR5LXByb3ZpZGVyJztcbmltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gJ3V1aWQnO1xuXG5jb25zdCBjb2duaXRvQ2xpZW50ID0gbmV3IENvZ25pdG9JZGVudGl0eVByb3ZpZGVyQ2xpZW50KHsgXG4gIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyBcbn0pO1xuXG5jb25zdCBVU0VSX1BPT0xfSUQgPSBwcm9jZXNzLmVudi5VU0VSX1BPT0xfSUQhO1xuY29uc3QgVVNFUl9QT09MX0NMSUVOVF9JRCA9IHByb2Nlc3MuZW52LlVTRVJfUE9PTF9DTElFTlRfSUQhO1xuXG5leHBvcnQgY2xhc3MgQXV0aEhhbmRsZXIge1xuICBzdGF0aWMgYXN5bmMgaGFuZGxlU2lnblVwKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCwgY29udGV4dDogTGFtYmRhQ29udGV4dCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XG4gICAgdHJ5IHtcbiAgICAgIGlmICghZXZlbnQuYm9keSkge1xuICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgeyBlbWFpbCwgcGFzc3dvcmQgfSA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XG5cbiAgICAgIC8vIFZhbGlkYXRlIGlucHV0XG4gICAgICBpZiAoIWVtYWlsIHx8ICFwYXNzd29yZCkge1xuICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdFbWFpbCBhbmQgcGFzc3dvcmQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICghdGhpcy5pc1ZhbGlkRW1haWwoZW1haWwpKSB7XG4gICAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMCwgJ1BsZWFzZSBlbnRlciBhIHZhbGlkIGVtYWlsIGFkZHJlc3MnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBhc3N3b3JkLmxlbmd0aCA8IDgpIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAnUGFzc3dvcmQgbXVzdCBiZSBhdCBsZWFzdCA4IGNoYXJhY3RlcnMgbG9uZycpO1xuICAgICAgfVxuXG4gICAgICAvLyBDcmVhdGUgdXNlciBpbiBDb2duaXRvXG4gICAgICBjb25zdCB1c2VySWQgPSB1dWlkdjQoKTtcbiAgICAgIFxuICAgICAgY29uc3QgY3JlYXRlVXNlckNvbW1hbmQgPSBuZXcgQWRtaW5DcmVhdGVVc2VyQ29tbWFuZCh7XG4gICAgICAgIFVzZXJQb29sSWQ6IFVTRVJfUE9PTF9JRCxcbiAgICAgICAgVXNlcm5hbWU6IGVtYWlsLFxuICAgICAgICBVc2VyQXR0cmlidXRlczogW1xuICAgICAgICAgIHsgTmFtZTogJ2VtYWlsJywgVmFsdWU6IGVtYWlsIH0sXG4gICAgICAgICAgeyBOYW1lOiAnZW1haWxfdmVyaWZpZWQnLCBWYWx1ZTogJ3RydWUnIH0sXG4gICAgICAgICAgeyBOYW1lOiAnY3VzdG9tOnVzZXJJZCcsIFZhbHVlOiB1c2VySWQgfSxcbiAgICAgICAgXSxcbiAgICAgICAgVGVtcG9yYXJ5UGFzc3dvcmQ6IHBhc3N3b3JkLFxuICAgICAgICBNZXNzYWdlQWN0aW9uOiAnU1VQUFJFU1MnLCAvLyBEb24ndCBzZW5kIHdlbGNvbWUgZW1haWxcbiAgICAgIH0pO1xuXG4gICAgICBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQoY3JlYXRlVXNlckNvbW1hbmQpO1xuXG4gICAgICAvLyBTZXQgcGVybWFuZW50IHBhc3N3b3JkXG4gICAgICBjb25zdCBzZXRQYXNzd29yZENvbW1hbmQgPSBuZXcgQWRtaW5TZXRVc2VyUGFzc3dvcmRDb21tYW5kKHtcbiAgICAgICAgVXNlclBvb2xJZDogVVNFUl9QT09MX0lELFxuICAgICAgICBVc2VybmFtZTogZW1haWwsXG4gICAgICAgIFBhc3N3b3JkOiBwYXNzd29yZCxcbiAgICAgICAgUGVybWFuZW50OiB0cnVlLFxuICAgICAgfSk7XG5cbiAgICAgIGF3YWl0IGNvZ25pdG9DbGllbnQuc2VuZChzZXRQYXNzd29yZENvbW1hbmQpO1xuXG4gICAgICAvLyBDcmVhdGUgdXNlciByZWNvcmQgaW4gRHluYW1vREJcbiAgICAgIGNvbnN0IHVzZXJSZWNvcmQgPSB7XG4gICAgICAgIHVzZXJJZCxcbiAgICAgICAgZW1haWwsXG4gICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICBsYXN0TG9naW5BdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICBwcmVmZXJlbmNlczoge1xuICAgICAgICAgIHRoZW1lOiAnbGlnaHQnLFxuICAgICAgICAgIG5vdGlmaWNhdGlvbnM6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICAgIGlzR3Vlc3Q6IGZhbHNlLFxuICAgICAgfTtcblxuICAgICAgYXdhaXQgRHluYW1vREJTZXJ2aWNlLnB1dEl0ZW0oVEFCTEVTLlVTRVJTLCB1c2VyUmVjb3JkKTtcblxuICAgICAgLy8gSW5pdGlhbGl6ZSB1c2VyIHByb2dyZXNzXG4gICAgICBjb25zdCBwcm9ncmVzc1JlY29yZCA9IHtcbiAgICAgICAgdXNlcklkLFxuICAgICAgICBleHBsb3JlZFNlY3Rpb25zOiBbXSxcbiAgICAgICAgdG90YWxJbnRlcmFjdGlvbnM6IDAsXG4gICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICB1cGRhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgIH07XG5cbiAgICAgIGF3YWl0IER5bmFtb0RCU2VydmljZS5wdXRJdGVtKFRBQkxFUy5VU0VSX1BST0dSRVNTLCBwcm9ncmVzc1JlY29yZCk7XG5cbiAgICAgIHJldHVybiBjcmVhdGVTdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgdXNlcklkLFxuICAgICAgICAgIGVtYWlsLFxuICAgICAgICAgIGlzR3Vlc3Q6IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgICBtZXNzYWdlOiAnQWNjb3VudCBjcmVhdGVkIHN1Y2Nlc3NmdWxseScsXG4gICAgICB9KTtcblxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1NpZ24gdXAgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgXG4gICAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ1VzZXJuYW1lRXhpc3RzRXhjZXB0aW9uJykge1xuICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDksICdBbiBhY2NvdW50IHdpdGggdGhpcyBlbWFpbCBhbHJlYWR5IGV4aXN0cycpO1xuICAgICAgfVxuICAgICAgXG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg1MDAsICdGYWlsZWQgdG8gY3JlYXRlIGFjY291bnQnKTtcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgYXN5bmMgaGFuZGxlU2lnbkluKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCwgY29udGV4dDogTGFtYmRhQ29udGV4dCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XG4gICAgdHJ5IHtcbiAgICAgIGlmICghZXZlbnQuYm9keSkge1xuICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgeyBlbWFpbCwgcGFzc3dvcmQgfSA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XG5cbiAgICAgIC8vIFZhbGlkYXRlIGlucHV0XG4gICAgICBpZiAoIWVtYWlsIHx8ICFwYXNzd29yZCkge1xuICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdFbWFpbCBhbmQgcGFzc3dvcmQgYXJlIHJlcXVpcmVkJyk7XG4gICAgICB9XG5cbiAgICAgIC8vIEF1dGhlbnRpY2F0ZSB3aXRoIENvZ25pdG9cbiAgICAgIGNvbnN0IGF1dGhDb21tYW5kID0gbmV3IEFkbWluSW5pdGlhdGVBdXRoQ29tbWFuZCh7XG4gICAgICAgIFVzZXJQb29sSWQ6IFVTRVJfUE9PTF9JRCxcbiAgICAgICAgQ2xpZW50SWQ6IFVTRVJfUE9PTF9DTElFTlRfSUQsXG4gICAgICAgIEF1dGhGbG93OiAnQURNSU5fTk9fU1JQX0FVVEgnLFxuICAgICAgICBBdXRoUGFyYW1ldGVyczoge1xuICAgICAgICAgIFVTRVJOQU1FOiBlbWFpbCxcbiAgICAgICAgICBQQVNTV09SRDogcGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgYXV0aFJlc3BvbnNlID0gYXdhaXQgY29nbml0b0NsaWVudC5zZW5kKGF1dGhDb21tYW5kKTtcblxuICAgICAgaWYgKCFhdXRoUmVzcG9uc2UuQXV0aGVudGljYXRpb25SZXN1bHQpIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAxLCAnSW52YWxpZCBlbWFpbCBvciBwYXNzd29yZCcpO1xuICAgICAgfVxuXG4gICAgICAvLyBHZXQgdXNlciBpbmZvIGZyb20gdG9rZW5cbiAgICAgIGNvbnN0IGFjY2Vzc1Rva2VuID0gYXV0aFJlc3BvbnNlLkF1dGhlbnRpY2F0aW9uUmVzdWx0LkFjY2Vzc1Rva2VuITtcbiAgICAgIGNvbnN0IGlkVG9rZW4gPSBhdXRoUmVzcG9uc2UuQXV0aGVudGljYXRpb25SZXN1bHQuSWRUb2tlbiE7XG4gICAgICBcbiAgICAgIC8vIERlY29kZSB0aGUgSUQgdG9rZW4gdG8gZ2V0IHVzZXIgaW5mbyAoc2ltcGxpZmllZCAtIGluIHByb2R1Y3Rpb24sIHVzZSBwcm9wZXIgSldUIGxpYnJhcnkpXG4gICAgICBjb25zdCB0b2tlblBheWxvYWQgPSBKU09OLnBhcnNlKEJ1ZmZlci5mcm9tKGlkVG9rZW4uc3BsaXQoJy4nKVsxXSwgJ2Jhc2U2NCcpLnRvU3RyaW5nKCkpO1xuICAgICAgY29uc3QgdXNlcklkID0gdG9rZW5QYXlsb2FkWydjdXN0b206dXNlcklkJ10gfHwgdG9rZW5QYXlsb2FkLnN1YjtcblxuICAgICAgLy8gVXBkYXRlIGxhc3QgbG9naW4gdGltZVxuICAgICAgYXdhaXQgRHluYW1vREJTZXJ2aWNlLnVwZGF0ZUl0ZW0oXG4gICAgICAgIFRBQkxFUy5VU0VSUyxcbiAgICAgICAgeyB1c2VySWQgfSxcbiAgICAgICAgJ1NFVCBsYXN0TG9naW5BdCA9IDpub3cnLFxuICAgICAgICB7ICc6bm93JzogbmV3IERhdGUoKS50b0lTT1N0cmluZygpIH1cbiAgICAgICk7XG5cbiAgICAgIHJldHVybiBjcmVhdGVTdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgdXNlcklkLFxuICAgICAgICAgIGVtYWlsOiB0b2tlblBheWxvYWQuZW1haWwsXG4gICAgICAgICAgaXNHdWVzdDogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICAgIHRva2Vuczoge1xuICAgICAgICAgIGFjY2Vzc1Rva2VuLFxuICAgICAgICAgIGlkVG9rZW4sXG4gICAgICAgICAgcmVmcmVzaFRva2VuOiBhdXRoUmVzcG9uc2UuQXV0aGVudGljYXRpb25SZXN1bHQuUmVmcmVzaFRva2VuLFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdTaWduIGluIGVycm9yOicsIGVycm9yKTtcbiAgICAgIFxuICAgICAgaWYgKGVycm9yLm5hbWUgPT09ICdOb3RBdXRob3JpemVkRXhjZXB0aW9uJykge1xuICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDEsICdJbnZhbGlkIGVtYWlsIG9yIHBhc3N3b3JkJyk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ0ZhaWxlZCB0byBzaWduIGluJyk7XG4gICAgfVxuICB9XG5cbiAgc3RhdGljIGFzeW5jIGhhbmRsZUZvcmdvdFBhc3N3b3JkKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCwgY29udGV4dDogTGFtYmRhQ29udGV4dCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XG4gICAgdHJ5IHtcbiAgICAgIGlmICghZXZlbnQuYm9keSkge1xuICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgeyBlbWFpbCB9ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcblxuICAgICAgaWYgKCFlbWFpbCkge1xuICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdFbWFpbCBpcyByZXF1aXJlZCcpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXRoaXMuaXNWYWxpZEVtYWlsKGVtYWlsKSkge1xuICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdQbGVhc2UgZW50ZXIgYSB2YWxpZCBlbWFpbCBhZGRyZXNzJyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGZvcmdvdFBhc3N3b3JkQ29tbWFuZCA9IG5ldyBGb3Jnb3RQYXNzd29yZENvbW1hbmQoe1xuICAgICAgICBDbGllbnRJZDogVVNFUl9QT09MX0NMSUVOVF9JRCxcbiAgICAgICAgVXNlcm5hbWU6IGVtYWlsLFxuICAgICAgfSk7XG5cbiAgICAgIGF3YWl0IGNvZ25pdG9DbGllbnQuc2VuZChmb3Jnb3RQYXNzd29yZENvbW1hbmQpO1xuXG4gICAgICByZXR1cm4gY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgbWVzc2FnZTogJ1Bhc3N3b3JkIHJlc2V0IGNvZGUgc2VudCB0byB5b3VyIGVtYWlsJyxcbiAgICAgIH0pO1xuXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgY29uc29sZS5lcnJvcignRm9yZ290IHBhc3N3b3JkIGVycm9yOicsIGVycm9yKTtcbiAgICAgIFxuICAgICAgaWYgKGVycm9yLm5hbWUgPT09ICdVc2VyTm90Rm91bmRFeGNlcHRpb24nKSB7XG4gICAgICAgIC8vIERvbid0IHJldmVhbCBpZiB1c2VyIGV4aXN0cyBvciBub3QgZm9yIHNlY3VyaXR5XG4gICAgICAgIHJldHVybiBjcmVhdGVTdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICAgIG1lc3NhZ2U6ICdJZiBhbiBhY2NvdW50IHdpdGggdGhpcyBlbWFpbCBleGlzdHMsIGEgcGFzc3dvcmQgcmVzZXQgY29kZSBoYXMgYmVlbiBzZW50JyxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ0ZhaWxlZCB0byBwcm9jZXNzIHBhc3N3b3JkIHJlc2V0IHJlcXVlc3QnKTtcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgYXN5bmMgaGFuZGxlR3Vlc3RNb2RlKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCwgY29udGV4dDogTGFtYmRhQ29udGV4dCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIENyZWF0ZSBhIHRlbXBvcmFyeSBndWVzdCB1c2VyIElEXG4gICAgICBjb25zdCBndWVzdFVzZXJJZCA9IGBndWVzdF8ke3V1aWR2NCgpfWA7XG5cbiAgICAgIHJldHVybiBjcmVhdGVTdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgdXNlcklkOiBndWVzdFVzZXJJZCxcbiAgICAgICAgICBlbWFpbDogbnVsbCxcbiAgICAgICAgICBpc0d1ZXN0OiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgICBtZXNzYWdlOiAnR3Vlc3Qgc2Vzc2lvbiBjcmVhdGVkJyxcbiAgICAgIH0pO1xuXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0d1ZXN0IG1vZGUgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNTAwLCAnRmFpbGVkIHRvIGNyZWF0ZSBndWVzdCBzZXNzaW9uJyk7XG4gICAgfVxuICB9XG5cbiAgc3RhdGljIGFzeW5jIGhhbmRsZUdldFVzZXJQcm9maWxlKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCwgY29udGV4dDogTGFtYmRhQ29udGV4dCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHVzZXJJZCA9IGV2ZW50LnBhdGhQYXJhbWV0ZXJzPy51c2VySWQ7XG4gICAgICBpZiAoIXVzZXJJZCkge1xuICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdVc2VyIElEIGlzIHJlcXVpcmVkJyk7XG4gICAgICB9XG5cbiAgICAgIC8vIEdldCB1c2VyIGZyb20gRHluYW1vREJcbiAgICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBEeW5hbW9EQlNlcnZpY2UuZ2V0SXRlbShUQUJMRVMuVVNFUlMsIHsgdXNlcklkIH0pO1xuXG4gICAgICBpZiAoIXVzZXIpIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDA0LCAnVXNlciBub3QgZm91bmQnKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgIHVzZXI6IHtcbiAgICAgICAgICB1c2VySWQ6IHVzZXIudXNlcklkLFxuICAgICAgICAgIGVtYWlsOiB1c2VyLmVtYWlsLFxuICAgICAgICAgIHByZWZlcmVuY2VzOiB1c2VyLnByZWZlcmVuY2VzLFxuICAgICAgICAgIGNyZWF0ZWRBdDogdXNlci5jcmVhdGVkQXQsXG4gICAgICAgICAgbGFzdExvZ2luQXQ6IHVzZXIubGFzdExvZ2luQXQsXG4gICAgICAgICAgaXNHdWVzdDogdXNlci5pc0d1ZXN0IHx8IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignR2V0IHVzZXIgcHJvZmlsZSBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg1MDAsICdGYWlsZWQgdG8gZ2V0IHVzZXIgcHJvZmlsZScpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIGlzVmFsaWRFbWFpbChlbWFpbDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3QgZW1haWxSZWdleCA9IC9eW15cXHNAXStAW15cXHNAXStcXC5bXlxcc0BdKyQvO1xuICAgIHJldHVybiBlbWFpbFJlZ2V4LnRlc3QoZW1haWwpO1xuICB9XG59XG5cbi8vIExhbWJkYSBoYW5kbGVyIGZ1bmN0aW9uc1xuZXhwb3J0IGNvbnN0IHNpZ25VcCA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQsIGNvbnRleHQ6IExhbWJkYUNvbnRleHQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xuICByZXR1cm4gQXV0aEhhbmRsZXIuaGFuZGxlU2lnblVwKGV2ZW50LCBjb250ZXh0KTtcbn07XG5cbmV4cG9ydCBjb25zdCBzaWduSW4gPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBjb250ZXh0OiBMYW1iZGFDb250ZXh0KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcbiAgcmV0dXJuIEF1dGhIYW5kbGVyLmhhbmRsZVNpZ25JbihldmVudCwgY29udGV4dCk7XG59O1xuXG5leHBvcnQgY29uc3QgZm9yZ290UGFzc3dvcmQgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBjb250ZXh0OiBMYW1iZGFDb250ZXh0KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcbiAgcmV0dXJuIEF1dGhIYW5kbGVyLmhhbmRsZUZvcmdvdFBhc3N3b3JkKGV2ZW50LCBjb250ZXh0KTtcbn07XG5cbmV4cG9ydCBjb25zdCBndWVzdE1vZGUgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBjb250ZXh0OiBMYW1iZGFDb250ZXh0KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcbiAgcmV0dXJuIEF1dGhIYW5kbGVyLmhhbmRsZUd1ZXN0TW9kZShldmVudCwgY29udGV4dCk7XG59O1xuXG5leHBvcnQgY29uc3QgZ2V0VXNlclByb2ZpbGUgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBjb250ZXh0OiBMYW1iZGFDb250ZXh0KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcbiAgcmV0dXJuIEF1dGhIYW5kbGVyLmhhbmRsZUdldFVzZXJQcm9maWxlKGV2ZW50LCBjb250ZXh0KTtcbn07Il19