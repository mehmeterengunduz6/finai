import { NextRequest, NextResponse } from 'next/server';
import { getAllPDFs, deletePDF } from '../../lib/pdf-handler';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const company = searchParams.get('company');

        const pdfs = await getAllPDFs(company || undefined);

        return NextResponse.json({
            success: true,
            pdfs,
            count: pdfs.length,
            company: company || 'all'
        });

    } catch (error) {
        console.error('Get reports error:', error);
        return NextResponse.json(
            { error: 'Failed to get reports: ' + (error as Error).message },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('filename');
        const company = searchParams.get('company');

        if (!filename || !company) {
            return NextResponse.json(
                { error: 'Filename and company are required' },
                { status: 400 }
            );
        }

        const success = deletePDF(filename, company);

        if (success) {
            return NextResponse.json({
                success: true,
                message: 'PDF deleted successfully'
            });
        } else {
            return NextResponse.json(
                { error: 'Failed to delete PDF' },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Delete report error:', error);
        return NextResponse.json(
            { error: 'Failed to delete report: ' + (error as Error).message },
            { status: 500 }
        );
    }
}