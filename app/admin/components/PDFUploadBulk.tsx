'use client';

import { useState, useRef } from 'react';
import { CloudArrowUpIcon, DocumentIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { detectBISTCompanyFromFilename, getAllBISTCodes, getBISTCompany, DOCUMENT_TYPES, type DocumentType } from '../../lib/bist-companies';

interface PDFUploadBulkProps {
    onUploadSuccess: () => void;
}

export default function PDFUploadBulk({ onUploadSuccess }: PDFUploadBulkProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Single file form state
    const [company, setCompany] = useState('');
    const [quarter, setQuarter] = useState('');
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [documentType, setDocumentType] = useState<DocumentType>('quarterly');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Bulk upload state
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [bulkMetadata, setBulkMetadata] = useState({
        company: '',
        documentType: 'quarterly' as DocumentType
    });

    const handleFileSelect = (files: File | File[]) => {
        const fileArray = Array.isArray(files) ? files : [files];
        
        // Validate all files
        const validFiles: File[] = [];
        const invalidFiles: string[] = [];
        
        fileArray.forEach(file => {
            if (file.type !== 'application/pdf') {
                invalidFiles.push(`${file.name}: PDF dosyası değil`);
                return;
            }
            
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                invalidFiles.push(`${file.name}: 10MB'dan büyük`);
                return;
            }
            
            validFiles.push(file);
        });
        
        if (invalidFiles.length > 0) {
            alert('Bazı dosyalar geçersiz:\n' + invalidFiles.join('\n'));
        }
        
        if (validFiles.length === 0) return;
        
        if (isBulkMode) {
            setSelectedFiles(validFiles);
            return;
        }
        
        // Single file mode
        const file = validFiles[0];
        setSelectedFile(file);

        // Auto-detect BIST company from filename
        const detectedCompany = detectBISTCompanyFromFilename(file.name);
        if (detectedCompany) {
            setCompany(detectedCompany);
        }

        // Auto-detect quarter with enhanced Turkish patterns
        const filename = file.name.toLowerCase();
        if (filename.includes('q1') || filename.includes('1-ceyrek') || filename.includes('1ceyrek') || 
            filename.includes('birinci') || filename.includes('first') || filename.includes('i.ceyrek') ||
            filename.includes('1.ceyrek') || filename.includes('1 ceyrek')) {
            setQuarter('Q1');
        } else if (filename.includes('q2') || filename.includes('2-ceyrek') || filename.includes('2ceyrek') || 
                  filename.includes('ikinci') || filename.includes('second') || filename.includes('ii.ceyrek') ||
                  filename.includes('2.ceyrek') || filename.includes('2 ceyrek')) {
            setQuarter('Q2');
        } else if (filename.includes('q3') || filename.includes('3-ceyrek') || filename.includes('3ceyrek') || 
                  filename.includes('ucuncu') || filename.includes('üçüncü') || filename.includes('third') || 
                  filename.includes('iii.ceyrek') || filename.includes('3.ceyrek') || filename.includes('3 ceyrek')) {
            setQuarter('Q3');
        } else if (filename.includes('q4') || filename.includes('4-ceyrek') || filename.includes('4ceyrek') || 
                  filename.includes('dorduncu') || filename.includes('dördüncü') || filename.includes('fourth') || 
                  filename.includes('iv.ceyrek') || filename.includes('4.ceyrek') || filename.includes('4 ceyrek')) {
            setQuarter('Q4');
        }

        // Auto-detect document type
        if (filename.includes('sunum') || filename.includes('presentation')) setDocumentType('presentation');
        else if (filename.includes('yillik') || filename.includes('annual')) setDocumentType('annual');
        else if (filename.includes('mali') || filename.includes('financial')) setDocumentType('financial');
        else setDocumentType('quarterly');

        // Auto-detect year
        const yearMatch = filename.match(/20\d{2}/);
        if (yearMatch) setYear(yearMatch[0]);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            if (files.length > 1) {
                setIsBulkMode(true);
                handleFileSelect(files);
            } else {
                handleFileSelect(files[0]);
            }
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const fileArray = Array.from(files);
            if (fileArray.length > 1) {
                setIsBulkMode(true);
                handleFileSelect(fileArray);
            } else {
                handleFileSelect(fileArray[0]);
            }
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(files => files.filter((_, i) => i !== index));
    };

    const handleSingleUpload = async () => {
        if (!selectedFile || !company) {
            alert('Lütfen dosya ve şirket seçin');
            return;
        }

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('metadata', JSON.stringify({
                company: company.toLowerCase(),
                quarter,
                year: parseInt(year),
                documentType
            }));

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.error('Non-JSON response:', textResponse);
                throw new Error('Server returned non-JSON response');
            }

            const data = await response.json();

            if (response.ok) {
                // Reset form
                setSelectedFile(null);
                setCompany('');
                setQuarter('');
                setYear(new Date().getFullYear().toString());
                setDocumentType('quarterly');
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }

                onUploadSuccess();
                alert('PDF başarıyla yüklendi!');
            } else {
                alert(`Yükleme başarısız: ${data.error}`);
            }
        } catch (error) {
            console.error('Upload error details:', error);
            alert(`Yükleme başarısız: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleBulkUpload = async () => {
        if (selectedFiles.length === 0 || !bulkMetadata.company) {
            alert('Lütfen dosyalar ve şirket seçin');
            return;
        }

        setIsUploading(true);
        const results: { success: number; failed: number; errors: string[] } = {
            success: 0,
            failed: 0,
            errors: []
        };

        for (const file of selectedFiles) {
            try {
                // Auto-detect metadata for each file
                const detectedCompany = detectBISTCompanyFromFilename(file.name) || bulkMetadata.company;
                const filename = file.name.toLowerCase();
                
                let detectedQuarter = '';
                // Enhanced Turkish quarter detection patterns
                if (filename.includes('q1') || filename.includes('1-ceyrek') || filename.includes('1ceyrek') || 
                    filename.includes('birinci') || filename.includes('first') || filename.includes('i.ceyrek') ||
                    filename.includes('1.ceyrek') || filename.includes('1 ceyrek')) {
                    detectedQuarter = 'Q1';
                } else if (filename.includes('q2') || filename.includes('2-ceyrek') || filename.includes('2ceyrek') || 
                          filename.includes('ikinci') || filename.includes('second') || filename.includes('ii.ceyrek') ||
                          filename.includes('2.ceyrek') || filename.includes('2 ceyrek')) {
                    detectedQuarter = 'Q2';
                } else if (filename.includes('q3') || filename.includes('3-ceyrek') || filename.includes('3ceyrek') || 
                          filename.includes('ucuncu') || filename.includes('üçüncü') || filename.includes('third') || 
                          filename.includes('iii.ceyrek') || filename.includes('3.ceyrek') || filename.includes('3 ceyrek')) {
                    detectedQuarter = 'Q3';
                } else if (filename.includes('q4') || filename.includes('4-ceyrek') || filename.includes('4ceyrek') || 
                          filename.includes('dorduncu') || filename.includes('dördüncü') || filename.includes('fourth') || 
                          filename.includes('iv.ceyrek') || filename.includes('4.ceyrek') || filename.includes('4 ceyrek')) {
                    detectedQuarter = 'Q4';
                }
                
                const yearMatch = filename.match(/20\d{2}/);
                const detectedYear = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
                
                let detectedDocType = bulkMetadata.documentType;
                if (filename.includes('sunum') || filename.includes('presentation')) detectedDocType = 'presentation';
                else if (filename.includes('yillik') || filename.includes('annual')) detectedDocType = 'annual';

                const formData = new FormData();
                formData.append('file', file);
                formData.append('metadata', JSON.stringify({
                    company: detectedCompany.toLowerCase(),
                    quarter: detectedQuarter,
                    year: detectedYear,
                    documentType: detectedDocType
                }));

                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (response.ok) {
                    results.success++;
                } else {
                    const data = await response.json();
                    results.failed++;
                    results.errors.push(`${file.name}: ${data.error}`);
                }
            } catch (error) {
                results.failed++;
                results.errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
            }
        }

        setIsUploading(false);
        
        if (results.success > 0) {
            onUploadSuccess();
        }
        
        let message = `Toplu yükleme tamamlandı!\n✅ Başarılı: ${results.success}\n❌ Başarısız: ${results.failed}`;
        if (results.errors.length > 0) {
            message += '\n\nHatalar:\n' + results.errors.slice(0, 5).join('\n');
            if (results.errors.length > 5) {
                message += `\n... ve ${results.errors.length - 5} hata daha`;
            }
        }
        
        alert(message);
        
        // Reset bulk form
        setSelectedFiles([]);
        setBulkMetadata({ company: '', documentType: 'quarterly' });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-6">
            {/* Upload Mode Toggle */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button
                        type="button"
                        onClick={() => {
                            setIsBulkMode(false);
                            setSelectedFiles([]);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                            !isBulkMode 
                                ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Tekli Yükleme
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setIsBulkMode(true);
                            setSelectedFile(null);
                            if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                            }
                        }}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                            isBulkMode 
                                ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Toplu Yükleme
                    </button>
                </div>
            </div>

            {/* File Drop Zone */}
            <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragOver
                        ? 'border-blue-500 bg-blue-50'
                        : (isBulkMode ? selectedFiles.length > 0 : selectedFile)
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
                    multiple={isBulkMode}
                    onChange={handleFileInput}
                    className="hidden"
                />

                {isBulkMode ? (
                    selectedFiles.length > 0 ? (
                        <div className="space-y-2">
                            <DocumentIcon className="h-12 w-12 text-green-500 mx-auto" />
                            <p className="text-green-700 font-medium">{selectedFiles.length} dosya seçildi</p>
                            <div className="text-sm text-gray-600 max-h-20 overflow-y-auto">
                                {selectedFiles.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between px-2 py-1">
                                        <span className="truncate">
                                            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeFile(index);
                                            }}
                                            className="ml-2 text-red-500 hover:text-red-700"
                                        >
                                            <XMarkIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto" />
                            <p className="text-gray-600">
                                <span className="font-medium">Toplu yükleme için tıklayın</span> veya sürükleyip bırakın
                            </p>
                            <p className="text-sm text-gray-500">Birden fazla PDF dosyası, her biri maksimum 10MB</p>
                        </div>
                    )
                ) : (
                    selectedFile ? (
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
                                <span className="font-medium">Yüklemek için tıklayın</span> veya sürükleyip bırakın
                            </p>
                            <p className="text-sm text-gray-500">PDF dosyaları, maksimum 10MB</p>
                        </div>
                    )
                )}
            </div>

            {/* Metadata Form */}
            <div className="grid grid-cols-1 gap-4">
                {!isBulkMode && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                BIST Şirketi *
                            </label>
                            <select
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                className="w-full px-3 py-2 border-2 rounded-md focus:outline-none transition-all duration-300"
                                style={{
                                    borderColor: 'hsl(47, 96%, 50%)',
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = 'hsl(47, 96%, 60%)';
                                    e.currentTarget.style.boxShadow = '0 0 0 3px hsl(47, 96%, 50%, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = 'hsl(47, 96%, 50%)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                                required
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
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Çeyrek
                                </label>
                                <select
                                    value={quarter}
                                    onChange={(e) => setQuarter(e.target.value)}
                                    className="w-full px-3 py-2 border-2 rounded-md focus:outline-none transition-all duration-300"
                                    style={{
                                        borderColor: 'hsl(47, 96%, 50%)',
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = 'hsl(47, 96%, 60%)';
                                        e.currentTarget.style.boxShadow = '0 0 0 3px hsl(47, 96%, 50%, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = 'hsl(47, 96%, 50%)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <option value="">Çeyrek Seçin</option>
                                    <option value="Q1">Q1 - 1. Çeyrek</option>
                                    <option value="Q2">Q2 - 2. Çeyrek</option>
                                    <option value="Q3">Q3 - 3. Çeyrek</option>
                                    <option value="Q4">Q4 - 4. Çeyrek</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Yıl
                                </label>
                                <input
                                    type="number"
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                    min="2019"
                                    max="2030"
                                    className="w-full px-3 py-2 border-2 rounded-md focus:outline-none transition-all duration-300"
                                    style={{
                                        borderColor: 'hsl(47, 96%, 50%)',
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = 'hsl(47, 96%, 60%)';
                                        e.currentTarget.style.boxShadow = '0 0 0 3px hsl(47, 96%, 50%, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = 'hsl(47, 96%, 50%)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Belge Türü
                                </label>
                                <select
                                    value={documentType}
                                    onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                                    className="w-full px-3 py-2 border-2 rounded-md focus:outline-none transition-all duration-300"
                                    style={{
                                        borderColor: 'hsl(47, 96%, 50%)',
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = 'hsl(47, 96%, 60%)';
                                        e.currentTarget.style.boxShadow = '0 0 0 3px hsl(47, 96%, 50%, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = 'hsl(47, 96%, 50%)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </>
                )}

                {isBulkMode && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Toplu Yükleme Ayarları</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Varsayılan Şirket *
                                </label>
                                <select
                                    value={bulkMetadata.company}
                                    onChange={(e) => setBulkMetadata({...bulkMetadata, company: e.target.value})}
                                    className="w-full px-3 py-2 border-2 rounded-md focus:outline-none transition-all duration-300"
                                    style={{
                                        borderColor: 'hsl(47, 96%, 50%)',
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = 'hsl(47, 96%, 60%)';
                                        e.currentTarget.style.boxShadow = '0 0 0 3px hsl(47, 96%, 50%, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = 'hsl(47, 96%, 50%)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                    required
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
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Varsayılan Belge Türü
                                </label>
                                <select
                                    value={bulkMetadata.documentType}
                                    onChange={(e) => setBulkMetadata({...bulkMetadata, documentType: e.target.value as DocumentType})}
                                    className="w-full px-3 py-2 border-2 rounded-md focus:outline-none transition-all duration-300"
                                    style={{
                                        borderColor: 'hsl(47, 96%, 50%)',
                                    }}
                                >
                                    {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            * Dosya adlarından otomatik olarak çeyrek, yıl ve belge türü tespit edilecek
                        </p>
                    </div>
                )}
            </div>

            {/* Upload Button */}
            {isBulkMode ? (
                <button
                    onClick={handleBulkUpload}
                    disabled={selectedFiles.length === 0 || !bulkMetadata.company || isUploading}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isUploading ? 'Yükleniyor...' : `${selectedFiles.length} Dosyayı Toplu Yükle`}
                </button>
            ) : (
                <button
                    onClick={handleSingleUpload}
                    disabled={!selectedFile || !company || isUploading}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isUploading ? 'Yükleniyor...' : 'PDF Yükle'}
                </button>
            )}
        </div>
    );
}