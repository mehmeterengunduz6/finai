import { NextRequest, NextResponse } from 'next/server';
import { getAllPDFs } from '../../lib/pdf-handler';
import { DocumentProcessor } from '../../lib/document-processor';
import { ProcessingQueueManager, ProcessedDocumentStorage } from '../../lib/processed-docs';
import { vectorDB } from '../../lib/vector-db';

export async function POST(request: NextRequest) {
    try {
        console.log('=== DOCUMENT PROCESSING API CALLED ===');
        
        const body = await request.json();
        const { action, company, filename, options = {} } = body;

        switch (action) {
            case 'process_single':
                return await processSingleDocument(company, filename, options);
            
            case 'process_batch':
                return await processBatchDocuments(company, options);
            
            case 'process_all':
                return await processAllDocuments(options);
            
            case 'queue_status':
                return await getQueueStatus();
            
            case 'processed_stats':
                return await getProcessedStats();
            
            default:
                return NextResponse.json(
                    { error: 'Invalid action. Use: process_single, process_batch, process_all, queue_status, processed_stats' },
                    { status: 400 }
                );
        }

    } catch (error) {
        console.error('=== DOCUMENT PROCESSING API ERROR ===');
        console.error('Error:', error);

        return NextResponse.json(
            { error: 'Document processing failed: ' + (error as Error).message },
            { status: 500 }
        );
    }
}

async function processSingleDocument(company: string, filename: string, options: any) {
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

        // Initialize vector DB
        await vectorDB.initialize();

        // Process document
        const result = await DocumentProcessor.processDocument(pdfInfo, options);

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

async function processBatchDocuments(company: string | undefined, options: any) {
    try {
        // Get PDFs to process
        const allPDFs = company ? await getAllPDFs(company) : await getAllPDFs();
        
        if (allPDFs.length === 0) {
            return NextResponse.json(
                { error: 'No PDFs found to process' },
                { status: 400 }
            );
        }

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

        if (unprocessedPDFs.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'All documents are already processed',
                totalDocuments: allPDFs.length,
                alreadyProcessed: allPDFs.length,
                processed: 0
            });
        }

        // Add to processing queue instead of processing immediately for large batches
        if (unprocessedPDFs.length > 5) {
            const queueIds = [];
            for (const pdf of unprocessedPDFs) {
                const queueId = await ProcessingQueueManager.addToQueue({
                    filename: pdf.filename,
                    company: pdf.company || 'default',
                    priority: 'medium',
                    status: 'pending'
                });
                queueIds.push(queueId);
            }

            return NextResponse.json({
                success: true,
                message: `Added ${unprocessedPDFs.length} documents to processing queue`,
                queueIds,
                totalDocuments: allPDFs.length,
                addedToQueue: unprocessedPDFs.length
            });
        }

        // Process small batches immediately
        await vectorDB.initialize();
        const results = await DocumentProcessor.processBatch(unprocessedPDFs, options);

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
                totalTokensUsed: results.reduce((sum, r) => sum + r.tokensUsed, 0),
                estimatedCost: results.reduce((sum, r) => sum + (r.costEstimate || 0), 0)
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

async function processAllDocuments(options: any) {
    return await processBatchDocuments(undefined, options);
}

async function getQueueStatus() {
    try {
        const queue = await ProcessingQueueManager.getQueue();
        const stats = {
            total: queue.length,
            pending: queue.filter(item => item.status === 'pending').length,
            processing: queue.filter(item => item.status === 'processing').length,
            completed: queue.filter(item => item.status === 'completed').length,
            failed: queue.filter(item => item.status === 'failed').length
        };

        return NextResponse.json({
            success: true,
            queue: queue.slice(0, 50), // Return only first 50 items
            stats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Queue status error:', error);
        return NextResponse.json(
            { error: 'Failed to get queue status: ' + (error as Error).message },
            { status: 500 }
        );
    }
}

async function getProcessedStats() {
    try {
        const stats = await ProcessedDocumentStorage.getProcessingStats();
        const vectorStats = {
            totalEmbeddings: await vectorDB.getDocumentCount()
        };

        return NextResponse.json({
            success: true,
            processingStats: stats,
            vectorStats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Processed stats error:', error);
        return NextResponse.json(
            { error: 'Failed to get processed stats: ' + (error as Error).message },
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
            const queueStats = await ProcessingQueueManager.getQueue();
            
            return NextResponse.json({
                success: true,
                status: 'ready',
                processingStats: stats,
                queueSize: queueStats.length,
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