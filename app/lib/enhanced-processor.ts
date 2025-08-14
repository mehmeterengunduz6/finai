import { analyzeWithClaude } from './antrophic';
import { ProcessedDocument, ProcessedDocumentStorage } from './processed-docs';
import { SimpleStorageService, SimpleEmbedding } from './simple-storage';
import { UploadedPDF } from './types';
import * as fs from 'fs';
import * as path from 'path';

export interface EnhancedProcessingResult {
    success: boolean;
    processedDocument?: ProcessedDocument;
    error?: string;
    processingTimeMs: number;
    tokensUsed: number;
    costEstimate?: number;
}

export class EnhancedDocumentProcessor {
    private static readonly PROCESSING_VERSION = "2.0-enhanced";
    private static readonly UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
    private static readonly COMPANIES_DIR = path.join(this.UPLOAD_DIR, 'companies');

    /**
     * Process a single document by sending PDF directly to Claude
     */
    static async processDocument(pdfInfo: UploadedPDF): Promise<EnhancedProcessingResult> {
        const startTime = Date.now();
        let tokensUsed = 0;

        try {
            console.log(`Starting enhanced document processing: ${pdfInfo.company}/${pdfInfo.filename}`);

            // Check if already processed with enhanced version
            const existingDoc = await this.getExistingProcessedDocument(pdfInfo);
            if (existingDoc && existingDoc.processingVersion === this.PROCESSING_VERSION) {
                console.log(`Document already processed with enhanced version: ${pdfInfo.filename}`);
                return {
                    success: false,
                    error: 'Document already processed with enhanced version',
                    processingTimeMs: Date.now() - startTime,
                    tokensUsed: 0
                };
            }

            // Get PDF file path
            const pdfPath = path.join(this.COMPANIES_DIR, pdfInfo.company || 'default', pdfInfo.filename);
            
            if (!fs.existsSync(pdfPath)) {
                throw new Error(`PDF file not found: ${pdfPath}`);
            }

            console.log('Processing PDF directly with Claude...');
            
            // Process with Claude by sending PDF directly
            const analysisResult = await this.analyzeDocumentDirectly(pdfPath, pdfInfo);
            tokensUsed += analysisResult.tokensUsed;

            // Create comprehensive text chunks from extracted data
            const textChunks = this.createComprehensiveTextChunks(analysisResult);
            
            // Store chunks in simple storage for retrieval
            const simpleEmbeddings: SimpleEmbedding[] = textChunks.map((chunk, index) => ({
                id: `enhanced_${pdfInfo.company}_${pdfInfo.filename}_${index}_${Date.now()}`,
                content: chunk,
                company: pdfInfo.company || 'default',
                filename: pdfInfo.filename,
                metadata: {
                    chunkIndex: index,
                    totalChunks: textChunks.length,
                    documentType: pdfInfo.documentType,
                    quarter: pdfInfo.quarter,
                    year: pdfInfo.year,
                    processingVersion: this.PROCESSING_VERSION,
                    uploadDate: pdfInfo.uploadDate.toISOString()
                }
            }));

            await SimpleStorageService.storeEmbeddings(simpleEmbeddings);

            // Create enhanced processed document
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

            // Delete old processed version if exists
            if (existingDoc) {
                await ProcessedDocumentStorage.deleteProcessedDocument(existingDoc.id);
            }

            // Save new processed document
            await ProcessedDocumentStorage.saveProcessedDocument(processedDoc);

            console.log(`Enhanced document processing completed: ${pdfInfo.filename} (${Date.now() - startTime}ms)`);

            return {
                success: true,
                processedDocument: processedDoc,
                processingTimeMs: Date.now() - startTime,
                tokensUsed,
                costEstimate: processedDoc.processingStats.costEstimate
            };

        } catch (error) {
            console.error('Enhanced document processing failed:', error);
            return {
                success: false,
                error: (error as Error).message,
                processingTimeMs: Date.now() - startTime,
                tokensUsed
            };
        }
    }

