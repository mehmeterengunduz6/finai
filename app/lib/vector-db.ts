import { OpenAI } from 'openai';

// Initialize ChromaDB client
let chromaClient: any = null;
let openai: OpenAI | null = null;

async function getChromaClient(): Promise<any> {
    if (!chromaClient) {
        const { ChromaClient } = await import('chromadb');
        chromaClient = new ChromaClient({
            path: process.env.CHROMA_URL || "http://localhost:8000"
        });
    }
    return chromaClient;
}

function getOpenAIClient(): OpenAI {
    if (!openai) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY environment variable is required for embeddings');
        }
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return openai;
}

// Collection name for document embeddings
const COLLECTION_NAME = 'financial_documents';

export interface DocumentEmbedding {
    id: string;
    company: string;
    filename: string;
    documentType?: string;
    quarter?: string;
    year?: number;
    section: string; // Which part of the document this chunk represents
    content: string;
    metadata: Record<string, any>;
}

export interface ProcessedDocument {
    id: string;
    company: string;
    filename: string;
    summary: string;
    keyMetrics: Record<string, any>;
    financialData: Record<string, any>;
    processingDate: Date;
    metadata: Record<string, any>;
}

export class VectorDBService {
    private collection: any = null;

    async initialize() {
        try {
            const client = await getChromaClient();
            
            // Get or create collection for financial documents
            try {
                this.collection = await client.getCollection({
                    name: COLLECTION_NAME
                });
                console.log('Connected to existing ChromaDB collection:', COLLECTION_NAME);
            } catch (error) {
                // Collection doesn't exist, create it
                this.collection = await client.createCollection({
                    name: COLLECTION_NAME,
                    metadata: {
                        description: "Financial document embeddings for semantic search",
                        created_at: new Date().toISOString()
                    }
                });
                console.log('Created new ChromaDB collection:', COLLECTION_NAME);
            }
        } catch (error) {
            console.error('Failed to initialize vector database:', error);
            throw new Error('Vector database initialization failed');
        }
    }

    async generateEmbedding(text: string): Promise<number[]> {
        try {
            const openaiClient = getOpenAIClient();
            const response = await openaiClient.embeddings.create({
                model: "text-embedding-3-small",
                input: text,
                encoding_format: "float",
            });
            
            return response.data[0].embedding;
        } catch (error) {
            console.error('Embedding generation failed:', error);
            throw new Error('Failed to generate embedding');
        }
    }

    async addDocumentEmbeddings(embeddings: DocumentEmbedding[]): Promise<void> {
        if (!this.collection) {
            await this.initialize();
        }

        try {
            const ids = embeddings.map(doc => doc.id);
            const contents = embeddings.map(doc => doc.content);
            const metadatas = embeddings.map(doc => ({
                company: doc.company,
                filename: doc.filename,
                documentType: doc.documentType || '',
                quarter: doc.quarter || '',
                year: doc.year?.toString() || '',
                section: doc.section,
                ...doc.metadata
            }));

            // Generate embeddings for all content
            const embeddingVectors = await Promise.all(
                contents.map(content => this.generateEmbedding(content))
            );

            await this.collection.add({
                ids,
                embeddings: embeddingVectors,
                documents: contents,
                metadatas
            });

            console.log(`Added ${embeddings.length} document embeddings to vector database`);
        } catch (error) {
            console.error('Failed to add document embeddings:', error);
            throw new Error('Failed to store document embeddings');
        }
    }

    async searchSimilarDocuments(
        query: string, 
        company?: string, 
        limit: number = 10
    ): Promise<{
        documents: string[];
        metadatas: any[];
        distances: number[];
        ids: string[];
    }> {
        if (!this.collection) {
            await this.initialize();
        }

        try {
            // Generate embedding for the query
            const queryEmbedding = await this.generateEmbedding(query);

            // Build where clause for filtering
            const whereClause: any = {};
            if (company) {
                whereClause.company = company;
            }

            const results = await this.collection.query({
                queryEmbeddings: [queryEmbedding],
                nResults: limit,
                where: Object.keys(whereClause).length > 0 ? whereClause : undefined
            });

            return {
                documents: results.documents[0] || [],
                metadatas: results.metadatas[0] || [],
                distances: results.distances[0] || [],
                ids: results.ids[0] || []
            };
        } catch (error) {
            console.error('Vector search failed:', error);
            throw new Error('Failed to search similar documents');
        }
    }

    async deleteDocumentEmbeddings(filename: string, company: string): Promise<void> {
        if (!this.collection) {
            await this.initialize();
        }

        try {
            await this.collection.delete({
                where: {
                    filename,
                    company
                }
            });
            console.log(`Deleted embeddings for ${company}/${filename}`);
        } catch (error) {
            console.error('Failed to delete document embeddings:', error);
            throw new Error('Failed to delete document embeddings');
        }
    }

    async getDocumentCount(company?: string): Promise<number> {
        if (!this.collection) {
            await this.initialize();
        }

        try {
            const whereClause = company ? { company } : undefined;
            const result = await this.collection.count({
                where: whereClause
            });
            return result;
        } catch (error) {
            console.error('Failed to get document count:', error);
            return 0;
        }
    }
}

// Singleton instance
export const vectorDB = new VectorDBService();