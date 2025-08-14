import { NextRequest, NextResponse } from 'next/server';
import { savePDF } from '../../lib/pdf-handler';
import { ProcessingQueueManager } from '../../lib/processed-docs';

// Debug için GET endpoint ekle
export async function GET() {
    return NextResponse.json({ message: 'Upload endpoint is working', method: 'GET' });
}

export async function POST(request: NextRequest) {
    try {
        console.log('Upload API called'); // Debug log

        const formData = await request.formData();
        console.log('FormData received'); // Debug log

        const file = formData.get('file') as File;
        const metadataString = formData.get('metadata') as string;

        console.log('File:', file?.name, 'Size:', file?.size); // Debug log
        console.log('Metadata string:', metadataString); // Debug log

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // File validations
        if (file.type !== 'application/pdf') {
            return NextResponse.json(
                { error: 'Only PDF files are allowed' },
                { status: 400 }
            );
        }

        const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: `File size must be less than ${maxSize / 1024 / 1024}MB` },
                { status: 400 }
            );
        }

        // Parse metadata
        let metadata = {};
        if (metadataString) {
            try {
                metadata = JSON.parse(metadataString);
                console.log('Parsed metadata:', metadata); // Debug log
            } catch (error) {
                console.warn('Invalid metadata JSON:', error);
            }
        }

        console.log('Attempting to save PDF...'); // Debug log

        // Save PDF
        const savedPDF = await savePDF(file, metadata);

        console.log('PDF saved successfully:', savedPDF.filename); // Debug log

        // Add to processing queue for background processing
        try {
            const queueId = await ProcessingQueueManager.addToQueue({
                filename: savedPDF.filename,
                company: savedPDF.company || 'default',
                priority: 'high', // New uploads get high priority
                status: 'pending'
            });

            console.log('Added to processing queue:', queueId);

            return NextResponse.json({
                success: true,
                pdf: savedPDF,
                queueId,
                message: 'PDF uploaded successfully and queued for processing'
            });
        } catch (queueError) {
            console.warn('Failed to add to processing queue:', queueError);
            
            // Still return success since the upload worked
            return NextResponse.json({
                success: true,
                pdf: savedPDF,
                message: 'PDF uploaded successfully (processing queue unavailable)',
                warning: 'Document was not added to processing queue'
            });
        }

    } catch (error) {
        console.error('Upload error details:', error); // Debug log
        return NextResponse.json(
            { error: 'Failed to upload PDF: ' + (error as Error).message },
            { status: 500 }
        );
    }
}