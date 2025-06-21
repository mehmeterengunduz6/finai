import { ChartData } from '../components/ui/FinancialChart';

export interface ChatMessage {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    metadata?: {
        usedFiles?: string[];
        analysisType?: string;
        chartData?: ChartData;
    };
}

export interface UploadedPDF {
    id: string;
    filename: string;
    originalName: string;
    uploadDate: Date;
    size: number;
    quarter?: string;
    year?: number;
    company?: string;
}

export interface AnalysisRequest {
    question: string;
    selectedFiles?: string[];
    company?: string;
    context?: string;
}

export interface AnalysisResponse {
    answer: string;
    usedFiles: string[];
    confidence: number;
    sources?: string[];
    chartData?: ChartData;
}

export interface FinancialMetric {
    name: string;
    value: number | string;
    quarter: string;
    year: number;
    currency?: string;
}

export type { ChartData };