'use client';

import { useState, useRef } from 'react';
import { CloudArrowUpIcon, DocumentIcon } from '@heroicons/react/24/outline';

interface PDFUploadProps {
    onUploadSuccess: () => void;
}

export default function PDFUpload({ onUploadSuccess }: PDFUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [company, setCompany] = useState('');
    const [quarter, setQuarter] = useState('');
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileSelect = (file: File) => {
        if (file.type !== 'application/pdf') {
            alert('Please select a PDF file');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            alert('File size must be less than 10MB');
            return;
        }

        setSelectedFile(file);

        // Auto-detect company from filename
        const filename = file.name.toLowerCase();
        if (filename.includes('apple')) setCompany('apple');
        else if (filename.includes('microsoft')) setCompany('microsoft');
        else if (filename.includes('google')) setCompany('google');
        else if (filename.includes('amazon')) setCompany('amazon');
        else if (filename.includes('meta')) setCompany('meta');

        // Auto-detect quarter
        if (filename.includes('q1') || filename.includes('first')) setQuarter('Q1');
        else if (filename.includes('q2') || filename.includes('second')) setQuarter('Q2');
        else if (filename.includes('q3') || filename.includes('third')) setQuarter('Q3');
        else if (filename.includes('q4') || filename.includes('fourth')) setQuarter('Q4');

        // Auto-detect year
        const yearMatch = filename.match(/20\d{2}/);
        if (yearMatch) setYear(yearMatch[0]);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !company) {
            alert('Please select a file and enter company name');
            return;
        }

        setIsUploading(true);

        try {
            console.log('Starting upload...', { file: selectedFile.name, company }); // Debug log

            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('metadata', JSON.stringify({
                company: company.toLowerCase(),
                quarter,
                year: parseInt(year),
            }));

            console.log('FormData created, sending request...'); // Debug log

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            console.log('Response status:', response.status); // Debug log
            console.log('Response headers:', response.headers.get('content-type')); // Debug log

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.error('Non-JSON response:', textResponse); // Debug log
                throw new Error('Server returned non-JSON response');
            }

            const data = await response.json();
            console.log('Response data:', data); // Debug log

            if (response.ok) {
                // Reset form
                setSelectedFile(null);
                setCompany('');
                setQuarter('');
                setYear(new Date().getFullYear().toString());
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }

                onUploadSuccess();
                alert('PDF uploaded successfully!');
            } else {
                alert(`Upload failed: ${data.error}`);
            }
        } catch (error) {
            console.error('Upload error details:', error); // Debug log
            alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* File Drop Zone */}
            <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragOver
                        ? 'border-blue-500 bg-blue-50'
                        : selectedFile
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-300 hover:border-gray-400'
                    }`}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileInput}
                    className="hidden"
                />

                {selectedFile ? (
                    <div className="space-y-2">
                        <DocumentIcon className="h-12 w-12 text-green-500 mx-auto" />
                        <p className="text-green-700 font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-gray-600">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto" />
                        <p className="text-gray-600">
                            <span className="font-medium">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-sm text-gray-500">PDF files only, up to 10MB</p>
                    </div>
                )}
            </div>

            {/* Metadata Form */}
            <div className="grid grid-cols-1 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company *
                    </label>
                    <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="e.g. apple, microsoft, google"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quarter
                        </label>
                        <select
                            value={quarter}
                            onChange={(e) => setQuarter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select Quarter</option>
                            <option value="Q1">Q1</option>
                            <option value="Q2">Q2</option>
                            <option value="Q3">Q3</option>
                            <option value="Q4">Q4</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Year
                        </label>
                        <input
                            type="number"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            min="2020"
                            max="2030"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Upload Button */}
            <button
                onClick={handleUpload}
                disabled={!selectedFile || !company || isUploading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {isUploading ? 'Uploading...' : 'Upload PDF'}
            </button>
        </div>
    );
}