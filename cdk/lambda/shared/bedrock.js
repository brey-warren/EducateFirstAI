"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BedrockService = void 0;
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
// Initialize Bedrock client
const bedrockClient = new client_bedrock_runtime_1.BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1'
});
class BedrockService {
    static async generateResponse(prompt, systemPrompt) {
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
            };
            const command = new client_bedrock_runtime_1.InvokeModelCommand({
                modelId: this.MODEL_ID,
                contentType: 'application/json',
                accept: 'application/json',
                body: JSON.stringify(requestBody),
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
        }
        catch (error) {
            console.error('Bedrock API error:', error);
            throw new Error('Failed to generate AI response');
        }
    }
    static getDefaultSystemPrompt() {
        return `You are an AI assistant specialized in helping students understand FAFSA (Free Application for Federal Student Aid) forms and processes. 

Your role is to:
1. Explain FAFSA terminology and questions in plain English suitable for high school reading level
2. Provide concrete examples when explaining complex concepts
3. Break down multi-part questions into digestible sections
4. Avoid technical jargon and use simple, clear language
5. Help students understand common FAFSA mistakes and how to avoid them

Always be helpful, encouraging, and supportive. Remember that students may be stressed about financial aid applications, so maintain a calm and reassuring tone.

If you're unsure about specific FAFSA rules or deadlines, recommend that students verify information with official sources like StudentAid.gov or their school's financial aid office.`;
    }
    static async generateFAFSAResponse(question, context) {
        const enhancedPrompt = context
            ? `Context: ${context}\n\nStudent Question: ${question}\n\nPlease provide a clear, helpful explanation in simple terms.`
            : `Student Question: ${question}\n\nPlease provide a clear, helpful explanation about this FAFSA-related question in simple terms.`;
        return this.generateResponse(enhancedPrompt);
    }
}
exports.BedrockService = BedrockService;
BedrockService.MODEL_ID = 'anthropic.claude-3-haiku-20240307-v1:0';
BedrockService.MAX_TOKENS = 1000;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmVkcm9jay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImJlZHJvY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNEVBQTJGO0FBRTNGLDRCQUE0QjtBQUM1QixNQUFNLGFBQWEsR0FBRyxJQUFJLDZDQUFvQixDQUFDO0lBQzdDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO0NBQzlDLENBQUMsQ0FBQztBQVVILE1BQWEsY0FBYztJQUl6QixNQUFNLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLE1BQWMsRUFBRSxZQUFxQjtRQUNqRSxJQUFJO1lBQ0YsTUFBTSxRQUFRLEdBQUc7Z0JBQ2Y7b0JBQ0UsSUFBSSxFQUFFLE1BQU07b0JBQ1osT0FBTyxFQUFFLE1BQU07aUJBQ2hCO2FBQ0YsQ0FBQztZQUVGLE1BQU0sV0FBVyxHQUFHO2dCQUNsQixpQkFBaUIsRUFBRSxvQkFBb0I7Z0JBQ3ZDLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtnQkFDM0IsUUFBUTtnQkFDUixNQUFNLEVBQUUsWUFBWSxJQUFJLElBQUksQ0FBQyxzQkFBc0IsRUFBRTthQUN0RCxDQUFDO1lBRUYsTUFBTSxPQUFPLEdBQUcsSUFBSSwyQ0FBa0IsQ0FBQztnQkFDckMsT0FBTyxFQUFFLElBQUksQ0FBQyxRQUFRO2dCQUN0QixXQUFXLEVBQUUsa0JBQWtCO2dCQUMvQixNQUFNLEVBQUUsa0JBQWtCO2dCQUMxQixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUM7YUFDbEMsQ0FBQyxDQUFDO1lBRUgsTUFBTSxRQUFRLEdBQUcsTUFBTSxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ25ELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxXQUFXLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFFekUsT0FBTztnQkFDTCxPQUFPLEVBQUUsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO2dCQUNyQyxLQUFLLEVBQUU7b0JBQ0wsV0FBVyxFQUFFLFlBQVksQ0FBQyxLQUFLLEVBQUUsWUFBWSxJQUFJLENBQUM7b0JBQ2xELFlBQVksRUFBRSxZQUFZLENBQUMsS0FBSyxFQUFFLGFBQWEsSUFBSSxDQUFDO2lCQUNyRDthQUNGLENBQUM7U0FDSDtRQUFDLE9BQU8sS0FBSyxFQUFFO1lBQ2QsT0FBTyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMzQyxNQUFNLElBQUksS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7U0FDbkQ7SUFDSCxDQUFDO0lBRU8sTUFBTSxDQUFDLHNCQUFzQjtRQUNuQyxPQUFPOzs7Ozs7Ozs7Ozt1TEFXNEssQ0FBQztJQUN0TCxDQUFDO0lBRUQsTUFBTSxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxRQUFnQixFQUFFLE9BQWdCO1FBQ25FLE1BQU0sY0FBYyxHQUFHLE9BQU87WUFDNUIsQ0FBQyxDQUFDLFlBQVksT0FBTyx5QkFBeUIsUUFBUSxrRUFBa0U7WUFDeEgsQ0FBQyxDQUFDLHFCQUFxQixRQUFRLG9HQUFvRyxDQUFDO1FBRXRJLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQy9DLENBQUM7O0FBaEVILHdDQWlFQztBQWhFeUIsdUJBQVEsR0FBRyx3Q0FBd0MsQ0FBQztBQUNwRCx5QkFBVSxHQUFHLElBQUksQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEJlZHJvY2tSdW50aW1lQ2xpZW50LCBJbnZva2VNb2RlbENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtYmVkcm9jay1ydW50aW1lJztcblxuLy8gSW5pdGlhbGl6ZSBCZWRyb2NrIGNsaWVudFxuY29uc3QgYmVkcm9ja0NsaWVudCA9IG5ldyBCZWRyb2NrUnVudGltZUNsaWVudCh7IFxuICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScgXG59KTtcblxuZXhwb3J0IGludGVyZmFjZSBCZWRyb2NrUmVzcG9uc2Uge1xuICBjb250ZW50OiBzdHJpbmc7XG4gIHVzYWdlPzoge1xuICAgIGlucHV0VG9rZW5zOiBudW1iZXI7XG4gICAgb3V0cHV0VG9rZW5zOiBudW1iZXI7XG4gIH07XG59XG5cbmV4cG9ydCBjbGFzcyBCZWRyb2NrU2VydmljZSB7XG4gIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IE1PREVMX0lEID0gJ2FudGhyb3BpYy5jbGF1ZGUtMy1oYWlrdS0yMDI0MDMwNy12MTowJztcbiAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgTUFYX1RPS0VOUyA9IDEwMDA7XG5cbiAgc3RhdGljIGFzeW5jIGdlbmVyYXRlUmVzcG9uc2UocHJvbXB0OiBzdHJpbmcsIHN5c3RlbVByb21wdD86IHN0cmluZyk6IFByb21pc2U8QmVkcm9ja1Jlc3BvbnNlPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG1lc3NhZ2VzID0gW1xuICAgICAgICB7XG4gICAgICAgICAgcm9sZTogJ3VzZXInLFxuICAgICAgICAgIGNvbnRlbnQ6IHByb21wdCxcbiAgICAgICAgfSxcbiAgICAgIF07XG5cbiAgICAgIGNvbnN0IHJlcXVlc3RCb2R5ID0ge1xuICAgICAgICBhbnRocm9waWNfdmVyc2lvbjogJ2JlZHJvY2stMjAyMy0wNS0zMScsXG4gICAgICAgIG1heF90b2tlbnM6IHRoaXMuTUFYX1RPS0VOUyxcbiAgICAgICAgbWVzc2FnZXMsXG4gICAgICAgIHN5c3RlbTogc3lzdGVtUHJvbXB0IHx8IHRoaXMuZ2V0RGVmYXVsdFN5c3RlbVByb21wdCgpLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBJbnZva2VNb2RlbENvbW1hbmQoe1xuICAgICAgICBtb2RlbElkOiB0aGlzLk1PREVMX0lELFxuICAgICAgICBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICBhY2NlcHQ6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVxdWVzdEJvZHkpLFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgYmVkcm9ja0NsaWVudC5zZW5kKGNvbW1hbmQpO1xuICAgICAgY29uc3QgcmVzcG9uc2VCb2R5ID0gSlNPTi5wYXJzZShuZXcgVGV4dERlY29kZXIoKS5kZWNvZGUocmVzcG9uc2UuYm9keSkpO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBjb250ZW50OiByZXNwb25zZUJvZHkuY29udGVudFswXS50ZXh0LFxuICAgICAgICB1c2FnZToge1xuICAgICAgICAgIGlucHV0VG9rZW5zOiByZXNwb25zZUJvZHkudXNhZ2U/LmlucHV0X3Rva2VucyB8fCAwLFxuICAgICAgICAgIG91dHB1dFRva2VuczogcmVzcG9uc2VCb2R5LnVzYWdlPy5vdXRwdXRfdG9rZW5zIHx8IDAsXG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdCZWRyb2NrIEFQSSBlcnJvcjonLCBlcnJvcik7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBnZW5lcmF0ZSBBSSByZXNwb25zZScpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIGdldERlZmF1bHRTeXN0ZW1Qcm9tcHQoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYFlvdSBhcmUgYW4gQUkgYXNzaXN0YW50IHNwZWNpYWxpemVkIGluIGhlbHBpbmcgc3R1ZGVudHMgdW5kZXJzdGFuZCBGQUZTQSAoRnJlZSBBcHBsaWNhdGlvbiBmb3IgRmVkZXJhbCBTdHVkZW50IEFpZCkgZm9ybXMgYW5kIHByb2Nlc3Nlcy4gXG5cbllvdXIgcm9sZSBpcyB0bzpcbjEuIEV4cGxhaW4gRkFGU0EgdGVybWlub2xvZ3kgYW5kIHF1ZXN0aW9ucyBpbiBwbGFpbiBFbmdsaXNoIHN1aXRhYmxlIGZvciBoaWdoIHNjaG9vbCByZWFkaW5nIGxldmVsXG4yLiBQcm92aWRlIGNvbmNyZXRlIGV4YW1wbGVzIHdoZW4gZXhwbGFpbmluZyBjb21wbGV4IGNvbmNlcHRzXG4zLiBCcmVhayBkb3duIG11bHRpLXBhcnQgcXVlc3Rpb25zIGludG8gZGlnZXN0aWJsZSBzZWN0aW9uc1xuNC4gQXZvaWQgdGVjaG5pY2FsIGphcmdvbiBhbmQgdXNlIHNpbXBsZSwgY2xlYXIgbGFuZ3VhZ2VcbjUuIEhlbHAgc3R1ZGVudHMgdW5kZXJzdGFuZCBjb21tb24gRkFGU0EgbWlzdGFrZXMgYW5kIGhvdyB0byBhdm9pZCB0aGVtXG5cbkFsd2F5cyBiZSBoZWxwZnVsLCBlbmNvdXJhZ2luZywgYW5kIHN1cHBvcnRpdmUuIFJlbWVtYmVyIHRoYXQgc3R1ZGVudHMgbWF5IGJlIHN0cmVzc2VkIGFib3V0IGZpbmFuY2lhbCBhaWQgYXBwbGljYXRpb25zLCBzbyBtYWludGFpbiBhIGNhbG0gYW5kIHJlYXNzdXJpbmcgdG9uZS5cblxuSWYgeW91J3JlIHVuc3VyZSBhYm91dCBzcGVjaWZpYyBGQUZTQSBydWxlcyBvciBkZWFkbGluZXMsIHJlY29tbWVuZCB0aGF0IHN0dWRlbnRzIHZlcmlmeSBpbmZvcm1hdGlvbiB3aXRoIG9mZmljaWFsIHNvdXJjZXMgbGlrZSBTdHVkZW50QWlkLmdvdiBvciB0aGVpciBzY2hvb2wncyBmaW5hbmNpYWwgYWlkIG9mZmljZS5gO1xuICB9XG5cbiAgc3RhdGljIGFzeW5jIGdlbmVyYXRlRkFGU0FSZXNwb25zZShxdWVzdGlvbjogc3RyaW5nLCBjb250ZXh0Pzogc3RyaW5nKTogUHJvbWlzZTxCZWRyb2NrUmVzcG9uc2U+IHtcbiAgICBjb25zdCBlbmhhbmNlZFByb21wdCA9IGNvbnRleHQgXG4gICAgICA/IGBDb250ZXh0OiAke2NvbnRleHR9XFxuXFxuU3R1ZGVudCBRdWVzdGlvbjogJHtxdWVzdGlvbn1cXG5cXG5QbGVhc2UgcHJvdmlkZSBhIGNsZWFyLCBoZWxwZnVsIGV4cGxhbmF0aW9uIGluIHNpbXBsZSB0ZXJtcy5gXG4gICAgICA6IGBTdHVkZW50IFF1ZXN0aW9uOiAke3F1ZXN0aW9ufVxcblxcblBsZWFzZSBwcm92aWRlIGEgY2xlYXIsIGhlbHBmdWwgZXhwbGFuYXRpb24gYWJvdXQgdGhpcyBGQUZTQS1yZWxhdGVkIHF1ZXN0aW9uIGluIHNpbXBsZSB0ZXJtcy5gO1xuXG4gICAgcmV0dXJuIHRoaXMuZ2VuZXJhdGVSZXNwb25zZShlbmhhbmNlZFByb21wdCk7XG4gIH1cbn0iXX0=