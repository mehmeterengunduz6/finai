import { ProcessedDocumentStorage, ProcessedDocument } from './processed-docs';
import { SimpleStorageService, SimpleEmbedding } from './simple-storage';

export interface SimpleRetrievalQuery {
    question: string;
    company?: string;
    maxResults?: number;
}

export interface SimpleRetrievalResult {
    relevantDocuments: ProcessedDocument[];
    relevantChunks: SimpleEmbedding[];
    query: SimpleRetrievalQuery;
    totalResults: number;
    processingTimeMs: number;
}

export class SimpleRetrieval {
    
    /**
     * Simple retrieval using processed documents and basic keyword matching
     */
    static async retrieveRelevantContent(query: SimpleRetrievalQuery): Promise<SimpleRetrievalResult> {
        const startTime = Date.now();
        console.log('Starting simple retrieval for query:', query.question);

        try {
            // Step 1: Get processed documents
            const processedDocs = query.company 
                ? await ProcessedDocumentStorage.getProcessedDocumentsByCompany(query.company)
                : await ProcessedDocumentStorage.getAllProcessedDocuments();

            console.log(`Found ${processedDocs.length} processed documents`);

            // Step 2: Simple keyword-based search for chunks
            const relevantChunks = await SimpleStorageService.searchContent(
                query.question, 
                query.company
            );

            console.log(`Found ${relevantChunks.length} relevant chunks`);

            // Step 3: Filter documents that have relevant chunks or match query
            const queryKeywords = query.question.toLowerCase().split(/\s+/);
            const relevantDocuments = processedDocs.filter(doc => {
                // Check if document summary or insights contain query keywords
                const searchText = `${doc.summary} ${doc.keyInsights.join(' ')}`.toLowerCase();
                return queryKeywords.some(keyword => searchText.includes(keyword)) ||
                       relevantChunks.some(chunk => chunk.filename === doc.originalFilename);
            });

            const result: SimpleRetrievalResult = {
                relevantDocuments: relevantDocuments.slice(0, query.maxResults || 10),
                relevantChunks: relevantChunks.slice(0, query.maxResults || 10),
                query,
                totalResults: relevantDocuments.length + relevantChunks.length,
                processingTimeMs: Date.now() - startTime
            };

            console.log(`Simple retrieval completed in ${result.processingTimeMs}ms`);
            return result;

        } catch (error) {
            console.error('Simple retrieval failed:', error);
            throw new Error('Failed to retrieve relevant content: ' + (error as Error).message);
        }
    }

    /**
     * Get summary of available content for a company
     */
    static async getCompanyContentSummary(company: string): Promise<{
        totalDocuments: number;
        documentTypes: string[];
        yearRange: { min: number; max: number } | null;
        quarters: string[];
        lastProcessed: Date | null;
        totalEmbeddings: number;
    }> {
        try {
            const documents = await ProcessedDocumentStorage.getProcessedDocumentsByCompany(company);
            
            if (documents.length === 0) {
                return {
                    totalDocuments: 0,
                    documentTypes: [],
                    yearRange: null,
                    quarters: [],
                    lastProcessed: null,
                    totalEmbeddings: 0
                };
            }

            const documentTypes = [...new Set(documents.map(doc => doc.documentType).filter(Boolean))];
            const quarters = [...new Set(documents.map(doc => doc.quarter).filter(Boolean))];
            const years = documents.map(doc => doc.year).filter(Boolean);
            const yearRange = years.length > 0 ? { min: Math.min(...years), max: Math.max(...years) } : null;
            const lastProcessed = documents[0].processingDate; // Already sorted by date
            const totalEmbeddings = SimpleStorageService.getEmbeddingCount();

            return {
                totalDocuments: documents.length,
                documentTypes,
                yearRange,
                quarters,
                lastProcessed,
                totalEmbeddings
            };

        } catch (error) {
            console.error('Failed to get company content summary:', error);
            throw new Error('Failed to get company content summary');
        }
    }
}