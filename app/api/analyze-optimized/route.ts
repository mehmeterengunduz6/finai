import { NextRequest, NextResponse } from 'next/server';
import { IntelligentRetrieval } from '../../lib/intelligent-retrieval';
import { analyzeWithClaude, detectLanguage } from '../../lib/antrophic';
import { AnalysisRequest } from '../../lib/types';

export async function POST(request: NextRequest) {
    try {
        console.log('=== OPTIMIZED ANALYZE API CALLED ===');

        const body: AnalysisRequest = await request.json();
        const { question, context } = body;

        console.log('Request body:', { question, context });

        if (!question || !question.trim()) {
            console.log('ERROR: No question provided');
            return NextResponse.json(
                { error: 'Question is required' },
                { status: 400 }
            );
        }

        // Detect language for response
        const language = detectLanguage(question);
        console.log('Detected language:', language);

        // Step 1: Use intelligent retrieval to get relevant pre-processed content
        console.log('Starting intelligent retrieval...');
        const retrievalResult = await IntelligentRetrieval.retrieveRelevantContent({
            question,
            maxResults: 10,
            similarityThreshold: 0.6
        });

        console.log('Retrieval completed:', {
            relevantDocuments: retrievalResult.relevantDocuments.length,
            relevantChunks: retrievalResult.relevantChunks.length,
            processingTimeMs: retrievalResult.processingTimeMs
        });

        if (retrievalResult.relevantDocuments.length === 0 && retrievalResult.relevantChunks.length === 0) {
            return NextResponse.json(
                { 
                    error: language === 'tr' 
                        ? 'Bu soru için işlenmiş veri bulunamadı. Lütfen önce dokümanları işletiniz.' 
                        : 'No processed data found for this question. Please process documents first.',
                    suggestion: language === 'tr'
                        ? 'Dokümanları işlemek için /api/process-documents endpoint\'ini kullanın'
                        : 'Use /api/process-documents endpoint to process documents first'
                },
                { status: 400 }
            );
        }

        // Step 2: Prepare context from retrieved content
        const retrievedContext = buildContextFromRetrieval(retrievalResult, language);

        // Step 3: Generate analysis using Claude with pre-processed context
        console.log('Generating analysis with Claude...');
        const analysisResult = await analyzeWithClaude(
            { 
                question, 
                context: `${context || ''}\n\n${retrievedContext}` 
            },
            [] // No PDF files needed - using pre-processed content
        );

        console.log('Analysis completed');

        // Step 4: Prepare response with metadata about the retrieval
        const response = {
            success: true,
            ...analysisResult,
            optimized: true,
            retrievalInfo: {
                documentsUsed: retrievalResult.relevantDocuments.length,
                chunksUsed: retrievalResult.relevantChunks.length,
                companies: [...new Set(retrievalResult.relevantDocuments.map(doc => doc.company))],
                documentTypes: [...new Set(retrievalResult.relevantDocuments.map(doc => doc.documentType).filter(Boolean))],
                timeRange: getTimeRange(retrievalResult.relevantDocuments),
                retrievalTimeMs: retrievalResult.processingTimeMs,
                averageSimilarity: calculateAverageSimilarity(retrievalResult.relevantChunks)
            },
            timestamp: new Date().toISOString()
        };

        console.log('Sending optimized analysis response');
        return NextResponse.json(response);

    } catch (error) {
        console.error('=== OPTIMIZED ANALYZE API ERROR ===');
        console.error('Full error:', error);
        console.error('Error message:', (error as Error).message);
        console.error('Error stack:', (error as Error).stack);

        // More specific error messages
        if (error instanceof Error) {
            if (error.message.includes('API key')) {
                return NextResponse.json(
                    { error: 'AI service configuration error' },
                    { status: 500 }
                );
            }
            if (error.message.includes('rate limit')) {
                return NextResponse.json(
                    { error: 'Too many requests. Please try again later.' },
                    { status: 429 }
                );
            }
            if (error.message.includes('vector database') || error.message.includes('embedding')) {
                return NextResponse.json(
                    { 
                        error: 'Search service temporarily unavailable. Falling back to standard analysis.',
                        fallback: true
                    },
                    { status: 503 }
                );
            }
        }

        return NextResponse.json(
            { error: 'Optimized analysis failed: ' + (error as Error).message },
            { status: 500 }
        );
    }

}

/**
 * Build context string from retrieval results
 */
