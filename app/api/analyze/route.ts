import { NextRequest, NextResponse } from 'next/server';
import { analyzeWithClaude } from '../../lib/antrophic';
import { getAllPDFs } from '../../lib/pdf-handler';
import { AnalysisRequest } from '../../lib/types';
import * as path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const COMPANIES_DIR = path.join(UPLOAD_DIR, 'companies');

export async function POST(request: NextRequest) {
    try {
        console.log('=== ANALYZE API CALLED ===');

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

        console.log('Getting all PDFs...');

        // Get ALL PDFs from all companies - LLM will decide which ones to use
        const allPDFs = getAllPDFs(); // No company filter

        console.log('Found PDFs:', allPDFs.length);
        console.log('PDF details:', allPDFs.map(pdf => ({ filename: pdf.filename, company: pdf.company })));

        if (allPDFs.length === 0) {
            console.log('ERROR: No PDFs found');
            return NextResponse.json(
                { error: 'No PDF files available for analysis' },
                { status: 400 }
            );
        }

        // Limit number of files to prevent token overflow
        const maxFiles = parseInt(process.env.MAX_FILES_PER_QUERY || '10');
        const filesToAnalyze = allPDFs.slice(0, maxFiles);

        console.log(`Analyzing ${filesToAnalyze.length} files`);

        console.log(`Analyzing question: "${question}" with ${filesToAnalyze.length} files across ${[...new Set(filesToAnalyze.map(pdf => pdf.company))].length} companies`);

        // Prepare PDF file paths for Claude
        const pdfFiles = filesToAnalyze.map(pdf => ({
            filename: pdf.filename,
            filepath: path.join(COMPANIES_DIR, pdf.company || 'default', pdf.filename),
            company: pdf.company
        }));

        console.log('PDF file paths:', pdfFiles.map(f => f.filepath));

        // Analyze with Claude - send PDFs directly
        const analysisResult = await analyzeWithClaude(
            { question, context },
            pdfFiles
        );

        console.log('Anthropic response received:', { answerLength: analysisResult.answer.length });

        const response = {
            success: true,
            ...analysisResult,
            filesAnalyzed: pdfFiles.length,
            companiesAvailable: [...new Set(pdfFiles.map(pdf => pdf.company).filter(Boolean))],
            timestamp: new Date().toISOString()
        };

        console.log('Sending successful response');

        return NextResponse.json(response);

    } catch (error) {
        console.error('=== ANALYZE API ERROR ===');
        console.error('Full error:', error);
        console.error('Error message:', (error as Error).message);
        console.error('Error stack:', (error as Error).stack);

        // More specific error messages
        if (error instanceof Error) {
            if (error.message.includes('API key')) {
                return NextResponse.json(
                    { error: 'AI service configuration error' },
                    { status: 500 }
                );
            }
            if (error.message.includes('rate limit')) {
                return NextResponse.json(
                    { error: 'Too many requests. Please try again later.' },
                    { status: 429 }
                );
            }
        }

        return NextResponse.json(
            { error: 'Analysis failed: ' + (error as Error).message },
            { status: 500 }
        );
    }
}