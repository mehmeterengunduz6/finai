import { NextRequest, NextResponse } from 'next/server';
import { getAllPDFs } from '../../lib/pdf-handler';
import { EnhancedDocumentProcessor } from '../../lib/enhanced-processor';
import { ProcessedDocumentStorage } from '../../lib/processed-docs';

export async function POST(request: NextRequest) {
    try {
        console.log('=== ENHANCED DOCUMENT PROCESSING API CALLED ===');
        
        const body = await request.json();
        const { action, company, filename, forceReprocess = false } = body;

        switch (action) {
            case 'process_single':
                return await processSingleDocument(company, filename, forceReprocess);
            
            case 'process_batch':
                return await processBatchDocuments(company, forceReprocess);
            
            case 'process_all':
                return await processAllDocuments(forceReprocess);
            
            case 'stats':
                return await getProcessedStats();
            
            default:
                return NextResponse.json(
                    { error: 'Invalid action. Use: process_single, process_batch, process_all, stats' },
                    { status: 400 }
                );
        }

    } catch (error) {
        console.error('=== ENHANCED PROCESSING API ERROR ===');
        console.error('Error:', error);

        return NextResponse.json(
            { error: 'Enhanced processing failed: ' + (error as Error).message },
            { status: 500 }
        );
    }
}

async function processSingleDocument(company: string, filename: string, forceReprocess: boolean) {
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

        // Check if already processed and handle force reprocess
        if (forceReprocess) {
            console.log('Force reprocessing requested');
            // Delete existing processed version
            const existingDocs = await ProcessedDocumentStorage.getProcessedDocumentsByCompany(company);
            const existingDoc = existingDocs.find(doc => doc.originalFilename === filename);
            if (existingDoc) {
                await ProcessedDocumentStorage.deleteProcessedDocument(existingDoc.id);
                console.log('Deleted existing processed document for reprocessing');
            }
        }

        // Process document with enhanced method
        const result = await EnhancedDocumentProcessor.processDocument(pdfInfo);

        return NextResponse.json({
            success: true,
            result,
            enhanced: true,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Enhanced single document processing error:', error);
        return NextResponse.json(
            { error: 'Failed to process document: ' + (error as Error).message },
            { status: 500 }
        );
    }
}

async function processBatchDocuments(company: string | undefined, forceReprocess: boolean) {
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

        let documentsToProcess = allPDFs;

        // Filter out already processed documents (unless force reprocess)
        if (!forceReprocess) {
            const unprocessedPDFs = [];
            for (const pdf of allPDFs) {
                // Check if processed with enhanced version
                const existingDocs = await ProcessedDocumentStorage.getProcessedDocumentsByCompany(pdf.company || 'default');
                const existingDoc = existingDocs.find(doc => 
                    doc.originalFilename === pdf.filename && 
                    doc.processingVersion === '2.0-enhanced'
                );
                
                if (!existingDoc) {
                    unprocessedPDFs.push(pdf);
                }
            }
            documentsToProcess = unprocessedPDFs;
            console.log(`Found ${documentsToProcess.length} documents that need enhanced processing`);
        } else {
            console.log('Force reprocessing all documents');
        }

        if (documentsToProcess.length === 0 && !forceReprocess) {
            return NextResponse.json({
                success: true,
                message: 'All documents are already processed with enhanced version',
                totalDocuments: allPDFs.length,
                alreadyProcessed: allPDFs.length,
                processed: 0
            });
        }

        // Process documents with enhanced method
        const results = await EnhancedDocumentProcessor.processBatch(documentsToProcess);

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success);

        return NextResponse.json({
            success: true,
            results,
            enhanced: true,
            summary: {
                totalDocuments: allPDFs.length,
                processed: successful,
                failed: failed.length,
                alreadyProcessed: forceReprocess ? 0 : (allPDFs.length - documentsToProcess.length),
                totalProcessingTime: results.reduce((sum, r) => sum + r.processingTimeMs, 0),
                totalTokensUsed: results.reduce((sum, r) => sum + r.tokensUsed, 0),
                estimatedCost: results.reduce((sum, r) => sum + (r.costEstimate || 0), 0)
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Enhanced batch processing error:', error);
        return NextResponse.json(
            { error: 'Failed to process batch: ' + (error as Error).message },
            { status: 500 }
        );
    }
}

async function processAllDocuments(forceReprocess: boolean) {
    return await processBatchDocuments(undefined, forceReprocess);
}

async function getProcessedStats() {
    try {
        const stats = await ProcessedDocumentStorage.getProcessingStats();
        const allDocs = await ProcessedDocumentStorage.getAllProcessedDocuments();
        
        // Count enhanced vs simple versions
        const enhancedDocs = allDocs.filter(doc => doc.processingVersion === '2.0-enhanced');
        const simpleDocs = allDocs.filter(doc => doc.processingVersion !== '2.0-enhanced');
        
        const { SimpleStorageService } = await import('../../lib/simple-storage');
        const embeddingCount = SimpleStorageService.getEmbeddingCount();

        return NextResponse.json({
            success: true,
            processingStats: stats,
            versionBreakdown: {
                enhanced: enhancedDocs.length,
                simple: simpleDocs.length,
                total: allDocs.length
            },
            storageStats: {
                totalEmbeddings: embeddingCount
            },
            enhanced: true,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Enhanced stats error:', error);
        return NextResponse.json(
            { error: 'Failed to get enhanced stats: ' + (error as Error).message },
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
            const allDocs = await ProcessedDocumentStorage.getAllProcessedDocuments();
            const enhancedDocs = allDocs.filter(doc => doc.processingVersion === '2.0-enhanced');
            
            return NextResponse.json({
                success: true,
                status: 'ready',
                method: 'enhanced',
                processingStats: stats,
                enhancedDocuments: enhancedDocs.length,
                readyForEnhancement: allDocs.length - enhancedDocs.length,
                timestamp: new Date().toISOString()
            });
        }

        return NextResponse.json(
            { error: 'Invalid action for GET request' },
            { status: 400 }
        );

    } catch (error) {
        console.error('Enhanced GET request error:', error);
        return NextResponse.json(
            { error: 'Failed to get enhanced status: ' + (error as Error).message },
            { status: 500 }
        );
    }
}