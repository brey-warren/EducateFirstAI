// Environment configuration for EducateFirstAI
export const config = {
  // AWS Cognito Configuration
  cognito: {
    userPoolId: import.meta.env.VITE_USER_POOL_ID || '',
    userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || '',
    region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  },
  
  // API Configuration
  api: {
    baseUrl: import.meta.env.VITE_API_GATEWAY_URL || '',
    timeout: 30000, // 30 seconds
  },
  
  // AWS Services Configuration
  aws: {
    region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
    knowledgeBaseBucket: import.meta.env.VITE_KNOWLEDGE_BASE_BUCKET || '',
  },
  
  // Application Configuration
  app: {
    name: 'EducateFirstAI',
    version: '1.0.0',
    maxMessageLength: 5000,
    conversationExpiryHours: 24,
  },
  
  // Development flags
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};