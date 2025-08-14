import { NextRequest, NextResponse } from 'next/server';
import { SimpleRetrieval } from '../../lib/simple-retrieval';
import { analyzeWithClaude, detectLanguage } from '../../lib/antrophic';
import { AnalysisRequest } from '../../lib/types';

export async function POST(request: NextRequest) {
    try {
        console.log('=== SIMPLE OPTIMIZED ANALYZE API CALLED ===');

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

        // Step 1: Use simple retrieval to get relevant pre-processed content
        console.log('Starting simple retrieval...');
        const retrievalResult = await SimpleRetrieval.retrieveRelevantContent({
            question,
            maxResults: 10
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
                        ? 'Dokümanları işlemek için /api/process-simple endpoint\'ini kullanın'
                        : 'Use /api/process-simple endpoint to process documents first'
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
            method: 'simple',
            retrievalInfo: {
                documentsUsed: retrievalResult.relevantDocuments.length,
                chunksUsed: retrievalResult.relevantChunks.length,
                companies: [...new Set(retrievalResult.relevantDocuments.map(doc => doc.company))],
                documentTypes: [...new Set(retrievalResult.relevantDocuments.map(doc => doc.documentType).filter(Boolean))],
                timeRange: getTimeRange(retrievalResult.relevantDocuments),
                retrievalTimeMs: retrievalResult.processingTimeMs
            },
            timestamp: new Date().toISOString()
        };

        console.log('Sending simple optimized analysis response');
        return NextResponse.json(response);

    } catch (error) {
        console.error('=== SIMPLE OPTIMIZED ANALYZE API ERROR ===');
        console.error('Full error:', error);
        console.error('Error message:', (error as Error).message);

        return NextResponse.json(
            { error: 'Simple optimized analysis failed: ' + (error as Error).message },
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

    // Add relevant chunks (if any have meaningful content)
    if (relevantChunks.length > 0) {
        context += language === 'tr' 
            ? '## İLGİLİ İÇERİK BÖLÜMLERI:\n\n'
            : '## RELEVANT CONTENT SECTIONS:\n\n';

        for (const chunk of relevantChunks.slice(0, 5)) { // Limit to top 5 chunks
            // Skip chunks that are just error messages
            if (!chunk.content.includes('Unable to extract text content')) {
                context += `**${chunk.company}/${chunk.filename}**\n`;
                context += `${chunk.content.substring(0, 300)}...\n\n`;
            }
        }
    }

    // Add company and time period info
    if (relevantDocuments.length > 0) {
        const companies = [...new Set(relevantDocuments.map(doc => doc.company))];
        const years = [...new Set(relevantDocuments.map(doc => doc.year).filter(Boolean))];
        
        context += language === 'tr' 
            ? `\n## MEVCUT VERİ KAPSAMI:\n`
            : `\n## AVAILABLE DATA COVERAGE:\n`;
        context += `${language === 'tr' ? 'Şirket' : 'Company'}: ${companies.join(', ')}\n`;
        if (years.length > 0) {
            context += `${language === 'tr' ? 'Yıllar' : 'Years'}: ${Math.min(...years)} - ${Math.max(...years)}\n`;
        }
        context += `${language === 'tr' ? 'Toplam Doküman' : 'Total Documents'}: ${relevantDocuments.length}\n`;
    }

    context += language === 'tr' 
        ? '\n=== YUKARIDA VERİLEN BİLGİLERE DAYANARAK CEVAP VER ===\n\n'
        : '\n=== ANSWER BASED ON THE ABOVE INFORMATION ===\n\n';

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

// GET endpoint for testing and status
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action') || 'status';

        if (action === 'status') {
            // Check if system is ready for simple optimized analysis
            const { ProcessedDocumentStorage } = await import('../../lib/processed-docs');
            const stats = await ProcessedDocumentStorage.getProcessingStats();
            
            return NextResponse.json({
                success: true,
                status: 'ready',
                method: 'simple-optimized',
                processedDocuments: stats.totalProcessed,
                companiesAvailable: stats.companiesProcessed.length,
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
                    const summary = await SimpleRetrieval.getCompanyContentSummary(company);
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