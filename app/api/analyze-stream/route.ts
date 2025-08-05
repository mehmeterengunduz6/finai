import { NextRequest } from 'next/server';
import { analyzeWithClaude } from '../../lib/antrophic';
import { getAllPDFs } from '../../lib/pdf-handler';
import { AnalysisRequest } from '../../lib/types';
import { selectDocumentsWithIntelligentFiltering } from '../../lib/document-selector';
import * as path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const COMPANIES_DIR = path.join(UPLOAD_DIR, 'companies');

interface ProcessUpdate {
  type: 'step_update' | 'final_result' | 'error';
  stepId?: string;
  status?: 'in_progress' | 'completed';
  message?: string;
  data?: any;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Helper function to send updates
        const sendUpdate = (update: ProcessUpdate) => {
          const data = `data: ${JSON.stringify(update)}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        console.log('=== STREAMING ANALYZE API CALLED ===');

        const body: AnalysisRequest = await request.json();
        const { question, context } = body;

        if (!question || !question.trim()) {
          sendUpdate({
            type: 'error',
            message: 'Question is required'
          });
          controller.close();
          return;
        }

        // Step 1: Analyzing query
        sendUpdate({
          type: 'step_update',
          stepId: 'analyzing_query',
          status: 'in_progress'
        });

        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate processing time

        sendUpdate({
          type: 'step_update',
          stepId: 'analyzing_query',
          status: 'completed'
        });

        // Step 2: Identifying company
        sendUpdate({
          type: 'step_update',
          stepId: 'identifying_company',
          status: 'in_progress'
        });

        await new Promise(resolve => setTimeout(resolve, 600));

        sendUpdate({
          type: 'step_update',
          stepId: 'identifying_company',
          status: 'completed'
        });

        // Step 3: Searching documents
        sendUpdate({
          type: 'step_update',
          stepId: 'searching_documents',
          status: 'in_progress'
        });

        const allPDFs = await getAllPDFs();

        sendUpdate({
          type: 'step_update',
          stepId: 'searching_documents',
          status: 'completed'
        });

        if (allPDFs.length === 0) {
          sendUpdate({
            type: 'error',
            message: 'No PDF files available for analysis'
          });
          controller.close();
          return;
        }

        // Step 4: Selecting relevant documents
        sendUpdate({
          type: 'step_update',
          stepId: 'selecting_relevant',
          status: 'in_progress'
        });

        const selectionResult = selectDocumentsWithIntelligentFiltering(allPDFs, question, 100);
        const filesToAnalyze = selectionResult.selectedPDFs;

        await new Promise(resolve => setTimeout(resolve, 800));

        sendUpdate({
          type: 'step_update',
          stepId: 'selecting_relevant',
          status: 'completed'
        });

        // Step 5: Reading files
        sendUpdate({
          type: 'step_update',
          stepId: 'reading_files',
          status: 'in_progress'
        });

        const pdfFiles = filesToAnalyze.map(pdf => ({
          filename: pdf.filename,
          filepath: path.join(COMPANIES_DIR, pdf.company || 'default', pdf.filename),
          company: pdf.company
        }));

        await new Promise(resolve => setTimeout(resolve, 1200));

        sendUpdate({
          type: 'step_update',
          stepId: 'reading_files',
          status: 'completed'
        });

        // Step 6: Analyzing data
        sendUpdate({
          type: 'step_update',
          stepId: 'analyzing_data',
          status: 'in_progress'
        });

        await new Promise(resolve => setTimeout(resolve, 800));

        sendUpdate({
          type: 'step_update',
          stepId: 'analyzing_data',
          status: 'completed'
        });

        // Step 7: Generating response
        sendUpdate({
          type: 'step_update',
          stepId: 'generating_response',
          status: 'in_progress'
        });

        // Analyze with Claude
        const analysisResult = await analyzeWithClaude(
          { question, context },
          pdfFiles
        );

        sendUpdate({
          type: 'step_update',
          stepId: 'generating_response',
          status: 'completed'
        });

        // Step 8: Creating chart (if chart data exists)
        if (analysisResult.chartData) {
          sendUpdate({
            type: 'step_update',
            stepId: 'creating_chart',
            status: 'in_progress'
          });

          await new Promise(resolve => setTimeout(resolve, 600));

          sendUpdate({
            type: 'step_update',
            stepId: 'creating_chart',
            status: 'completed'
          });
        }

        // Send final result
        const response = {
          success: true,
          ...analysisResult,
          filesAnalyzed: pdfFiles.length,
          totalFilesAvailable: allPDFs.length,
          companiesAvailable: [...new Set(pdfFiles.map(pdf => pdf.company).filter(Boolean))],
          selectionInfo: {
            totalScore: selectionResult.totalScore,
            reasons: selectionResult.selectionReasons,
            droppedCount: selectionResult.droppedPDFs.length
          },
          timestamp: new Date().toISOString()
        };

        sendUpdate({
          type: 'final_result',
          data: response
        });

        controller.close();

      } catch (error) {
        console.error('=== STREAMING ANALYZE API ERROR ===', error);
        
        const sendUpdate = (update: ProcessUpdate) => {
          const data = `data: ${JSON.stringify(update)}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        sendUpdate({
          type: 'error',
          message: 'Analysis failed: ' + (error as Error).message
        });
        
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}