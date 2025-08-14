import { NextRequest, NextResponse } from 'next/server';
import { SimpleRetrieval } from '../../lib/simple-retrieval';
import { ProcessedDocumentStorage } from '../../lib/processed-docs';
import { analyzeWithClaude, detectLanguage } from '../../lib/antrophic';
import { AnalysisRequest } from '../../lib/types';

export async function POST(request: NextRequest) {
    try {
        console.log('=== ENHANCED OPTIMIZED ANALYZE API CALLED ===');

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

        // Step 1: Get all processed documents and prioritize enhanced versions
        console.log('Getting processed documents...');
        const allDocs = await ProcessedDocumentStorage.getAllProcessedDocuments();
        
        // Separate enhanced and simple versions
        const enhancedDocs = allDocs.filter(doc => doc.processingVersion === '2.0-enhanced');
        const simpleDocs = allDocs.filter(doc => doc.processingVersion !== '2.0-enhanced');
        
        console.log(`Found ${enhancedDocs.length} enhanced docs and ${simpleDocs.length} simple docs`);

        if (allDocs.length === 0) {
            return NextResponse.json(
                { 
                    error: language === 'tr' 
                        ? 'Hiç işlenmiş doküman bulunamadı. Lütfen önce dokümanları işletiniz.' 
                        : 'No processed documents found. Please process documents first.',
                    suggestion: language === 'tr'
                        ? 'Dokümanları işlemek için /api/process-enhanced endpoint\'ini kullanın'
                        : 'Use /api/process-enhanced endpoint to process documents first'
                },
                { status: 400 }
            );
        }

        // Step 2: Use simple retrieval to get relevant content
        const retrievalResult = await SimpleRetrieval.retrieveRelevantContent({
            question,
            maxResults: 15
        });

        console.log('Retrieval completed:', {
            relevantDocuments: retrievalResult.relevantDocuments.length,
            relevantChunks: retrievalResult.relevantChunks.length
        });

        // Step 3: Build comprehensive context from available data
        const retrievedContext = buildEnhancedContextFromRetrieval(retrievalResult, enhancedDocs, simpleDocs, language);

        // Step 4: Generate analysis using Claude with rich pre-processed context
        console.log('Generating analysis with Claude using enhanced data...');
        const analysisResult = await analyzeWithClaude(
            { 
                question, 
                context: `${context || ''}\n\n${retrievedContext}` 
            },
            [] // No PDF files needed - using pre-processed content
        );

        console.log('Analysis completed');

        // Step 5: Prepare enhanced response with metadata
        const response = {
            success: true,
            ...analysisResult,
            optimized: true,
            enhanced: true,
            method: 'enhanced-optimized',
            dataQuality: {
                enhancedDocuments: enhancedDocs.length,
                simpleDocuments: simpleDocs.length,
                totalDocuments: allDocs.length,
                enhancedRatio: enhancedDocs.length / allDocs.length
            },
            retrievalInfo: {
                documentsUsed: retrievalResult.relevantDocuments.length,
                chunksUsed: retrievalResult.relevantChunks.length,
                companies: [...new Set(retrievalResult.relevantDocuments.map(doc => doc.company))],
                documentTypes: [...new Set(retrievalResult.relevantDocuments.map(doc => doc.documentType).filter(Boolean))],
                timeRange: getTimeRange(retrievalResult.relevantDocuments),
                retrievalTimeMs: retrievalResult.processingTimeMs,
                enhancedDocsUsed: retrievalResult.relevantDocuments.filter(doc => doc.processingVersion === '2.0-enhanced').length
            },
            timestamp: new Date().toISOString()
        };

        console.log('Sending enhanced optimized analysis response');
        return NextResponse.json(response);

    } catch (error) {
        console.error('=== ENHANCED OPTIMIZED ANALYZE API ERROR ===');
        console.error('Full error:', error);

        return NextResponse.json(
            { error: 'Enhanced optimized analysis failed: ' + (error as Error).message },
            { status: 500 }
        );
    }
}

/**
 * Build comprehensive context from enhanced and simple documents
 */
