'use client';

import { useState } from 'react';
import { UploadedPDF } from '../../lib/types';
import { TrashIcon, DocumentIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { getCompanyDisplayName, getCompanyColor, getBISTCompany, DOCUMENT_TYPES, type DocumentType, getAllBISTCodes } from '../../lib/bist-companies';

interface PDFListEditableProps {
    pdfs: UploadedPDF[];
    onDelete: (filename: string, company: string) => void;
    onUpdate: (pdf: UploadedPDF, updates: Partial<UploadedPDF>) => void;
    isLoading: boolean;
}

interface EditingState {
    pdfId: string | null;
    company: string;
    quarter: string;
    year: string;
    documentType: string;
}

export default function PDFListEditable({ pdfs, onDelete, onUpdate, isLoading }: PDFListEditableProps) {
    const [editingState, setEditingState] = useState<EditingState>({
        pdfId: null,
        company: '',
        quarter: '',
        year: '',
        documentType: ''
    });

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (date: Date): string => {
        return new Date(date).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDocumentType = (docType?: string): string => {
        if (!docType) return '';
        const type = docType as DocumentType;
        return DOCUMENT_TYPES[type] || docType;
    };

    const startEditing = (pdf: UploadedPDF) => {
        setEditingState({
            pdfId: pdf.id,
            company: pdf.company || '',
            quarter: pdf.quarter || '',
            year: pdf.year?.toString() || '',
            documentType: (pdf as any).documentType || 'quarterly'
        });
    };

    const cancelEditing = () => {
        setEditingState({
            pdfId: null,
            company: '',
            quarter: '',
            year: '',
            documentType: ''
        });
    };

    const saveEditing = (pdf: UploadedPDF) => {
        const updates: Partial<UploadedPDF> = {
            company: editingState.company.toLowerCase(),
            quarter: editingState.quarter || undefined,
            year: editingState.year ? parseInt(editingState.year) : undefined,
            documentType: editingState.documentType as DocumentType
        };

        onUpdate(pdf, updates);
        cancelEditing();
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz rapor yüklenmedi</h3>
                <p className="text-gray-600">İlk finansal raporunuzu yükleyerek başlayın.</p>
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
                            {companyPDFs.length} rapor
                        </span>
                    </div>

                    <div className="space-y-2">
                        {companyPDFs.map((pdf) => (
                            <div
                                key={`${pdf.company}-${pdf.filename}`}
                                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center space-x-3 flex-1">
                                    <DocumentIcon className="h-5 w-5 text-gray-400" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {pdf.originalName}
                                        </p>
                                        
                                        {editingState.pdfId === pdf.id ? (
                                            /* Editing Mode */
                                            <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2">
                                                {/* Company Select */}
                                                <select
                                                    value={editingState.company}
                                                    onChange={(e) => setEditingState({...editingState, company: e.target.value})}
                                                    className="text-xs border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="">Şirket Seçin</option>
                                                    {getAllBISTCodes().map(code => {
                                                        const companyInfo = getBISTCompany(code);
                                                        return (
                                                            <option key={code} value={code.toLowerCase()}>
                                                                {code} - {companyInfo?.name}
                                                            </option>
                                                        );
                                                    })}
                                                </select>

                                                {/* Quarter Select */}
                                                <select
                                                    value={editingState.quarter}
                                                    onChange={(e) => setEditingState({...editingState, quarter: e.target.value})}
                                                    className="text-xs border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="">Çeyrek</option>
                                                    <option value="Q1">Q1 - 1. Çeyrek</option>
                                                    <option value="Q2">Q2 - 2. Çeyrek</option>
                                                    <option value="Q3">Q3 - 3. Çeyrek</option>
                                                    <option value="Q4">Q4 - 4. Çeyrek</option>
                                                </select>

                                                {/* Year Input */}
                                                <input
                                                    type="number"
                                                    value={editingState.year}
                                                    onChange={(e) => setEditingState({...editingState, year: e.target.value})}
                                                    placeholder="Yıl"
                                                    min="2019"
                                                    max="2030"
                                                    className="text-xs border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />

                                                {/* Document Type Select */}
                                                <select
                                                    value={editingState.documentType}
                                                    onChange={(e) => setEditingState({...editingState, documentType: e.target.value})}
                                                    className="text-xs border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                >
                                                    {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
                                                        <option key={key} value={key}>{label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ) : (
                                            /* Display Mode */
                                            <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                                                <span>{formatFileSize(pdf.size)}</span>
                                                <span>{formatDate(pdf.uploadDate)}</span>
                                                {pdf.quarter && (
                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                                        {pdf.quarter}
                                                    </span>
                                                )}
                                                {pdf.year && (
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                                                        {pdf.year}
                                                    </span>
                                                )}
                                                {(pdf as any).documentType && (
                                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                                                        {formatDocumentType((pdf as any).documentType)}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    {editingState.pdfId === pdf.id ? (
                                        /* Editing Controls */
                                        <>
                                            <button
                                                onClick={() => saveEditing(pdf)}
                                                className="p-2 text-green-500 hover:text-green-700 transition-colors"
                                                title="Kaydet"
                                            >
                                                <CheckIcon className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={cancelEditing}
                                                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                                                title="İptal"
                                            >
                                                <XMarkIcon className="h-4 w-4" />
                                            </button>
                                        </>
                                    ) : (
                                        /* View Controls */
                                        <>
                                            <button
                                                onClick={() => startEditing(pdf)}
                                                className="p-2 text-blue-500 hover:text-blue-700 transition-colors"
                                                title="Düzenle"
                                            >
                                                <PencilIcon className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => onDelete(pdf.filename, pdf.company || '')}
                                                className="p-2 text-red-500 hover:text-red-700 transition-colors"
                                                title="Sil"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}