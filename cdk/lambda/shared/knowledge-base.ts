import { S3Client, GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';

// Initialize S3 client
const s3Client = new S3Client({ 
  region: process.env.AWS_REGION || 'us-east-1' 
});

const KNOWLEDGE_BASE_BUCKET = process.env.KNOWLEDGE_BASE_BUCKET || '';

export interface KnowledgeDocument {
  key: string;
  title: string;
  content: string;
  section: string;
  sourceUrl: string;
  lastModified: Date;
  commonErrors?: string[];
  keywords?: string[];
}

export interface SearchResult {
  documents: KnowledgeDocument[];
  relevanceScore: number;
  sources: string[];
}

export class KnowledgeBaseService {
  /**
   * Fetch and process official FAFSA documentation from StudentAid.gov
   * This would be called periodically to update the knowledge base
   */
  static async updateKnowledgeBaseFromOfficialSources(): Promise<void> {
    try {
      // Official FAFSA documentation URLs
      const officialSources = [
        {
          url: 'https://studentaid.gov/apply-for-aid/fafsa/filling-out',
          section: 'general',
          title: 'How to Fill Out the FAFSA Form'
        },
        {
          url: 'https://studentaid.gov/apply-for-aid/fafsa/filling-out/personal-info',
          section: 'student-demographics',
          title: 'Personal Information Section'
        },
        {
          url: 'https://studentaid.gov/apply-for-aid/fafsa/filling-out/dependency',
          section: 'dependency-status',
          title: 'Dependency Status Questions'
        },
        {
          url: 'https://studentaid.gov/apply-for-aid/fafsa/filling-out/income',
          section: 'student-finances',
          title: 'Income and Tax Information'
        },
        {
          url: 'https://studentaid.gov/apply-for-aid/fafsa/filling-out/school-selection',
          section: 'school-selection',
          title: 'School Selection'
        }
      ];

      for (const source of officialSources) {
        await this.fetchAndStoreOfficialDocument(source);
      }

      console.log('Knowledge base updated from official sources');
    } catch (error) {
      console.error('Failed to update knowledge base:', error);
      throw new Error('Failed to update knowledge base from official sources');
    }
  }

  /**
   * Fetch content from official source and store in S3
   */
  private static async fetchAndStoreOfficialDocument(source: {
    url: string;
    section: string;
    title: string;
  }): Promise<void> {
    try {
      // In production, this would use a web scraping service or API
      // For now, we'll create a placeholder that can be replaced with actual implementation
      const document: Omit<KnowledgeDocument, 'key' | 'lastModified'> = {
        title: source.title,
        content: `Official content from ${source.url} would be fetched and processed here. This would include the actual text content from the StudentAid.gov page, properly formatted and cleaned.`,
        section: source.section,
        sourceUrl: source.url,
        commonErrors: [], // Would be extracted from the content
        keywords: [], // Would be generated from the content
      };

      await this.uploadDocument(document);
    } catch (error) {
      console.error(`Failed to fetch document from ${source.url}:`, error);
    }
  }

  /**
   * Search for relevant FAFSA documents based on query
   */
  static async searchDocuments(query: string, section?: string): Promise<SearchResult> {
    try {
      // List all documents in the knowledge base
      const documents = await this.listAllDocuments(section);
      
      // If no documents found, return fallback response
      if (documents.length === 0) {
        return {
          documents: [],
          relevanceScore: 0,
          sources: ['https://studentaid.gov/apply-for-aid/fafsa'],
        };
      }

      // Simple keyword-based search (in production, use vector search)
      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
      const scoredDocuments = documents.map(doc => ({
        document: doc,
        score: this.calculateRelevanceScore(doc, searchTerms),
      }));

      // Sort by relevance score and take top results
      const relevantDocuments = scoredDocuments
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(item => item.document);

      const averageScore = relevantDocuments.length > 0 
        ? scoredDocuments.slice(0, relevantDocuments.length).reduce((sum, item) => sum + item.score, 0) / relevantDocuments.length
        : 0;

      const sources = relevantDocuments.length > 0
        ? relevantDocuments.map(doc => doc.sourceUrl).filter((url, index, arr) => arr.indexOf(url) === index)
        : ['https://studentaid.gov/apply-for-aid/fafsa'];

      return {
        documents: relevantDocuments,
        relevanceScore: averageScore,
        sources,
      };
    } catch (error) {
      console.error('Knowledge base search error:', error);
      // Return fallback with official source
      return {
        documents: [],
        relevanceScore: 0,
        sources: ['https://studentaid.gov/apply-for-aid/fafsa'],
      };
    }
  }

  /**
   * Get a specific document by key
   */
  static async getDocument(key: string): Promise<KnowledgeDocument | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: KNOWLEDGE_BASE_BUCKET,
        Key: key,
      });

      const response = await s3Client.send(command);
      
      if (!response.Body) {
        return null;
      }

      const content = await response.Body.transformToString();
      const document = JSON.parse(content) as KnowledgeDocument;
      
      return {
        ...document,
        key,
        lastModified: response.LastModified || new Date(),
      };
    } catch (error) {
      console.error('Failed to get document:', error);
      return null;
    }
  }

  /**
   * List all documents in the knowledge base
   */
  private static async listAllDocuments(section?: string): Promise<KnowledgeDocument[]> {
    try {
      const prefix = section ? `${section}/` : '';
      const command = new ListObjectsV2Command({
        Bucket: KNOWLEDGE_BASE_BUCKET,
        Prefix: prefix,
        MaxKeys: 100,
      });

      const response = await s3Client.send(command);
      const documents: KnowledgeDocument[] = [];

      if (response.Contents) {
        for (const object of response.Contents) {
          if (object.Key && object.Key.endsWith('.json')) {
            const document = await this.getDocument(object.Key);
            if (document) {
              documents.push(document);
            }
          }
        }
      }

      return documents;
    } catch (error) {
      console.error('Failed to list documents:', error);
      return [];
    }
  }

  /**
   * Calculate relevance score for a document based on search terms
   */
  private static calculateRelevanceScore(document: KnowledgeDocument, searchTerms: string[]): number {
    let score = 0;
    const content = `${document.title} ${document.content} ${document.keywords?.join(' ') || ''}`.toLowerCase();

    for (const term of searchTerms) {
      // Title matches get higher score
      if (document.title.toLowerCase().includes(term)) {
        score += 3;
      }
      
      // Content matches
      const contentMatches = (content.match(new RegExp(term, 'g')) || []).length;
      score += contentMatches;
      
      // Keyword matches get higher score
      if (document.keywords?.some(keyword => keyword.toLowerCase().includes(term))) {
        score += 2;
      }
    }

    return score;
  }

  /**
   * Upload a document to the knowledge base
   */
  static async uploadDocument(document: Omit<KnowledgeDocument, 'key' | 'lastModified'>): Promise<string> {
    try {
      const key = `${document.section}/${document.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.json`;
      
      const command = new PutObjectCommand({
        Bucket: KNOWLEDGE_BASE_BUCKET,
        Key: key,
        Body: JSON.stringify(document, null, 2),
        ContentType: 'application/json',
      });

      await s3Client.send(command);
      return key;
    } catch (error) {
      console.error('Failed to upload document:', error);
      throw new Error('Failed to upload document to knowledge base');
    }
  }

  /**
   * Get source attribution for AI responses
   */
  static formatSourceAttribution(sources: string[]): string {
    if (sources.length === 0) {
      return '\n\n**Source:** https://studentaid.gov/apply-for-aid/fafsa';
    }

    const uniqueSources = [...new Set(sources)];
    
    if (uniqueSources.length === 1) {
      return `\n\n**Source:** ${uniqueSources[0]}`;
    }

    return `\n\n**Sources:**\n${uniqueSources.map((source, index) => `${index + 1}. ${source}`).join('\n')}`;
  }
}