    /**
     * Analyze document by sending PDF directly to Claude
     */
    private static async analyzeDocumentDirectly(pdfPath: string, pdfInfo: UploadedPDF): Promise<{
        summary: string;
        keyInsights: string[];
        keyMetrics: any;
        trends: any;
        riskFactors: string[];
        opportunities: string[];
        sections: any;
        confidence: any;
        tokensUsed: number;
        extractedData: any;
    }> {
        const prompt = `Lütfen bu finansal dokümanda yer alan TÜM bilgileri kapsamlı bir şekilde çıkarın ve analiz edin. Bu bir Türk şirketi finansal sunumudur.

ŞİRKET: ${pdfInfo.company}
DOKÜMAN: ${pdfInfo.filename}
YIL: ${pdfInfo.year || 'N/A'}
ÇEYREK: ${pdfInfo.quarter || 'N/A'}

LÜTFEN AŞAĞIDA BELİRTİLEN TÜM BİLGİLERİ ÇIKARIN:

1. FİNANSAL VERİLER:
- Gelir/Hasılat (her dönem için)
- Net kar/zarar
- EBITDA
- Toplam varlık
- Özkaynak
- Borç bilgileri
- Nakit akışı
- Marj oranları

2. SEKTÖR/FAALİYET BİLGİLERİ:
- Ana faaliyet konuları
- Sektör bilgisi
- İş kolları
- Müşteri segmentleri

3. PERFORMANS GÖSTERGELERİ:
- Büyüme oranları
- Karlılık göstergeleri
- Verimlilik metrikleri
- Pazar payı

4. ÖNGÖRÜLER VE HEDEFLER:
- Gelecek dönem tahminleri
- Stratejik hedefler
- Yatırım planları

5. RİSKLER VE FIRSATLAR:
- Tespit edilen riskler
- Büyüme fırsatları
- Pazar koşulları

6. DİĞER ÖNEMLİ BİLGİLER:
- Yönetim değerlendirmeleri
- Operasyonel bilgiler
- Düzenleyici gelişmeler

Lütfen cevabınızı SADECE aşağıdaki JSON formatında verin (başka metin eklemeyin):

{
  "summary": "Dokümanın kapsamlı özeti",
  "keyInsights": ["ana bulgu 1", "ana bulgu 2", "ana bulgu 3"],
  "keyMetrics": {
    "revenue": 1000000000,
    "netIncome": 100000000,
    "totalAssets": 5000000000,
    "totalDebt": 2000000000,
    "equity": 3000000000,
    "ebitda": 200000000,
    "operatingCashFlow": 150000000,
    "currency": "TRY",
    "period": "2024-Q1"
  },
  "trends": {
    "revenueGrowth": 0.15,
    "profitMargin": 0.10,
    "debtToEquity": 0.67,
    "returnOnAssets": 0.02,
    "ebitdaMargin": 0.20
  },
  "riskFactors": ["risk faktörü 1", "risk faktörü 2"],
  "opportunities": ["fırsat 1", "fırsat 2"],
  "sections": {
    "executiveSummary": "yönetim özeti",
    "financialHighlights": "finansal öne çıkanlar",
    "businessOverview": "iş genel bakış",
    "marketConditions": "pazar koşulları",
    "outlook": "gelecek beklentiler"
  },
  "extractedData": {
    "allFinancialData": {},
    "businessSegments": [],
    "geographicalData": {},
    "historicalComparisons": {},
    "managementCommentary": "",
    "keyEvents": [],
    "industryMetrics": {}
  },
  "confidence": {
    "overall": 0.95,
    "dataExtraction": 0.90,
    "summaryQuality": 0.95,
    "financialAnalysis": 0.90
  }
}`;

        try {
            // Use the existing analyzeWithClaude function but send the PDF file
            const pdfFiles = [{
                filename: pdfInfo.filename,
                filepath: pdfPath,
                company: pdfInfo.company
            }];

            const response = await analyzeWithClaude(
                { question: prompt, context: '' },
                pdfFiles
            );

            // Extract JSON from response
            const jsonMatch = response.answer.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const analysisData = JSON.parse(jsonMatch[0]);
                    return {
                        ...analysisData,
                        tokensUsed: Math.floor(prompt.length / 4) // Rough token estimate
                    };
                } catch (parseError) {
                    console.warn('Failed to parse analysis JSON:', parseError);
                }
            }

