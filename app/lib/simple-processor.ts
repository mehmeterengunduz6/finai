import { analyzeWithClaude } from './antrophic';
import { extractTextFromPDF } from './pdf-handler';
import { ProcessedDocument, ProcessedDocumentStorage } from './processed-docs';
import { SimpleStorageService, SimpleEmbedding } from './simple-storage';
import { UploadedPDF } from './types';

export interface SimpleProcessingResult {
    success: boolean;
    processedDocument?: ProcessedDocument;
    error?: string;
    processingTimeMs: number;
    tokensUsed: number;
}

export class SimpleDocumentProcessor {
    private static readonly PROCESSING_VERSION = "1.0-simple";

    /**
     * Process a single document with simplified approach (no vector DB)
     */
    static async processDocument(pdfInfo: UploadedPDF): Promise<SimpleProcessingResult> {
        const startTime = Date.now();
        let tokensUsed = 0;

        try {
            console.log(`Starting simple document processing: ${pdfInfo.company}/${pdfInfo.filename}`);

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

            // Process with LLM for analysis
            console.log('Analyzing document with LLM...');
            const analysisResult = await this.analyzeDocumentWithLLM(textContent, pdfInfo);
            tokensUsed += analysisResult.tokensUsed;

            // Create document chunks for simple storage
            const chunks = this.createDocumentChunks(textContent);
            
            // Store chunks in simple storage
            const simpleEmbeddings: SimpleEmbedding[] = chunks.map((chunk, index) => ({
                id: `simple_${pdfInfo.company}_${pdfInfo.filename}_${index}_${Date.now()}`,
                content: chunk,
                company: pdfInfo.company || 'default',
                filename: pdfInfo.filename,
                metadata: {
                    chunkIndex: index,
                    totalChunks: chunks.length,
                    documentType: pdfInfo.documentType,
                    quarter: pdfInfo.quarter,
                    year: pdfInfo.year,
                    uploadDate: pdfInfo.uploadDate.toISOString()
                }
            }));

            await SimpleStorageService.storeEmbeddings(simpleEmbeddings);

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
                
                embeddingIds: simpleEmbeddings.map(e => e.id),
                
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
                tokensUsed
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
    private static async analyzeDocumentWithLLM(textContent: string, pdfInfo: UploadedPDF): Promise<{
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
        const prompt = `Analyze this financial document and extract structured information in JSON format.

Document: ${pdfInfo.filename}
Company: ${pdfInfo.company}

Please analyze and respond with ONLY a JSON object in this exact format:

{
  "summary": "Brief executive summary of the document",
  "keyInsights": ["insight1", "insight2", "insight3"],
  "keyMetrics": {
    "revenue": 123456789,
    "netIncome": 12345678,
    "currency": "TRY",
    "period": "Q1 2024"
  },
  "trends": {
    "revenueGrowth": 0.15,
    "profitMargin": 0.08
  },
  "riskFactors": ["risk1", "risk2"],
  "opportunities": ["opportunity1", "opportunity2"],
  "sections": {
    "executiveSummary": "Executive summary text"
  },
  "confidence": {
    "overall": 0.9,
    "dataExtraction": 0.95,
    "summaryQuality": 0.88,
    "financialAnalysis": 0.92
  }
}

Document content (first 8000 characters):
${textContent.substring(0, 8000)}`;

        try {
            // Use a simple text analysis instead of the full analyzeWithClaude to avoid complexity
            const response = await analyzeWithClaude(
                { question: prompt, context: '' },
                []
            );

            // Try to extract JSON from response
            const jsonMatch = response.answer.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const analysisData = JSON.parse(jsonMatch[0]);
                    return {
                        ...analysisData,
                        tokensUsed: Math.floor(prompt.length / 4)
                    };
                } catch (parseError) {
                    console.warn('Failed to parse analysis JSON:', parseError);
                }
            }

            // Fallback if parsing fails
            return this.createFallbackAnalysis(textContent, pdfInfo);

        } catch (error) {
            console.error('LLM analysis failed, using fallback:', error);
            return this.createFallbackAnalysis(textContent, pdfInfo);
        }
    }

    /**
     * Create fallback analysis if LLM analysis fails
     */
    private static createFallbackAnalysis(textContent: string, pdfInfo: UploadedPDF): any {
        // Extract some basic information
        const hasRevenue = /revenue|gelir|hasılat/i.test(textContent);
        const hasProfit = /profit|kar|netkar/i.test(textContent);
        
        return {
            summary: `Financial document for ${pdfInfo.company} - ${pdfInfo.filename}. Document contains ${textContent.length} characters of financial data.`,
            keyInsights: [
                'Document successfully processed',
                hasRevenue ? 'Contains revenue information' : 'Revenue data may be limited',
                hasProfit ? 'Contains profit information' : 'Profit data may be limited'
            ],
            keyMetrics: {},
            trends: {},
            riskFactors: [],
            opportunities: [],
            sections: {
                fullContent: textContent.substring(0, 500) + '...'
            },
            confidence: {
                overall: 0.5,
                dataExtraction: 0.8,
                summaryQuality: 0.4,
                financialAnalysis: 0.3
            },
            tokensUsed: 500
        };
    }

    /**
     * Create document chunks
     */
    private static createDocumentChunks(text: string, chunkSize: number = 2000): string[] {
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
            start = Math.max(start + chunkSize - 100, start + 1); // Small overlap
        }

        return chunks.filter(chunk => chunk.length > 50);
    }

    /**
     * Estimate processing cost
     */
    private static estimateProcessingCost(tokensUsed: number): number {
        // Rough estimate based on Claude pricing
        return (tokensUsed * 0.25) / 1000000;
    }

    /**
     * Process multiple documents in batch
     */
    static async processBatch(pdfInfos: UploadedPDF[]): Promise<SimpleProcessingResult[]> {
        console.log(`Starting simple batch processing of ${pdfInfos.length} documents`);
        const results: SimpleProcessingResult[] = [];

        for (const pdfInfo of pdfInfos) {
            try {
                const result = await this.processDocument(pdfInfo);
                results.push(result);
                
                // Add delay between processing
                if (results.length < pdfInfos.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                console.error(`Simple batch processing failed for ${pdfInfo.filename}:`, error);
                results.push({
                    success: false,
                    error: (error as Error).message,
                    processingTimeMs: 0,
                    tokensUsed: 0
                });
            }
        }

        const successful = results.filter(r => r.success).length;
        console.log(`Simple batch processing completed: ${successful}/${pdfInfos.length} successful`);

        return results;
    }
}