function buildEnhancedContextFromRetrieval(retrievalResult: any, enhancedDocs: any[], simpleDocs: any[], language: 'tr' | 'en'): string {
    const { relevantDocuments, relevantChunks } = retrievalResult;

    let context = language === 'tr' 
        ? '=== GELİŞMİŞ ÖNCELİKLE İŞLENMİŞ VERİLER ===\n\n'
        : '=== ENHANCED PRE-PROCESSED DATA ===\n\n';

    // Prioritize enhanced documents
    const enhancedRelevantDocs = relevantDocuments.filter((doc: any) => doc.processingVersion === '2.0-enhanced');
    const simpleRelevantDocs = relevantDocuments.filter((doc: any) => doc.processingVersion !== '2.0-enhanced');

    // Add enhanced document summaries first
    if (enhancedRelevantDocs.length > 0) {
        context += language === 'tr' 
            ? '## GELİŞMİŞ DOKÜMAN ANALİZLERİ (Yüksek Kalite):\n\n'
            : '## ENHANCED DOCUMENT ANALYSES (High Quality):\n\n';

        for (const doc of enhancedRelevantDocs.slice(0, 8)) {
            context += `**${doc.company} - ${doc.originalFilename}** (${doc.year || 'N/A'} ${doc.quarter || ''})\n`;
            context += `${language === 'tr' ? 'Güven Skoru' : 'Confidence'}: ${(doc.confidence.overall * 100).toFixed(0)}%\n`;
            context += `${language === 'tr' ? 'Özet' : 'Summary'}: ${doc.summary}\n`;
            
            if (doc.keyInsights.length > 0) {
                context += `${language === 'tr' ? 'Ana Bulgular' : 'Key Insights'}: ${doc.keyInsights.join('; ')}\n`;
            }
            
            if (Object.keys(doc.keyMetrics).length > 0) {
                const metricsText = Object.entries(doc.keyMetrics)
                    .filter(([key, value]) => value !== null && value !== undefined && value !== '')
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ');
                if (metricsText) {
                    context += `${language === 'tr' ? 'Finansal Metrikler' : 'Financial Metrics'}: ${metricsText}\n`;
                }
            }
            
            if (Object.keys(doc.trends).length > 0) {
                const trendsText = Object.entries(doc.trends)
                    .filter(([key, value]) => value !== null && value !== undefined && value !== '')
                    .map(([key, value]) => `${key}: ${typeof value === 'number' ? (value * 100).toFixed(1) + '%' : value}`)
                    .join(', ');
                if (trendsText) {
                    context += `${language === 'tr' ? 'Trendler' : 'Trends'}: ${trendsText}\n`;
                }
            }
            
            if (doc.riskFactors.length > 0) {
                context += `${language === 'tr' ? 'Risk Faktörleri' : 'Risk Factors'}: ${doc.riskFactors.join('; ')}\n`;
            }
            
            if (doc.opportunities.length > 0) {
                context += `${language === 'tr' ? 'Fırsatlar' : 'Opportunities'}: ${doc.opportunities.join('; ')}\n`;
            }
            
            context += '\n';
        }
    }

    // Add simple document summaries if needed
    if (simpleRelevantDocs.length > 0 && enhancedRelevantDocs.length < 5) {
        context += language === 'tr' 
            ? '## EK DOKÜMAN BİLGİLERİ:\n\n'
            : '## ADDITIONAL DOCUMENT INFO:\n\n';

        for (const doc of simpleRelevantDocs.slice(0, 3)) {
            context += `**${doc.company} - ${doc.originalFilename}** (${doc.year || 'N/A'} ${doc.quarter || ''})\n`;
            context += `${language === 'tr' ? 'Özet' : 'Summary'}: ${doc.summary}\n\n`;
        }
    }

    // Add data coverage summary
    const companies = [...new Set(relevantDocuments.map((doc: any) => doc.company))];
    const years = [...new Set(relevantDocuments.map((doc: any) => doc.year).filter(Boolean))];
    const enhancedCount = enhancedRelevantDocs.length;
    const simpleCount = simpleRelevantDocs.length;
    
    context += language === 'tr' 
        ? `\n## VERİ KAPSAMI VE KALİTESİ:\n`
        : `\n## DATA COVERAGE AND QUALITY:\n`;
    context += `${language === 'tr' ? 'Şirket' : 'Company'}: ${companies.join(', ')}\n`;
    if (years.length > 0) {
        context += `${language === 'tr' ? 'Yıl Aralığı' : 'Year Range'}: ${Math.min(...years)} - ${Math.max(...years)}\n`;
    }
    context += `${language === 'tr' ? 'Yüksek Kalite Doküman' : 'High Quality Documents'}: ${enhancedCount}\n`;
    context += `${language === 'tr' ? 'Standart Doküman' : 'Standard Documents'}: ${simpleCount}\n`;
    context += `${language === 'tr' ? 'Toplam Doküman' : 'Total Documents'}: ${relevantDocuments.length}\n`;

    // Add important note about data quality
    if (enhancedCount > 0) {
        context += language === 'tr' 
            ? '\n💡 NOT: Bu analiz yüksek kalite veri çıkarımı ile zenginleştirilmiştir.\n'
            : '\n💡 NOTE: This analysis is enriched with high-quality data extraction.\n';
    }

    context += language === 'tr' 
        ? '\n=== YUKARIDA VERİLEN KAPSAMLI BİLGİLERE DAYANARAK DETAYLI CEVAP VER ===\n\n'
        : '\n=== PROVIDE DETAILED ANSWER BASED ON THE COMPREHENSIVE INFORMATION ABOVE ===\n\n';

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

// GET endpoint for status
export async function GET(request: NextRequest) {
    try {
        const stats = await ProcessedDocumentStorage.getProcessingStats();
        const allDocs = await ProcessedDocumentStorage.getAllProcessedDocuments();
        const enhancedDocs = allDocs.filter(doc => doc.processingVersion === '2.0-enhanced');
        
        return NextResponse.json({
            success: true,
            status: 'ready',
            method: 'enhanced-optimized',
            dataQuality: {
                enhancedDocuments: enhancedDocs.length,
                simpleDocuments: allDocs.length - enhancedDocs.length,
                totalDocuments: allDocs.length,
                enhancedRatio: allDocs.length > 0 ? enhancedDocs.length / allDocs.length : 0
            },
            processingStats: stats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Enhanced optimized GET request error:', error);
        return NextResponse.json(
            { error: 'Failed to get status: ' + (error as Error).message },
            { status: 500 }
        );
    }
}