import * as fs from 'fs';
import * as path from 'path';

const PROCESSED_DIR = process.env.PROCESSED_DIR || './processed';
const PROCESSED_DOCS_DIR = path.join(PROCESSED_DIR, 'documents');
const PROCESSED_SUMMARIES_DIR = path.join(PROCESSED_DIR, 'summaries');

// Create processed directories if they don't exist
if (!fs.existsSync(PROCESSED_DOCS_DIR)) {
    fs.mkdirSync(PROCESSED_DOCS_DIR, { recursive: true });
}
if (!fs.existsSync(PROCESSED_SUMMARIES_DIR)) {
    fs.mkdirSync(PROCESSED_SUMMARIES_DIR, { recursive: true });
}

export interface ProcessedDocument {
    id: string;
    originalFilename: string;
    company: string;
    documentType?: string;
    quarter?: string;
    year?: number;
    
    // Processing metadata
    processingDate: Date;
    processingVersion: string; // For tracking different processing versions
    
    // Document analysis results
    summary: string;
    keyInsights: string[];
    
    // Financial data extraction
    keyMetrics: {
        revenue?: number;
        netIncome?: number;
        totalAssets?: number;
        totalLiabilities?: number;
        shareholdersEquity?: number;
        operatingCashFlow?: number;
        currency?: string;
        period?: string;
        [key: string]: any; // Allow additional custom metrics
    };
    
    // Trend analysis
    trends: {
        revenueGrowth?: number;
        profitMargin?: number;
        debtToEquity?: number;
        returnOnAssets?: number;
        [key: string]: any;
    };
    
    // Risk factors and opportunities
    riskFactors: string[];
    opportunities: string[];
    
    // Key sections extracted from document
    sections: {
        executiveSummary?: string;
        financialHighlights?: string;
        businessOverview?: string;
        risksAndUncertainties?: string;
        outlook?: string;
        [sectionName: string]: string | undefined;
    };
    
    // Vector database references
    embeddingIds: string[]; // IDs of embeddings stored in vector DB
    
    // Processing confidence scores
    confidence: {
        overall: number; // 0-1 scale
        dataExtraction: number;
        summaryQuality: number;
        financialAnalysis: number;
    };
    
    // Original file metadata
    originalFileSize: number;
    originalPageCount?: number;
    
    // Processing performance metrics
    processingStats: {
        processingTimeMs: number;
        tokensUsed: number;
        costEstimate?: number; // USD cost for processing
    };
}

export interface DocumentProcessingQueue {
    id: string;
    filename: string;
    company: string;
    priority: 'high' | 'medium' | 'low';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    addedAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    errorMessage?: string;
    retryCount: number;
}

export class ProcessedDocumentStorage {
    
    /**
     * Save a processed document to storage
     */
    static async saveProcessedDocument(processedDoc: ProcessedDocument): Promise<void> {
        try {
            const filename = `${processedDoc.company}_${processedDoc.originalFilename}_${processedDoc.id}.json`;
            const filepath = path.join(PROCESSED_DOCS_DIR, filename);
            
            const data = {
                ...processedDoc,
                processingDate: processedDoc.processingDate.toISOString(),
            };
            
            fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
            console.log(`Saved processed document: ${filename}`);
        } catch (error) {
            console.error('Failed to save processed document:', error);
            throw new Error('Failed to save processed document');
        }
    }
    
    /**
     * Load a processed document by ID
     */
    static async getProcessedDocument(id: string): Promise<ProcessedDocument | null> {
        try {
            const files = fs.readdirSync(PROCESSED_DOCS_DIR);
            const targetFile = files.find(file => file.includes(id));
            
            if (!targetFile) {
                return null;
            }
            
            const filepath = path.join(PROCESSED_DOCS_DIR, targetFile);
            const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
            
            return {
                ...data,
                processingDate: new Date(data.processingDate),
            };
        } catch (error) {
            console.error('Failed to load processed document:', error);
            return null;
        }
    }
    