function buildContextFromRetrieval(retrievalResult: any, language: 'tr' | 'en'): string {
    const { relevantDocuments, relevantChunks } = retrievalResult;

    let context = language === 'tr' 
        ? '=== ÖNCELİKLE İŞLENMİŞ VERİLER ===\n\n'
        : '=== PRE-PROCESSED DATA ===\n\n';

    // Add document summaries
    if (relevantDocuments.length > 0) {
        context += language === 'tr' 
            ? '## DOKÜMAN ÖZETLERİ:\n\n'
            : '## DOCUMENT SUMMARIES:\n\n';

        for (const doc of relevantDocuments.slice(0, 5)) { // Limit to top 5 documents
            context += `**${doc.company} - ${doc.originalFilename}** (${doc.year || 'N/A'} ${doc.quarter || ''})\n`;
            context += `${language === 'tr' ? 'Özet' : 'Summary'}: ${doc.summary}\n`;
            
            if (doc.keyInsights.length > 0) {
                context += `${language === 'tr' ? 'Ana Bulgular' : 'Key Insights'}: ${doc.keyInsights.join('; ')}\n`;
            }
            
            if (Object.keys(doc.keyMetrics).length > 0) {
                context += `${language === 'tr' ? 'Ana Metrikler' : 'Key Metrics'}: ${JSON.stringify(doc.keyMetrics)}\n`;
            }
            
            context += '\n';
        }
    }

    // Add relevant chunks
    if (relevantChunks.length > 0) {
        context += language === 'tr' 
            ? '## İLGİLİ İÇERİK BÖLÜMLERI:\n\n'
            : '## RELEVANT CONTENT SECTIONS:\n\n';

        for (const chunk of relevantChunks.slice(0, 10)) { // Limit to top 10 chunks
            context += `**${chunk.source.company}/${chunk.source.filename}** (${language === 'tr' ? 'Benzerlik' : 'Similarity'}: ${(chunk.similarity * 100).toFixed(1)}%)\n`;
            context += `${chunk.content}\n\n`;
        }
    }

    context += language === 'tr' 
        ? '=== YUKARIDA VERİLEN BİLGİLERE DAYANARAK CEVAP VER ===\n\n'
        : '=== ANSWER BASED ON THE ABOVE INFORMATION ===\n\n';

    return context;
}

/**
 * Calculate time range from documents
 */
function getTimeRange(documents: any[]): { earliest?: number; latest?: number } | null {
    const years = documents.map(doc => doc.year).filter(Boolean);
    if (years.length === 0) return null;
    
    return {
        earliest: Math.min(...years),
        latest: Math.max(...years)
    };
}

/**
 * Calculate average similarity score
 */
function calculateAverageSimilarity(chunks: any[]): number {
    if (chunks.length === 0) return 0;
    
    const total = chunks.reduce((sum, chunk) => sum + chunk.similarity, 0);
    return total / chunks.length;
}

// GET endpoint for testing and status
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action') || 'status';

        if (action === 'status') {
            // Check if system is ready for optimized analysis
            const { ProcessedDocumentStorage } = await import('../../lib/processed-docs');
            const stats = await ProcessedDocumentStorage.getProcessingStats();
            
            return NextResponse.json({
                success: true,
                status: 'ready',
                optimizedAnalysis: true,
                processedDocuments: stats.totalProcessed,
                companiesAvailable: stats.companiesProcessed.length,
                averageProcessingTime: stats.averageProcessingTime,
                timestamp: new Date().toISOString()
            });
        }

        if (action === 'companies') {
            // Return available companies with their content summaries
            const { ProcessedDocumentStorage } = await import('../../lib/processed-docs');
            const allDocs = await ProcessedDocumentStorage.getAllProcessedDocuments();
            const companies = [...new Set(allDocs.map(doc => doc.company))];
            
            const companySummaries = await Promise.all(
                companies.map(async (company) => {
                    const summary = await IntelligentRetrieval.getCompanyContentSummary(company);
                    return { company, ...summary };
                })
            );

            return NextResponse.json({
                success: true,
                companies: companySummaries,
                totalCompanies: companies.length,
                timestamp: new Date().toISOString()
            });
        }

        return NextResponse.json(
            { error: 'Invalid action. Use: status, companies' },
            { status: 400 }
        );

    } catch (error) {
        console.error('GET request error:', error);
        return NextResponse.json(
            { error: 'Failed to get status: ' + (error as Error).message },
            { status: 500 }
        );
    }
}