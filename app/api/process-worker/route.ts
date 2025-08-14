import { NextRequest, NextResponse } from 'next/server';
import { ProcessingQueueManager, ProcessedDocumentStorage } from '../../lib/processed-docs';
import { DocumentProcessor } from '../../lib/document-processor';
import { getAllPDFs } from '../../lib/pdf-handler';
import { vectorDB } from '../../lib/vector-db';

export async function POST(request: NextRequest) {
    try {
        console.log('=== BACKGROUND PROCESSING WORKER CALLED ===');
        
        const body = await request.json();
        const { action = 'process_next', maxItems = 1 } = body;

        switch (action) {
            case 'process_next':
                return await processNextQueueItems(maxItems);
            
            case 'process_all_pending':
                return await processAllPending();
            
            case 'clear_completed':
                return await clearCompletedItems();
            
            default:
                return NextResponse.json(
                    { error: 'Invalid action. Use: process_next, process_all_pending, clear_completed' },
                    { status: 400 }
                );
        }

    } catch (error) {
        console.error('=== BACKGROUND WORKER ERROR ===');
        console.error('Error:', error);

        return NextResponse.json(
            { error: 'Background processing failed: ' + (error as Error).message },
            { status: 500 }
        );
    }
}

async function processNextQueueItems(maxItems: number = 1) {
    try {
        console.log(`Processing next ${maxItems} queue items...`);
        
        const results = [];
        
        for (let i = 0; i < maxItems; i++) {
            // Get next item from queue
            const queueItem = await ProcessingQueueManager.getNextQueueItem();
            
            if (!queueItem) {
                console.log('No more items in queue');
                break;
            }

            console.log(`Processing queue item: ${queueItem.company}/${queueItem.filename}`);

            // Update status to processing
            await ProcessingQueueManager.updateQueueItem(queueItem.id, {
                status: 'processing',
                startedAt: new Date()
            });

            try {
                // Get PDF info
                const allPDFs = await getAllPDFs(queueItem.company);
                const pdfInfo = allPDFs.find(pdf => pdf.filename === queueItem.filename);

                if (!pdfInfo) {
                    throw new Error(`PDF not found: ${queueItem.filename}`);
                }

                // Initialize vector DB
                await vectorDB.initialize();

                // Process document
                const processingResult = await DocumentProcessor.processDocument(pdfInfo, {
                    useAdvancedAnalysis: true,
                    generateEmbeddings: true
                });

                if (processingResult.success) {
                    // Update queue item as completed
                    await ProcessingQueueManager.updateQueueItem(queueItem.id, {
                        status: 'completed',
                        completedAt: new Date()
                    });

                    results.push({
                        queueId: queueItem.id,
                        filename: queueItem.filename,
                        company: queueItem.company,
                        success: true,
                        processingTimeMs: processingResult.processingTimeMs,
                        tokensUsed: processingResult.tokensUsed,
                        costEstimate: processingResult.costEstimate
                    });

                    console.log(`Successfully processed: ${queueItem.filename}`);
                } else {
                    throw new Error(processingResult.error || 'Processing failed');
                }

            } catch (processingError) {
                console.error(`Processing failed for ${queueItem.filename}:`, processingError);

                // Update retry count
                const newRetryCount = queueItem.retryCount + 1;
                const maxRetries = 3;

                if (newRetryCount >= maxRetries) {
                    // Mark as failed after max retries
                    await ProcessingQueueManager.updateQueueItem(queueItem.id, {
                        status: 'failed',
                        completedAt: new Date(),
                        errorMessage: (processingError as Error).message,
                        retryCount: newRetryCount
                    });

                    results.push({
                        queueId: queueItem.id,
                        filename: queueItem.filename,
                        company: queueItem.company,
                        success: false,
                        error: (processingError as Error).message,
                        retryCount: newRetryCount,
                        maxRetriesReached: true
                    });
                } else {
                    // Reset to pending for retry
                    await ProcessingQueueManager.updateQueueItem(queueItem.id, {
                        status: 'pending',
                        errorMessage: (processingError as Error).message,
                        retryCount: newRetryCount
                    });

                    results.push({
                        queueId: queueItem.id,
                        filename: queueItem.filename,
                        company: queueItem.company,
                        success: false,
                        error: (processingError as Error).message,
                        retryCount: newRetryCount,
                        willRetry: true
                    });
                }
            }

            // Add delay between processing to avoid rate limits
            if (i < maxItems - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // Get updated queue status
        const queueStatus = await getQueueStats();

        return NextResponse.json({
            success: true,
            processed: results.length,
            results,
            queueStatus,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Process next items error:', error);
        return NextResponse.json(
            { error: 'Failed to process queue items: ' + (error as Error).message },
            { status: 500 }
        );
    }
}

async function processAllPending() {
    try {
        console.log('Processing all pending queue items...');
        
        const queue = await ProcessingQueueManager.getQueue();
        const pendingItems = queue.filter(item => item.status === 'pending');

        if (pendingItems.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No pending items to process',
                processed: 0,
                timestamp: new Date().toISOString()
            });
        }

        console.log(`Found ${pendingItems.length} pending items`);

        // Process in smaller batches to avoid overwhelming the system
        const batchSize = 5;
        const batches = [];
        
        for (let i = 0; i < pendingItems.length; i += batchSize) {
            batches.push(pendingItems.slice(i, i + batchSize));
        }

        const allResults = [];
        
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            console.log(`Processing batch ${batchIndex + 1}/${batches.length}`);
            
            const batchResult = await processNextQueueItems(batches[batchIndex].length);
            
            if (batchResult.status === 200) {
                const batchData = await batchResult.json();
                allResults.push(...(batchData.results || []));
            }

            // Add longer delay between batches
            if (batchIndex < batches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        const successful = allResults.filter(r => r.success).length;
        const failed = allResults.filter(r => !r.success).length;

        return NextResponse.json({
            success: true,
            message: `Processed all pending items: ${successful} successful, ${failed} failed`,
            totalProcessed: allResults.length,
            successful,
            failed,
            results: allResults,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Process all pending error:', error);
        return NextResponse.json(
            { error: 'Failed to process all pending: ' + (error as Error).message },
            { status: 500 }
        );
    }
}

async function clearCompletedItems() {
    try {
        const removedCount = await ProcessingQueueManager.clearCompleted();
        
        return NextResponse.json({
            success: true,
            message: `Cleared ${removedCount} completed items from queue`,
            removedCount,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Clear completed error:', error);
        return NextResponse.json(
            { error: 'Failed to clear completed items: ' + (error as Error).message },
            { status: 500 }
        );
    }
}

async function getQueueStats() {
    try {
        const queue = await ProcessingQueueManager.getQueue();
        return {
            total: queue.length,
            pending: queue.filter(item => item.status === 'pending').length,
            processing: queue.filter(item => item.status === 'processing').length,
            completed: queue.filter(item => item.status === 'completed').length,
            failed: queue.filter(item => item.status === 'failed').length
        };
    } catch (error) {
        console.error('Failed to get queue stats:', error);
        return { total: 0, pending: 0, processing: 0, completed: 0, failed: 0 };
    }
}

// GET endpoint for status and manual trigger
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action') || 'status';

        if (action === 'status') {
            const queueStats = await getQueueStats();
            const processingStats = await ProcessedDocumentStorage.getProcessingStats();
            
            return NextResponse.json({
                success: true,
                status: 'ready',
                queueStats,
                processingStats,
                timestamp: new Date().toISOString()
            });
        }

        if (action === 'trigger') {
            // Manual trigger for processing next item
            return await processNextQueueItems(1);
        }

        return NextResponse.json(
            { error: 'Invalid action. Use: status, trigger' },
            { status: 400 }
        );

    } catch (error) {
        console.error('GET request error:', error);
        return NextResponse.json(
            { error: 'Failed to get worker status: ' + (error as Error).message },
            { status: 500 }
        );
    }
}