            // Fallback if parsing fails
            return this.createEnhancedFallbackAnalysis(pdfInfo);

        } catch (error) {
            console.error('Direct PDF analysis failed:', error);
            return this.createEnhancedFallbackAnalysis(pdfInfo);
        }
    }

    /**
     * Create enhanced fallback analysis
     */
    private static createEnhancedFallbackAnalysis(pdfInfo: UploadedPDF): any {
        return {
            summary: `${pdfInfo.company} şirketi ${pdfInfo.year} ${pdfInfo.quarter || ''} dönemi finansal sunumu. Doküman başarıyla işlendi ancak detaylı veri çıkarımında sınırlı başarı sağlandı.`,
            keyInsights: [
                'Doküman başarıyla işlendi',
                'PDF formatında finansal sunum',
                'Detaylı analiz için tekrar işleme gerekebilir'
            ],
            keyMetrics: {
                currency: 'TRY',
                period: `${pdfInfo.year}-${pdfInfo.quarter || 'FY'}`
            },
            trends: {},
            riskFactors: [],
            opportunities: [],
            sections: {
                documentInfo: `${pdfInfo.company} finansal sunumu - ${pdfInfo.filename}`
            },
            extractedData: {
                processingNote: 'PDF doğrudan Claude ile işlendi, detaylı veri çıkarımı sınırlı',
                documentMetadata: {
                    company: pdfInfo.company,
                    filename: pdfInfo.filename,
                    year: pdfInfo.year,
                    quarter: pdfInfo.quarter
                }
            },
            confidence: {
                overall: 0.3,
                dataExtraction: 0.2,
                summaryQuality: 0.4,
                financialAnalysis: 0.2
            },
            tokensUsed: 1000
        };
    }

    /**
     * Create comprehensive text chunks from extracted data
     */
    private static createComprehensiveTextChunks(analysisResult: any): string[] {
        const chunks: string[] = [];

        // Summary chunk
        chunks.push(`ÖZET: ${analysisResult.summary}`);

        // Key insights chunk
        if (analysisResult.keyInsights?.length > 0) {
            chunks.push(`ANA BULGULAR: ${analysisResult.keyInsights.join('. ')}`);
        }

        // Financial metrics chunk
        if (analysisResult.keyMetrics && Object.keys(analysisResult.keyMetrics).length > 0) {
            const metricsText = Object.entries(analysisResult.keyMetrics)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
            chunks.push(`FİNANSAL METRİKLER: ${metricsText}`);
        }

        // Trends chunk
        if (analysisResult.trends && Object.keys(analysisResult.trends).length > 0) {
            const trendsText = Object.entries(analysisResult.trends)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
            chunks.push(`TRENDLER: ${trendsText}`);
        }

        // Risks and opportunities chunk
        const riskOppText = [];
        if (analysisResult.riskFactors?.length > 0) {
            riskOppText.push(`RİSKLER: ${analysisResult.riskFactors.join('. ')}`);
        }
        if (analysisResult.opportunities?.length > 0) {
            riskOppText.push(`FIRSATLAR: ${analysisResult.opportunities.join('. ')}`);
        }
        if (riskOppText.length > 0) {
            chunks.push(riskOppText.join(' | '));
        }

        // Sections chunks
        if (analysisResult.sections) {
            Object.entries(analysisResult.sections).forEach(([section, content]) => {
                if (content && typeof content === 'string' && content.length > 50) {
                    chunks.push(`${section.toUpperCase()}: ${content}`);
                }
            });
        }

        // Extracted data chunks
        if (analysisResult.extractedData) {
            Object.entries(analysisResult.extractedData).forEach(([key, value]) => {
                if (value && typeof value === 'string' && value.length > 50) {
                    chunks.push(`${key.toUpperCase()}: ${value}`);
                } else if (value && typeof value === 'object') {
                    chunks.push(`${key.toUpperCase()}: ${JSON.stringify(value)}`);
                }
            });
        }

        return chunks.filter(chunk => chunk.length > 20);
    }

    /**
     * Get existing processed document
     */
    private static async getExistingProcessedDocument(pdfInfo: UploadedPDF): Promise<ProcessedDocument | null> {
        const docs = await ProcessedDocumentStorage.getProcessedDocumentsByCompany(pdfInfo.company || 'default');
        return docs.find(doc => doc.originalFilename === pdfInfo.filename) || null;
    }

    /**
     * Estimate processing cost
     */
    private static estimateProcessingCost(tokensUsed: number): number {
        // Enhanced processing typically uses more tokens
        return (tokensUsed * 0.25) / 1000000;
    }

    /**
     * Process multiple documents in batch
     */
    static async processBatch(pdfInfos: UploadedPDF[]): Promise<EnhancedProcessingResult[]> {
        console.log(`Starting enhanced batch processing of ${pdfInfos.length} documents`);
        const results: EnhancedProcessingResult[] = [];

        for (const pdfInfo of pdfInfos) {
            try {
                const result = await this.processDocument(pdfInfo);
                results.push(result);
                
                // Add delay between processing to avoid rate limits
                if (results.length < pdfInfos.length) {
                    console.log(`Waiting 3 seconds before processing next document...`);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            } catch (error) {
                console.error(`Enhanced batch processing failed for ${pdfInfo.filename}:`, error);
                results.push({
                    success: false,
                    error: (error as Error).message,
                    processingTimeMs: 0,
                    tokensUsed: 0
                });
            }
        }

        const successful = results.filter(r => r.success).length;
        console.log(`Enhanced batch processing completed: ${successful}/${pdfInfos.length} successful`);

        return results;
    }
}