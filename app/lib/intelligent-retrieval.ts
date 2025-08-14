import { vectorDB } from './vector-db';
import { ProcessedDocumentStorage, ProcessedDocument } from './processed-docs';
import { detectLanguage } from './antrophic';

export interface RetrievalQuery {
    question: string;
    company?: string;
    documentType?: string;
    year?: number;
    quarter?: string;
    maxResults?: number;
    similarityThreshold?: number;
}

export interface RetrievalResult {
    relevantDocuments: ProcessedDocument[];
    relevantChunks: {
        content: string;
        metadata: any;
        similarity: number;
        source: {
            filename: string;
            company: string;
            section: string;
        };
    }[];
    query: RetrievalQuery;
    totalResults: number;
    processingTimeMs: number;
}

export interface CompanyIdentificationResult {
    company: string;
    confidence: number;
    reasoning: string;
}

export class IntelligentRetrieval {
    
    /**
     * Main retrieval function that combines vector search with document metadata
     */
    static async retrieveRelevantContent(query: RetrievalQuery): Promise<RetrievalResult> {
        const startTime = Date.now();
        console.log('Starting intelligent retrieval for query:', query.question);

        try {
            // Step 1: Identify company if not specified
            let targetCompany = query.company;
            if (!targetCompany) {
                const companyResult = await this.identifyCompanyFromQuery(query.question);
                if (companyResult.confidence > 0.6) {
                    targetCompany = companyResult.company;
                    console.log(`Identified company: ${targetCompany} (confidence: ${companyResult.confidence})`);
                }
            }

            // Step 2: Get processed documents matching criteria
            const processedDocs = await this.getRelevantProcessedDocuments(
                targetCompany,
                query.documentType,
                query.year,
                query.quarter
            );

            console.log(`Found ${processedDocs.length} processed documents`);

            // Step 3: Perform vector similarity search
            const vectorResults = await this.performVectorSearch(
                query.question,
                targetCompany,
                query.maxResults || 10,
                query.similarityThreshold || 0.7
            );

            console.log(`Found ${vectorResults.documents.length} relevant chunks`);

            // Step 4: Combine and rank results
            const relevantChunks = this.combineAndRankResults(vectorResults, processedDocs);

            // Step 5: Filter processed documents to only include those with relevant chunks
            const relevantDocuments = this.filterRelevantDocuments(processedDocs, relevantChunks);

            const result: RetrievalResult = {
                relevantDocuments,
                relevantChunks,
                query,
                totalResults: relevantChunks.length,
                processingTimeMs: Date.now() - startTime
            };

            console.log(`Retrieval completed in ${result.processingTimeMs}ms`);
            return result;

        } catch (error) {
            console.error('Intelligent retrieval failed:', error);
            throw new Error('Failed to retrieve relevant content: ' + (error as Error).message);
        }
    }

    /**
     * Identify the most likely company from the query
     */
    private static async identifyCompanyFromQuery(question: string): Promise<CompanyIdentificationResult> {
        try {
            // Get all available companies
            const allDocs = await ProcessedDocumentStorage.getAllProcessedDocuments();
            const companies = [...new Set(allDocs.map(doc => doc.company))];

            if (companies.length === 0) {
                return { company: 'default', confidence: 0, reasoning: 'No companies available' };
            }

            // Simple keyword matching for company identification
            const queryLower = question.toLowerCase();
            const companyScores: { [company: string]: number } = {};

            for (const company of companies) {
                let score = 0;
                const companyLower = company.toLowerCase();

                // Direct company name mention
                if (queryLower.includes(companyLower)) {
                    score += 0.8;
                }

                // Partial matching
                const companyWords = companyLower.split(/\s+/);
                for (const word of companyWords) {
                    if (word.length > 2 && queryLower.includes(word)) {
                        score += 0.3;
                    }
                }

                companyScores[company] = score;
            }

            // Find best match
            const bestMatch = Object.entries(companyScores)
                .sort(([,a], [,b]) => b - a)[0];

            if (bestMatch && bestMatch[1] > 0) {
                return {
                    company: bestMatch[0],
                    confidence: Math.min(bestMatch[1], 1.0),
                    reasoning: `Found company mention in query`
                };
            }

            // Fallback: return most recent company
            const recentDoc = allDocs[0];
            return {
                company: recentDoc?.company || 'default',
                confidence: 0.3,
                reasoning: 'Defaulted to most recent company'
            };

        } catch (error) {
            console.error('Company identification failed:', error);
            return { company: 'default', confidence: 0, reasoning: 'Error in identification' };
        }
    }

