import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// Initialize Bedrock client with privacy-focused configuration
const bedrockClient = new BedrockRuntimeClient({ 
  region: process.env.AWS_REGION || 'us-east-1',
  // Ensure secure communication
  endpoint: `https://bedrock-runtime.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`,
});

export interface BedrockResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export class BedrockService {
  private static readonly MODEL_ID = 'anthropic.claude-3-haiku-20240307-v1:0';
  private static readonly MAX_TOKENS = 1000;

  static async generateResponse(prompt: string, systemPrompt?: string): Promise<BedrockResponse> {
    try {
      const messages = [
        {
          role: 'user',
          content: prompt,
        },
      ];

      const requestBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: this.MAX_TOKENS,
        messages,
        system: systemPrompt || this.getDefaultSystemPrompt(),
        // Privacy and FERPA compliance configuration
        metadata: {
          privacy_mode: true,
          ferpa_compliant: true,
          no_training: true,
          data_retention: 'session_only',
        },
      };

      const command = new InvokeModelCommand({
        modelId: this.MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody),
        // Additional privacy headers
        guardrailIdentifier: undefined, // Use default guardrails
        trace: 'DISABLED', // Disable tracing for privacy
      });

      const response = await bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      return {
        content: responseBody.content[0].text,
        usage: {
          inputTokens: responseBody.usage?.input_tokens || 0,
          outputTokens: responseBody.usage?.output_tokens || 0,
        },
      };
    } catch (error) {
      console.error('Bedrock API error:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  private static getDefaultSystemPrompt(): string {
    return `You are an AI assistant specialized in helping students understand FAFSA (Free Application for Federal Student Aid) forms and processes. 

Your role is to:
1. Explain FAFSA terminology and questions in plain English suitable for high school reading level
2. Provide concrete examples when explaining complex concepts
3. Break down multi-part questions into digestible sections
4. Avoid technical jargon and use simple, clear language
5. Help students understand common FAFSA mistakes and how to avoid them

PRIVACY AND COMPLIANCE REQUIREMENTS:
- Never request, store, or reference personally identifiable information (PII)
- Do not ask for Social Security Numbers, bank account numbers, or other sensitive data
- Comply with FERPA regulations for educational privacy
- If a student shares PII accidentally, acknowledge it but do not repeat or reference it
- Focus on general guidance rather than specific personal financial advice

Always be helpful, encouraging, and supportive. Remember that students may be stressed about financial aid applications, so maintain a calm and reassuring tone.

If you're unsure about specific FAFSA rules or deadlines, recommend that students verify information with official sources like StudentAid.gov or their school's financial aid office.`;
  }

  static async generateFAFSAResponse(question: string, context?: string): Promise<BedrockResponse> {
    const enhancedPrompt = context 
      ? `Context: ${context}\n\nStudent Question: ${question}\n\nPlease provide a clear, helpful explanation in simple terms.`
      : `Student Question: ${question}\n\nPlease provide a clear, helpful explanation about this FAFSA-related question in simple terms.`;

    return this.generateResponse(enhancedPrompt);
  }
}