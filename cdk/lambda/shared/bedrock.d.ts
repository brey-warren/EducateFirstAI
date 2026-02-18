export interface BedrockResponse {
    content: string;
    usage?: {
        inputTokens: number;
        outputTokens: number;
    };
}
export declare class BedrockService {
    private static readonly MODEL_ID;
    private static readonly MAX_TOKENS;
    static generateResponse(prompt: string, systemPrompt?: string): Promise<BedrockResponse>;
    private static getDefaultSystemPrompt;
    static generateFAFSAResponse(question: string, context?: string): Promise<BedrockResponse>;
}