    /**
     * Get processed documents matching the criteria
     */
    private static async getRelevantProcessedDocuments(
        company?: string,
        documentType?: string,
        year?: number,
        quarter?: string
    ): Promise<ProcessedDocument[]> {
        try {
            let documents: ProcessedDocument[];

            if (company) {
                documents = await ProcessedDocumentStorage.getProcessedDocumentsByCompany(company);
            } else {
                documents = await ProcessedDocumentStorage.getAllProcessedDocuments();
            }

            // Apply filters
            return documents.filter(doc => {
                if (documentType && doc.documentType !== documentType) return false;
                if (year && doc.year !== year) return false;
                if (quarter && doc.quarter !== quarter) return false;
                return true;
            });

        } catch (error) {
            console.error('Failed to get processed documents:', error);
            return [];
        }
    }

    /**
     * Perform vector similarity search
     */
    private static async performVectorSearch(
        query: string,
        company?: string,
        maxResults: number = 10,
        threshold: number = 0.7
    ): Promise<{
        documents: string[];
        metadatas: any[];
        distances: number[];
        ids: string[];
    }> {
        try {
            await vectorDB.initialize();
            
            const results = await vectorDB.searchSimilarDocuments(
                query,
                company,
                maxResults
            );

            // Filter by similarity threshold
            const filteredResults = {
                documents: [] as string[],
                metadatas: [] as any[],
                distances: [] as number[],
                ids: [] as string[]
            };

            for (let i = 0; i < results.documents.length; i++) {
                const similarity = 1 - results.distances[i]; // Convert distance to similarity
                if (similarity >= threshold) {
                    filteredResults.documents.push(results.documents[i]);
                    filteredResults.metadatas.push(results.metadatas[i]);
                    filteredResults.distances.push(results.distances[i]);
                    filteredResults.ids.push(results.ids[i]);
                }
            }

            return filteredResults;

        } catch (error) {
            console.error('Vector search failed:', error);
            return { documents: [], metadatas: [], distances: [], ids: [] };
        }
    }

    /**
     * Combine and rank vector search results with document metadata
     */
    private static combineAndRankResults(
        vectorResults: { documents: string[], metadatas: any[], distances: number[], ids: string[] },
        processedDocs: ProcessedDocument[]
    ): Array<{
        content: string;
        metadata: any;
        similarity: number;
        source: { filename: string; company: string; section: string };
    }> {
        const combinedResults = [];

        for (let i = 0; i < vectorResults.documents.length; i++) {
            const similarity = 1 - vectorResults.distances[i];
            const metadata = vectorResults.metadatas[i];
            
            combinedResults.push({
                content: vectorResults.documents[i],
                metadata,
                similarity,
                source: {
                    filename: metadata.filename || 'unknown',
                    company: metadata.company || 'unknown',
                    section: metadata.section || 'unknown'
                }
            });
        }

        // Sort by similarity score (descending)
        return combinedResults.sort((a, b) => b.similarity - a.similarity);
    }

    /**
     * Filter processed documents to only include those with relevant chunks
     */
    private static filterRelevantDocuments(
        processedDocs: ProcessedDocument[],
        relevantChunks: Array<{ source: { filename: string; company: string } }>
    ): ProcessedDocument[] {
        const relevantFilenames = new Set(
            relevantChunks.map(chunk => `${chunk.source.company}/${chunk.source.filename}`)
        );

        return processedDocs.filter(doc => 
            relevantFilenames.has(`${doc.company}/${doc.originalFilename}`)
        );
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
            const totalEmbeddings = await vectorDB.getDocumentCount(company);

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

    /**
     * Find similar companies based on processed content
     */
    static async findSimilarCompanies(targetCompany: string, limit: number = 5): Promise<Array<{
        company: string;
        similarity: number;
        commonTopics: string[];
    }>> {
        try {
            // This is a simplified implementation
            // In a real system, you might compare company embeddings or use more sophisticated methods
            
            const allDocs = await ProcessedDocumentStorage.getAllProcessedDocuments();
            const companies = [...new Set(allDocs.map(doc => doc.company))].filter(c => c !== targetCompany);
            
            const targetDocs = allDocs.filter(doc => doc.company === targetCompany);
            const targetInsights = targetDocs.flatMap(doc => doc.keyInsights);
            
            const similarities = companies.map(company => {
                const companyDocs = allDocs.filter(doc => doc.company === company);
                const companyInsights = companyDocs.flatMap(doc => doc.keyInsights);
                
                // Simple keyword-based similarity
                const commonKeywords = targetInsights.filter(insight => 
                    companyInsights.some(ci => ci.toLowerCase().includes(insight.toLowerCase()))
                );
                
                return {
                    company,
                    similarity: commonKeywords.length / Math.max(targetInsights.length, 1),
                    commonTopics: commonKeywords.slice(0, 5)
                };
            });

            return similarities
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, limit);

        } catch (error) {
            console.error('Failed to find similar companies:', error);
            return [];
        }
    }
}