    /**
     * Get all processed documents for a company
     */
    static async getProcessedDocumentsByCompany(company: string): Promise<ProcessedDocument[]> {
        try {
            const files = fs.readdirSync(PROCESSED_DOCS_DIR);
            const companyFiles = files.filter(file => file.startsWith(`${company}_`));
            
            const documents: ProcessedDocument[] = [];
            
            for (const file of companyFiles) {
                try {
                    const filepath = path.join(PROCESSED_DOCS_DIR, file);
                    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
                    
                    documents.push({
                        ...data,
                        processingDate: new Date(data.processingDate),
                    });
                } catch (error) {
                    console.error(`Failed to load processed document ${file}:`, error);
                }
            }
            
            return documents.sort((a, b) => b.processingDate.getTime() - a.processingDate.getTime());
        } catch (error) {
            console.error('Failed to load processed documents:', error);
            return [];
        }
    }
    
    /**
     * Get all processed documents
     */
    static async getAllProcessedDocuments(): Promise<ProcessedDocument[]> {
        try {
            const files = fs.readdirSync(PROCESSED_DOCS_DIR);
            const documents: ProcessedDocument[] = [];
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filepath = path.join(PROCESSED_DOCS_DIR, file);
                        const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
                        
                        documents.push({
                            ...data,
                            processingDate: new Date(data.processingDate),
                        });
                    } catch (error) {
                        console.error(`Failed to load processed document ${file}:`, error);
                    }
                }
            }
            
            return documents.sort((a, b) => b.processingDate.getTime() - a.processingDate.getTime());
        } catch (error) {
            console.error('Failed to load all processed documents:', error);
            return [];
        }
    }
    
    /**
     * Check if a document has already been processed
     */
    static async isDocumentProcessed(filename: string, company: string): Promise<boolean> {
        try {
            const files = fs.readdirSync(PROCESSED_DOCS_DIR);
            return files.some(file => file.startsWith(`${company}_${filename}_`));
        } catch (error) {
            console.error('Failed to check if document is processed:', error);
            return false;
        }
    }
    
    /**
     * Delete processed document
     */
    static async deleteProcessedDocument(id: string): Promise<boolean> {
        try {
            const files = fs.readdirSync(PROCESSED_DOCS_DIR);
            const targetFile = files.find(file => file.includes(id));
            
            if (!targetFile) {
                return false;
            }
            
            const filepath = path.join(PROCESSED_DOCS_DIR, targetFile);
            fs.unlinkSync(filepath);
            console.log(`Deleted processed document: ${targetFile}`);
            return true;
        } catch (error) {
            console.error('Failed to delete processed document:', error);
            return false;
        }
    }
    
    /**
     * Get processing statistics
     */
    static async getProcessingStats(): Promise<{
        totalProcessed: number;
        companiesProcessed: string[];
        averageProcessingTime: number;
        totalTokensUsed: number;
        estimatedCost: number;
    }> {
        try {
            const documents = await this.getAllProcessedDocuments();
            
            const companies = [...new Set(documents.map(doc => doc.company))];
            const totalTokens = documents.reduce((sum, doc) => sum + doc.processingStats.tokensUsed, 0);
            const totalCost = documents.reduce((sum, doc) => sum + (doc.processingStats.costEstimate || 0), 0);
            const avgProcessingTime = documents.reduce((sum, doc) => sum + doc.processingStats.processingTimeMs, 0) / documents.length;
            
            return {
                totalProcessed: documents.length,
                companiesProcessed: companies,
                averageProcessingTime: avgProcessingTime,
                totalTokensUsed: totalTokens,
                estimatedCost: totalCost,
            };
        } catch (error) {
            console.error('Failed to get processing stats:', error);
            return {
                totalProcessed: 0,
                companiesProcessed: [],
                averageProcessingTime: 0,
                totalTokensUsed: 0,
                estimatedCost: 0,
            };
        }
    }
}

