import { APIGatewayProxyEvent, APIGatewayProxyResult, LambdaContext } from '../shared/types';
export declare class AuthHandler {
    static handleSignUp(event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult>;
    static handleSignIn(event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult>;
    static handleForgotPassword(event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult>;
    static handleGuestMode(event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult>;
    static handleGetUserProfile(event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult>;
    private static isValidEmail;
}
export declare const signUp: (event: APIGatewayProxyEvent, context: LambdaContext) => Promise<APIGatewayProxyResult>;
export declare const signIn: (event: APIGatewayProxyEvent, context: LambdaContext) => Promise<APIGatewayProxyResult>;
export declare const forgotPassword: (event: APIGatewayProxyEvent, context: LambdaContext) => Promise<APIGatewayProxyResult>;
export declare const guestMode: (event: APIGatewayProxyEvent, context: LambdaContext) => Promise<APIGatewayProxyResult>;
export declare const getUserProfile: (event: APIGatewayProxyEvent, context: LambdaContext) => Promise<APIGatewayProxyResult>;
