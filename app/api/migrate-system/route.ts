import { NextRequest, NextResponse } from 'next/server';
import { ProcessedDocumentStorage } from '../../lib/processed-docs';
import { IntelligentRetrieval } from '../../lib/intelligent-retrieval';

// Import the original analyze function
import { analyzeWithClaude } from '../../lib/antrophic';
import { getAllPDFs } from '../../lib/pdf-handler';
import { selectDocumentsWithIntelligentFiltering } from '../../lib/document-selector';
import { AnalysisRequest } from '../../lib/types';

export async function POST(request: NextRequest) {
    try {
        console.log('=== MIGRATION API CALLED ===');

        const body = await request.json();
        const { question, context, useOptimized = true, compareResults = false } = body;

        console.log('Migration request:', { question, useOptimized, compareResults });

        if (!question || !question.trim()) {
            return NextResponse.json(
                { error: 'Question is required' },
                { status: 400 }
            );
        }

        const results: any = {
            question,
            timestamp: new Date().toISOString()
        };

        // Check if we have processed documents
        const processedStats = await ProcessedDocumentStorage.getProcessingStats();
        const hasProcessedData = processedStats.totalProcessed > 0;

        results.systemStatus = {
            hasProcessedData,
            totalProcessedDocuments: processedStats.totalProcessed,
            companiesProcessed: processedStats.companiesProcessed
        };

        if (compareResults && hasProcessedData) {
            // Run both systems in parallel for comparison
            console.log('Running parallel comparison...');

            const [optimizedResult, originalResult] = await Promise.allSettled([
                runOptimizedAnalysis(question, context),
                runOriginalAnalysis(question, context)
            ]);

            results.comparison = {
                optimized: optimizedResult.status === 'fulfilled' ? optimizedResult.value : { error: (optimizedResult as any).reason.message },
                original: originalResult.status === 'fulfilled' ? originalResult.value : { error: (originalResult as any).reason.message }
            };

            // Calculate performance metrics
            if (optimizedResult.status === 'fulfilled' && originalResult.status === 'fulfilled') {
                const optimizedTime = optimizedResult.value.processingTimeMs || 0;
                const originalTime = originalResult.value.processingTimeMs || 0;
                
                results.performanceMetrics = {
                    speedImprovement: originalTime > 0 ? ((originalTime - optimizedTime) / originalTime * 100).toFixed(1) + '%' : 'N/A',
                    optimizedTimeMs: optimizedTime,
                    originalTimeMs: originalTime,
                    timeSaved: originalTime - optimizedTime
                };
            }

            results.recommendation = hasProcessedData ? 'optimized' : 'original';
            results.success = true;

        } else if (useOptimized && hasProcessedData) {
            // Use optimized system only
            console.log('Using optimized analysis...');
            
            const optimizedResult = await runOptimizedAnalysis(question, context);
            results.analysis = optimizedResult;
            results.method = 'optimized';
            results.success = true;

        } else {
            // Use original system only
            console.log('Using original analysis...');
            
            const originalResult = await runOriginalAnalysis(question, context);
            results.analysis = originalResult;
            results.method = 'original';
            results.reason = hasProcessedData ? 'user preference' : 'no processed data available';
            results.success = true;
        }

        console.log('Migration response prepared');
        return NextResponse.json(results);

    } catch (error) {
        console.error('=== MIGRATION API ERROR ===');
        console.error('Error:', error);

        return NextResponse.json(
            { error: 'Migration analysis failed: ' + (error as Error).message },
            { status: 500 }
        );
    }
}

async function runOptimizedAnalysis(question: string, context?: string) {
    const startTime = Date.now();

    try {
        // Use intelligent retrieval
        const retrievalResult = await IntelligentRetrieval.retrieveRelevantContent({
            question,
            maxResults: 10,
            similarityThreshold: 0.6
        });

        if (retrievalResult.relevantDocuments.length === 0 && retrievalResult.relevantChunks.length === 0) {
            throw new Error('No processed data found for this question');
        }

        // Build context from retrieval
        const retrievedContext = buildOptimizedContext(retrievalResult);

        // Generate analysis using Claude with pre-processed context
        const analysisResult = await analyzeWithClaude(
            { 
                question, 
                context: `${context || ''}\n\n${retrievedContext}` 
            },
            [] // No PDF files needed
        );

        return {
            ...analysisResult,
            method: 'optimized',
            processingTimeMs: Date.now() - startTime,
            retrievalInfo: {
                documentsUsed: retrievalResult.relevantDocuments.length,
                chunksUsed: retrievalResult.relevantChunks.length,
                companies: [...new Set(retrievalResult.relevantDocuments.map(doc => doc.company))],
                retrievalTimeMs: retrievalResult.processingTimeMs
            }
        };

    } catch (error) {
        return {
            error: (error as Error).message,
            method: 'optimized',
            processingTimeMs: Date.now() - startTime
        };
    }
}