export class ProcessingQueueManager {
    private static queueFile = path.join(PROCESSED_DIR, 'processing_queue.json');
    
    /**
     * Add document to processing queue
     */
    static async addToQueue(item: Omit<DocumentProcessingQueue, 'id' | 'addedAt' | 'retryCount'>): Promise<string> {
        try {
            const queue = await this.getQueue();
            const id = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const queueItem: DocumentProcessingQueue = {
                ...item,
                id,
                addedAt: new Date(),
                retryCount: 0,
            };
            
            queue.push(queueItem);
            await this.saveQueue(queue);
            
            console.log(`Added to processing queue: ${item.company}/${item.filename}`);
            return id;
        } catch (error) {
            console.error('Failed to add to processing queue:', error);
            throw new Error('Failed to add to processing queue');
        }
    }
    
    /**
     * Get next item from queue
     */
    static async getNextQueueItem(): Promise<DocumentProcessingQueue | null> {
        try {
            const queue = await this.getQueue();
            const pending = queue
                .filter(item => item.status === 'pending')
                .sort((a, b) => {
                    // Sort by priority, then by addedAt
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                        return priorityOrder[b.priority] - priorityOrder[a.priority];
                    }
                    return a.addedAt.getTime() - b.addedAt.getTime();
                });
            
            return pending[0] || null;
        } catch (error) {
            console.error('Failed to get next queue item:', error);
            return null;
        }
    }
    
    /**
     * Update queue item status
     */
    static async updateQueueItem(id: string, updates: Partial<DocumentProcessingQueue>): Promise<void> {
        try {
            const queue = await this.getQueue();
            const index = queue.findIndex(item => item.id === id);
            
            if (index === -1) {
                throw new Error(`Queue item not found: ${id}`);
            }
            
            queue[index] = { ...queue[index], ...updates };
            await this.saveQueue(queue);
        } catch (error) {
            console.error('Failed to update queue item:', error);
            throw new Error('Failed to update queue item');
        }
    }
    
    /**
     * Get full queue
     */
    static async getQueue(): Promise<DocumentProcessingQueue[]> {
        try {
            if (!fs.existsSync(this.queueFile)) {
                return [];
            }
            
            const data = fs.readFileSync(this.queueFile, 'utf-8');
            const queue = JSON.parse(data);
            
            return queue.map((item: any) => ({
                ...item,
                addedAt: new Date(item.addedAt),
                startedAt: item.startedAt ? new Date(item.startedAt) : undefined,
                completedAt: item.completedAt ? new Date(item.completedAt) : undefined,
            }));
        } catch (error) {
            console.error('Failed to load processing queue:', error);
            return [];
        }
    }
    
    /**
     * Save queue to file
     */
    private static async saveQueue(queue: DocumentProcessingQueue[]): Promise<void> {
        try {
            const data = queue.map(item => ({
                ...item,
                addedAt: item.addedAt.toISOString(),
                startedAt: item.startedAt?.toISOString(),
                completedAt: item.completedAt?.toISOString(),
            }));
            
            fs.writeFileSync(this.queueFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Failed to save processing queue:', error);
            throw new Error('Failed to save processing queue');
        }
    }
    
    /**
     * Clear completed items from queue
     */
    static async clearCompleted(): Promise<number> {
        try {
            const queue = await this.getQueue();
            const beforeCount = queue.length;
            const activeQueue = queue.filter(item => 
                item.status !== 'completed' && item.status !== 'failed'
            );
            
            await this.saveQueue(activeQueue);
            const removedCount = beforeCount - activeQueue.length;
            
            console.log(`Cleared ${removedCount} completed items from processing queue`);
            return removedCount;
        } catch (error) {
            console.error('Failed to clear completed queue items:', error);
            return 0;
        }
    }
}