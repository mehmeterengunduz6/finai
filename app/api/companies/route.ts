import { NextResponse } from 'next/server';
import { getCompanies } from '../../lib/pdf-handler';

export async function GET() {
    try {
        const companies = getCompanies();

        return NextResponse.json({
            success: true,
            companies,
            count: companies.length
        });

    } catch (error) {
        console.error('Get companies error:', error);
        return NextResponse.json(
            { error: 'Failed to get companies: ' + (error as Error).message },
            { status: 500 }
        );
    }
}