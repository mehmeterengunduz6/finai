import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { UploadedPDF } from '../../../lib/types';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const COMPANIES_DIR = path.join(UPLOAD_DIR, 'companies');

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { pdf, updates }: { pdf: UploadedPDF; updates: Partial<UploadedPDF> } = body;

        console.log('Update request:', { pdf: pdf.filename, updates });

        // Find the current metadata file
        const oldCompanyDir = path.join(COMPANIES_DIR, pdf.company || 'default');
        const metadataFile = path.join(oldCompanyDir, `${pdf.filename}.meta.json`);

        if (!fs.existsSync(metadataFile)) {
            return NextResponse.json(
                { error: 'Metadata file not found' },
                { status: 404 }
            );
        }

        // Read current metadata
        const currentMetadata = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));
        
        // Apply updates
        const updatedMetadata = {
            ...currentMetadata,
            ...updates,
            uploadDate: new Date(currentMetadata.uploadDate) // Preserve original upload date
        };

        // If company changed, we need to move the files
        if (updates.company && updates.company !== pdf.company) {
            const newCompanyDir = path.join(COMPANIES_DIR, updates.company);
            
            // Create new company directory if it doesn't exist
            if (!fs.existsSync(newCompanyDir)) {
                fs.mkdirSync(newCompanyDir, { recursive: true });
            }

            // Move PDF file
            const oldPdfPath = path.join(oldCompanyDir, pdf.filename);
            const newPdfPath = path.join(newCompanyDir, pdf.filename);
            
            if (fs.existsSync(oldPdfPath)) {
                fs.renameSync(oldPdfPath, newPdfPath);
            }

            // Move metadata file
            const newMetadataFile = path.join(newCompanyDir, `${pdf.filename}.meta.json`);
            fs.writeFileSync(newMetadataFile, JSON.stringify(updatedMetadata, null, 2));
            
            // Remove old metadata file
            fs.unlinkSync(metadataFile);
        } else {
            // Just update the existing metadata file
            fs.writeFileSync(metadataFile, JSON.stringify(updatedMetadata, null, 2));
        }

        console.log('Update successful:', updatedMetadata);

        return NextResponse.json({
            success: true,
            pdf: updatedMetadata,
            message: 'PDF metadata updated successfully'
        });

    } catch (error) {
        console.error('Update error:', error);
        return NextResponse.json(
            { error: 'Failed to update PDF metadata: ' + (error as Error).message },
            { status: 500 }
        );
    }
}