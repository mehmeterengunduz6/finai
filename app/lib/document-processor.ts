import { analyzeWithClaude, generateSummary } from './antrophic';
import { extractTextFromPDF } from './pdf-handler';
import { vectorDB, DocumentEmbedding } from './vector-db';
import { ProcessedDocument, ProcessedDocumentStorage } from './processed-docs';
import { UploadedPDF } from './types';

export interface ProcessingOptions {
    useAdvancedAnalysis?: boolean;
    generateEmbeddings?: boolean;
    chunkSize?: number; // For splitting large documents
    overlapSize?: number; // Overlap between chunks
}

export interface ProcessingResult {
    success: boolean;
    processedDocument?: ProcessedDocument;
    error?: string;
    processingTimeMs: number;
    tokensUsed: number;
    costEstimate?: number;
}

export class DocumentProcessor {
    private static readonly CHUNK_SIZE = 4000; // Default chunk size for embeddings
    private static readonly OVERLAP_SIZE = 200; // Overlap between chunks
    private static readonly PROCESSING_VERSION = "1.0";

    /**
     * Process a single document with LLM analysis and embeddings
     */
    static async processDocument(
        pdfInfo: UploadedPDF,
        options: ProcessingOptions = {}
    ): Promise<ProcessingResult> {
        const startTime = Date.now();
        let tokensUsed = 0;

        try {
            console.log(`Starting document processing: ${pdfInfo.company}/${pdfInfo.filename}`);

            // Check if already processed
            const isProcessed = await ProcessedDocumentStorage.isDocumentProcessed(
                pdfInfo.filename,
                pdfInfo.company || 'default'
            );

            if (isProcessed) {
                console.log(`Document already processed: ${pdfInfo.filename}`);
                return {
                    success: false,
                    error: 'Document already processed',
                    processingTimeMs: Date.now() - startTime,
                    tokensUsed: 0
                };
            }

            // Extract text from PDF
            console.log('Extracting text from PDF...');
            const textContent = await extractTextFromPDF(pdfInfo.filename, pdfInfo.company);
            
            if (!textContent || textContent.length < 100) {
                throw new Error('Insufficient text content extracted from PDF');
            }

            // Process with LLM for advanced analysis
            console.log('Analyzing document with LLM...');
            const analysisResult = await this.analyzeDocumentWithLLM(textContent, pdfInfo);
            tokensUsed += analysisResult.tokensUsed;

            // Create document chunks for embeddings
            const chunks = options.generateEmbeddings !== false 
                ? this.createDocumentChunks(textContent, options.chunkSize, options.overlapSize)
                : [];

            // Generate embeddings for chunks
            const embeddingIds: string[] = [];
            if (chunks.length > 0) {
                console.log(`Generating embeddings for ${chunks.length} chunks...`);
                const embeddings = await this.generateDocumentEmbeddings(chunks, pdfInfo);
                await vectorDB.addDocumentEmbeddings(embeddings);
                embeddingIds.push(...embeddings.map(e => e.id));
            }

            // Create processed document
            const processedDoc: ProcessedDocument = {
                id: `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                originalFilename: pdfInfo.filename,
                company: pdfInfo.company || 'default',
                documentType: pdfInfo.documentType,
                quarter: pdfInfo.quarter,
                year: pdfInfo.year,
                
                processingDate: new Date(),
                processingVersion: this.PROCESSING_VERSION,
                
                summary: analysisResult.summary,
                keyInsights: analysisResult.keyInsights,
                keyMetrics: analysisResult.keyMetrics,
                trends: analysisResult.trends,
                riskFactors: analysisResult.riskFactors,
                opportunities: analysisResult.opportunities,
                sections: analysisResult.sections,
                
                embeddingIds,
                
                confidence: analysisResult.confidence,
                originalFileSize: pdfInfo.size,
                originalPageCount: pdfInfo.pageCount,
                
                processingStats: {
                    processingTimeMs: Date.now() - startTime,
                    tokensUsed,
                    costEstimate: this.estimateProcessingCost(tokensUsed)
                }
            };

            // Save processed document
            await ProcessedDocumentStorage.saveProcessedDocument(processedDoc);

            console.log(`Document processing completed: ${pdfInfo.filename} (${Date.now() - startTime}ms)`);

            return {
                success: true,
                processedDocument: processedDoc,
                processingTimeMs: Date.now() - startTime,
                tokensUsed,
                costEstimate: processedDoc.processingStats.costEstimate
            };

        } catch (error) {
            console.error('Document processing failed:', error);
            return {
                success: false,
                error: (error as Error).message,
                processingTimeMs: Date.now() - startTime,
                tokensUsed
            };
        }
    }

    /**
     * Analyze document with LLM for detailed insights
     */
    private static async analyzeDocumentWithLLM(
        textContent: string,
        pdfInfo: UploadedPDF
    ): Promise<{
        summary: string;
        keyInsights: string[];
        keyMetrics: any;
        trends: any;
        riskFactors: string[];
        opportunities: string[];
        sections: any;
        confidence: any;
        tokensUsed: number;
    }> {
        const prompt = `Analyze this financial document and extract structured information. 

Document: ${pdfInfo.filename}
Company: ${pdfInfo.company}
Type: ${pdfInfo.documentType || 'Financial Report'}
Quarter: ${pdfInfo.quarter || 'N/A'}
Year: ${pdfInfo.year || 'N/A'}

Please provide a comprehensive analysis in JSON format with the following structure:

{
  "summary": "Brief executive summary of the document",
  "keyInsights": ["insight1", "insight2", "insight3"],
  "keyMetrics": {
    "revenue": 123456789,
    "netIncome": 12345678,
    "totalAssets": 234567890,
    "totalLiabilities": 123456789,
    "shareholdersEquity": 111111111,
    "operatingCashFlow": 12345678,
    "currency": "TRY",
    "period": "Q1 2024"
  },
  "trends": {
    "revenueGrowth": 0.15,
    "profitMargin": 0.08,
    "debtToEquity": 0.5,
    "returnOnAssets": 0.12
  },
  "riskFactors": ["risk1", "risk2", "risk3"],
  "opportunities": ["opportunity1", "opportunity2"],
  "sections": {
    "executiveSummary": "Executive summary text",
    "financialHighlights": "Financial highlights text",
    "businessOverview": "Business overview text",
    "risksAndUncertainties": "Risks text",
    "outlook": "Future outlook text"
  },
  "confidence": {
    "overall": 0.9,
    "dataExtraction": 0.95,
    "summaryQuality": 0.88,
    "financialAnalysis": 0.92
  }
}

Document content:
${textContent.substring(0, 15000)}`;

        try {
            // Use existing Claude analysis function
            const response = await analyzeWithClaude(
                { question: prompt, context: '' },
                [] // No additional PDF files needed
            );

            // Extract JSON from response
            const jsonMatch = response.answer.match(/```json\s*(\{[\s\S]*?\})\s*```/);
            if (jsonMatch) {
                const analysisData = JSON.parse(jsonMatch[1]);
                return {
                    ...analysisData,
                    tokensUsed: Math.floor(prompt.length / 4) // Rough token estimate
                };
            } else {
                // Fallback if no JSON found
                return this.createFallbackAnalysis(textContent, pdfInfo);
            }
        } catch (error) {
            console.error('LLM analysis failed, using fallback:', error);
            return this.createFallbackAnalysis(textContent, pdfInfo);
        }
    }

    /**
     * Create fallback analysis if LLM analysis fails
     */
    private static createFallbackAnalysis(textContent: string, pdfInfo: UploadedPDF): any {
        return {
            summary: `Financial document analysis for ${pdfInfo.company} - ${pdfInfo.filename}`,
            keyInsights: ['Document successfully processed', 'Basic text extraction completed'],
            keyMetrics: {},
            trends: {},
            riskFactors: [],
            opportunities: [],
            sections: {
                fullText: textContent.substring(0, 1000) + '...'
            },
            confidence: {
                overall: 0.3,
                dataExtraction: 0.5,
                summaryQuality: 0.2,
                financialAnalysis: 0.1
            },
            tokensUsed: 100
        };
    }

    /**
     * Create document chunks for embeddings
     */
    private static createDocumentChunks(
        text: string,
        chunkSize: number = this.CHUNK_SIZE,
        overlapSize: number = this.OVERLAP_SIZE
    ): string[] {
        const chunks: string[] = [];
        let start = 0;

        while (start < text.length) {
            const end = Math.min(start + chunkSize, text.length);
            let chunk = text.substring(start, end);

            // Try to break at sentence boundaries
            if (end < text.length) {
                const lastSentence = chunk.lastIndexOf('.');
                if (lastSentence > chunkSize * 0.8) {
                    chunk = chunk.substring(0, lastSentence + 1);
                }
            }

            chunks.push(chunk.trim());
            start = Math.max(start + chunkSize - overlapSize, start + 1);
        }

        return chunks.filter(chunk => chunk.length > 50); // Filter out very small chunks
    }

    /**
     * Generate embeddings for document chunks
     */
    private static async generateDocumentEmbeddings(
        chunks: string[],
        pdfInfo: UploadedPDF
    ): Promise<DocumentEmbedding[]> {
        const embeddings: DocumentEmbedding[] = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const embeddingId = `emb_${pdfInfo.company}_${pdfInfo.filename}_${i}_${Date.now()}`;

            embeddings.push({
                id: embeddingId,
                company: pdfInfo.company || 'default',
                filename: pdfInfo.filename,
                documentType: pdfInfo.documentType,
                quarter: pdfInfo.quarter,
                year: pdfInfo.year,
                section: `chunk_${i + 1}`,
                content: chunk,
                metadata: {
                    chunkIndex: i,
                    totalChunks: chunks.length,
                    originalFileSize: pdfInfo.size,
                    uploadDate: pdfInfo.uploadDate.toISOString()
                }
            });
        }

        return embeddings;
    }

    /**
     * Estimate processing cost in USD
     */
    private static estimateProcessingCost(tokensUsed: number): number {
        // Rough estimate based on current LLM pricing
        // Claude Haiku: ~$0.25 per 1M tokens input, ~$1.25 per 1M tokens output
        // OpenAI embeddings: ~$0.02 per 1M tokens
        const inputCost = (tokensUsed * 0.25) / 1000000;
        const embeddingCost = (tokensUsed * 0.02) / 1000000;
        return inputCost + embeddingCost;
    }

    /**
     * Process multiple documents in batch
     */
    static async processBatch(
        pdfInfos: UploadedPDF[],
        options: ProcessingOptions = {}
    ): Promise<ProcessingResult[]> {
        console.log(`Starting batch processing of ${pdfInfos.length} documents`);
        const results: ProcessingResult[] = [];

        for (const pdfInfo of pdfInfos) {
            try {
                const result = await this.processDocument(pdfInfo, options);
                results.push(result);
                
                // Add delay between processing to avoid rate limits
                if (results.length < pdfInfos.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                console.error(`Batch processing failed for ${pdfInfo.filename}:`, error);
                results.push({
                    success: false,
                    error: (error as Error).message,
                    processingTimeMs: 0,
                    tokensUsed: 0
                });
            }
        }

        const successful = results.filter(r => r.success).length;
        console.log(`Batch processing completed: ${successful}/${pdfInfos.length} successful`);

        return results;
    }

    /**
     * Re-process a document with updated analysis
     */
    static async reprocessDocument(
        filename: string,
        company: string,
        options: ProcessingOptions = {}
    ): Promise<ProcessingResult> {
        console.log(`Re-processing document: ${company}/${filename}`);

        // Delete existing processed document
        const existingDocs = await ProcessedDocumentStorage.getProcessedDocumentsByCompany(company);
        const existingDoc = existingDocs.find(doc => doc.originalFilename === filename);
        
        if (existingDoc) {
            await ProcessedDocumentStorage.deleteProcessedDocument(existingDoc.id);
            
            // Delete embeddings
            if (existingDoc.embeddingIds.length > 0) {
                await vectorDB.deleteDocumentEmbeddings(filename, company);
            }
        }

        // Find original PDF info
        const { getAllPDFs } = await import('./pdf-handler');
        const allPDFs = await getAllPDFs(company);
        const pdfInfo = allPDFs.find(pdf => pdf.filename === filename);

        if (!pdfInfo) {
            return {
                success: false,
                error: 'Original PDF not found',
                processingTimeMs: 0,
                tokensUsed: 0
            };
        }

        // Process again
        return await this.processDocument(pdfInfo, options);
    }
}