async function runOriginalAnalysis(question: string, context?: string) {
    const startTime = Date.now();

    try {
        // Use original system logic (from analyze/route.ts)
        const allPDFs = await getAllPDFs();
        
        if (allPDFs.length === 0) {
            throw new Error('No PDF files available for analysis');
        }

        // Use intelligent document selection
        const maxPages = parseInt(process.env.MAX_PAGES_PER_QUERY || '100');
        const selectionResult = selectDocumentsWithIntelligentFiltering(allPDFs, question, maxPages);
        const filesToAnalyze = selectionResult.selectedPDFs;

        // Prepare PDF file paths for Claude
        const pdfFiles = filesToAnalyze.map(pdf => ({
            filename: pdf.filename,
            filepath: require('path').join(process.env.UPLOAD_DIR || './uploads', 'companies', pdf.company || 'default', pdf.filename),
            company: pdf.company
        }));

        // Analyze with Claude - send PDFs directly
        const analysisResult = await analyzeWithClaude(
            { question, context },
            pdfFiles
        );

        return {
            ...analysisResult,
            method: 'original',
            processingTimeMs: Date.now() - startTime,
            filesAnalyzed: pdfFiles.length,
            totalFilesAvailable: allPDFs.length,
            selectionInfo: {
                totalScore: selectionResult.totalScore,
                reasons: selectionResult.selectionReasons,
                droppedCount: selectionResult.droppedPDFs.length
            }
        };

    } catch (error) {
        return {
            error: (error as Error).message,
            method: 'original',
            processingTimeMs: Date.now() - startTime
        };
    }
}

function buildOptimizedContext(retrievalResult: any): string {
    const { relevantDocuments, relevantChunks } = retrievalResult;

    let context = '=== PRE-PROCESSED DATA ===\n\n';

    // Add document summaries
    if (relevantDocuments.length > 0) {
        context += '## DOCUMENT SUMMARIES:\n\n';

        for (const doc of relevantDocuments.slice(0, 5)) {
            context += `**${doc.company} - ${doc.originalFilename}** (${doc.year || 'N/A'} ${doc.quarter || ''})\n`;
            context += `Summary: ${doc.summary}\n`;
            
            if (doc.keyInsights.length > 0) {
                context += `Key Insights: ${doc.keyInsights.join('; ')}\n`;
            }
            
            if (Object.keys(doc.keyMetrics).length > 0) {
                context += `Key Metrics: ${JSON.stringify(doc.keyMetrics)}\n`;
            }
            
            context += '\n';
        }
    }

    // Add relevant chunks
    if (relevantChunks.length > 0) {
        context += '## RELEVANT CONTENT SECTIONS:\n\n';

        for (const chunk of relevantChunks.slice(0, 10)) {
            context += `**${chunk.source.company}/${chunk.source.filename}** (Similarity: ${(chunk.similarity * 100).toFixed(1)}%)\n`;
            context += `${chunk.content}\n\n`;
        }
    }

    context += '=== ANSWER BASED ON THE ABOVE INFORMATION ===\n\n';

    return context;
}

// GET endpoint for system status and migration planning
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action') || 'status';

        if (action === 'status') {
            const processedStats = await ProcessedDocumentStorage.getProcessingStats();
            const hasProcessedData = processedStats.totalProcessed > 0;

            // Get processing coverage
            const allPDFs = await getAllPDFs();
            const processedDocuments = await ProcessedDocumentStorage.getAllProcessedDocuments();
            
            const processingCoverage = allPDFs.length > 0 
                ? (processedDocuments.length / allPDFs.length * 100).toFixed(1) + '%'
                : '0%';

            return NextResponse.json({
                success: true,
                systemStatus: {
                    hasProcessedData,
                    processingCoverage,
                    totalPDFs: allPDFs.length,
                    processedDocuments: processedDocuments.length,
                    unprocessedDocuments: allPDFs.length - processedDocuments.length
                },
                recommendation: {
                    useOptimized: hasProcessedData,
                    reason: hasProcessedData 
                        ? 'Processed data available for faster analysis' 
                        : 'No processed data - use original system or process documents first',
                    migrationReady: hasProcessedData
                },
                processingStats: processedStats,
                timestamp: new Date().toISOString()
            });
        }

        if (action === 'readiness') {
            // Check migration readiness
            const processedStats = await ProcessedDocumentStorage.getProcessingStats();
            const allPDFs = await getAllPDFs();
            
            const readinessScore = calculateReadinessScore(processedStats, allPDFs.length);

            return NextResponse.json({
                success: true,
                readinessScore,
                migrationReady: readinessScore >= 0.7,
                recommendations: getReadinessRecommendations(readinessScore, processedStats, allPDFs.length),
                timestamp: new Date().toISOString()
            });
        }

        return NextResponse.json(
            { error: 'Invalid action. Use: status, readiness' },
            { status: 400 }
        );

    } catch (error) {
        console.error('GET request error:', error);
        return NextResponse.json(
            { error: 'Failed to get migration status: ' + (error as Error).message },
            { status: 500 }
        );
    }
}

function calculateReadinessScore(processedStats: any, totalPDFs: number): number {
    if (totalPDFs === 0) return 0;
    
    const coverageScore = Math.min(processedStats.totalProcessed / totalPDFs, 1.0) * 0.5;
    const qualityScore = processedStats.totalProcessed > 0 ? 0.3 : 0;
    const volumeScore = Math.min(processedStats.totalProcessed / 10, 1.0) * 0.2;
    
    return coverageScore + qualityScore + volumeScore;
}

function getReadinessRecommendations(score: number, processedStats: any, totalPDFs: number): string[] {
    const recommendations = [];
    
    if (score < 0.3) {
        recommendations.push('Process more documents to improve system performance');
        recommendations.push('Start with high-priority documents first');
    } else if (score < 0.7) {
        recommendations.push('Good progress - process remaining documents for full coverage');
        recommendations.push('Consider using hybrid approach during transition');
    } else {
        recommendations.push('System ready for full migration to optimized analysis');
        recommendations.push('Monitor performance and adjust as needed');
    }
    
    if (totalPDFs - processedStats.totalProcessed > 0) {
        recommendations.push(`${totalPDFs - processedStats.totalProcessed} documents remaining to process`);
    }
    
    return recommendations;
}