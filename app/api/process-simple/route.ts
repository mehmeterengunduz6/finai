import { NextRequest, NextResponse } from 'next/server';
import { getAllPDFs } from '../../lib/pdf-handler';
import { SimpleDocumentProcessor } from '../../lib/simple-processor';
import { ProcessedDocumentStorage } from '../../lib/processed-docs';

export async function POST(request: NextRequest) {
    try {
        console.log('=== SIMPLE DOCUMENT PROCESSING API CALLED ===');
        
        const body = await request.json();
        const { action, company, filename } = body;

        switch (action) {
            case 'process_single':
                return await processSingleDocument(company, filename);
            
            case 'process_batch':
                return await processBatchDocuments(company);
            
            case 'process_all':
                return await processAllDocuments();
            
            case 'stats':
                return await getProcessedStats();
            
            default:
                return NextResponse.json(
                    { error: 'Invalid action. Use: process_single, process_batch, process_all, stats' },
                    { status: 400 }
                );
        }

    } catch (error) {
        console.error('=== SIMPLE PROCESSING API ERROR ===');
        console.error('Error:', error);

        return NextResponse.json(
            { error: 'Simple processing failed: ' + (error as Error).message },
            { status: 500 }
        );
    }
}

async function processSingleDocument(company: string, filename: string) {
    try {
        if (!company || !filename) {
            return NextResponse.json(
                { error: 'Company and filename are required' },
                { status: 400 }
            );
        }

        // Get PDF info
        const allPDFs = await getAllPDFs(company);
        const pdfInfo = allPDFs.find(pdf => pdf.filename === filename);

        if (!pdfInfo) {
            return NextResponse.json(
                { error: 'PDF not found' },
                { status: 404 }
            );
        }

        // Process document
        const result = await SimpleDocumentProcessor.processDocument(pdfInfo);

        return NextResponse.json({
            success: true,
            result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Single document processing error:', error);
        return NextResponse.json(
            { error: 'Failed to process document: ' + (error as Error).message },
            { status: 500 }
        );
    }
}

async function processBatchDocuments(company: string | undefined) {
    try {
        // Get PDFs to process
        const allPDFs = company ? await getAllPDFs(company) : await getAllPDFs();
        
        if (allPDFs.length === 0) {
            return NextResponse.json(
                { error: 'No PDFs found to process' },
                { status: 400 }
            );
        }

        console.log(`Found ${allPDFs.length} total PDFs`);

        // Filter out already processed documents
        const unprocessedPDFs = [];
        for (const pdf of allPDFs) {
            const isProcessed = await ProcessedDocumentStorage.isDocumentProcessed(
                pdf.filename,
                pdf.company || 'default'
            );
            if (!isProcessed) {
                unprocessedPDFs.push(pdf);
            }
        }

        console.log(`Found ${unprocessedPDFs.length} unprocessed PDFs`);

        if (unprocessedPDFs.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'All documents are already processed',
                totalDocuments: allPDFs.length,
                alreadyProcessed: allPDFs.length,
                processed: 0
            });
        }

        // Process documents
        const results = await SimpleDocumentProcessor.processBatch(unprocessedPDFs);

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success);

        return NextResponse.json({
            success: true,
            results,
            summary: {
                totalDocuments: allPDFs.length,
                processed: successful,
                failed: failed.length,
                alreadyProcessed: allPDFs.length - unprocessedPDFs.length,
                totalProcessingTime: results.reduce((sum, r) => sum + r.processingTimeMs, 0),
                totalTokensUsed: results.reduce((sum, r) => sum + r.tokensUsed, 0)
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Batch processing error:', error);
        return NextResponse.json(
            { error: 'Failed to process batch: ' + (error as Error).message },
            { status: 500 }
        );
    }
}

async function processAllDocuments() {
    return await processBatchDocuments(undefined);
}

async function getProcessedStats() {
    try {
        const stats = await ProcessedDocumentStorage.getProcessingStats();
        const { SimpleStorageService } = await import('../../lib/simple-storage');
        const embeddingCount = SimpleStorageService.getEmbeddingCount();

        return NextResponse.json({
            success: true,
            processingStats: stats,
            storageStats: {
                totalEmbeddings: embeddingCount
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Stats error:', error);
        return NextResponse.json(
            { error: 'Failed to get stats: ' + (error as Error).message },
            { status: 500 }
        );
    }
}

// GET endpoint for status checks
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action') || 'status';

        if (action === 'status') {
            const stats = await ProcessedDocumentStorage.getProcessingStats();
            
            return NextResponse.json({
                success: true,
                status: 'ready',
                method: 'simple',
                processingStats: stats,
                timestamp: new Date().toISOString()
            });
        }

        return NextResponse.json(
            { error: 'Invalid action for GET request' },
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