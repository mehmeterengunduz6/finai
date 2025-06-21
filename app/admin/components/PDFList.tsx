'use client';

import { UploadedPDF } from '../../lib/types';
import { TrashIcon, DocumentIcon } from '@heroicons/react/24/outline';

interface PDFListProps {
    pdfs: UploadedPDF[];
    onDelete: (filename: string, company: string) => void;
    isLoading: boolean;
}

export default function PDFList({ pdfs, onDelete, isLoading }: PDFListProps) {
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (date: Date): string => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getCompanyDisplayName = (company: string): string => {
        return company.charAt(0).toUpperCase() + company.slice(1);
    };

    const getCompanyColor = (company: string): string => {
        const colors: { [key: string]: string } = {
            apple: 'bg-gray-100 text-gray-800',
            microsoft: 'bg-blue-100 text-blue-800',
            google: 'bg-green-100 text-green-800',
            amazon: 'bg-orange-100 text-orange-800',
            meta: 'bg-blue-100 text-blue-800',
        };
        return colors[company.toLowerCase()] || 'bg-gray-100 text-gray-800';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (pdfs.length === 0) {
        return (
            <div className="text-center py-8">
                <DocumentIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reports uploaded yet</h3>
                <p className="text-gray-600">Upload your first financial report to get started.</p>
            </div>
        );
    }

    // Group PDFs by company
    const groupedPDFs = pdfs.reduce((acc, pdf) => {
        const company = pdf.company || 'unknown';
        if (!acc[company]) {
            acc[company] = [];
        }
        acc[company].push(pdf);
        return acc;
    }, {} as { [key: string]: UploadedPDF[] });

    return (
        <div className="space-y-6">
            {Object.entries(groupedPDFs).map(([company, companyPDFs]) => (
                <div key={company}>
                    <div className="flex items-center mb-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCompanyColor(company)}`}>
                            {getCompanyDisplayName(company)}
                        </span>
                        <span className="ml-2 text-sm text-gray-500">
                            {companyPDFs.length} report{companyPDFs.length > 1 ? 's' : ''}
                        </span>
                    </div>

                    <div className="space-y-2">
                        {companyPDFs.map((pdf) => (
                            <div
                                key={`${pdf.company}-${pdf.filename}`}
                                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center space-x-3 flex-1">
                                    <DocumentIcon className="h-5 w-5 text-gray-400" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {pdf.originalName}
                                        </p>
                                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                                            <span>{formatFileSize(pdf.size)}</span>
                                            <span>{formatDate(pdf.uploadDate)}</span>
                                            {pdf.quarter && <span>{pdf.quarter}</span>}
                                            {pdf.year && <span>{pdf.year}</span>}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => onDelete(pdf.filename, pdf.company || '')}
                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                    title="Delete PDF"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}