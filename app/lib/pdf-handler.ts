import * as fs from 'fs';
import * as path from 'path';
import { UploadedPDF } from './types';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const COMPANIES_DIR = path.join(UPLOAD_DIR, 'companies');

// Upload klasörünü oluştur
if (!fs.existsSync(COMPANIES_DIR)) {
    fs.mkdirSync(COMPANIES_DIR, { recursive: true });
}

export function getCompanies(): string[] {
    try {
        if (!fs.existsSync(COMPANIES_DIR)) {
            return [];
        }

        return fs.readdirSync(COMPANIES_DIR, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name)
            .sort();
    } catch (error) {
        console.error('Could not get companies:', error);
        return [];
    }
}

export async function savePDF(file: File, metadata?: Partial<UploadedPDF>): Promise<UploadedPDF> {
    try {
        const company = metadata?.company || 'default';
        const companyDir = path.join(COMPANIES_DIR, company);

        console.log('UPLOAD_DIR:', UPLOAD_DIR); // Debug
        console.log('COMPANIES_DIR:', COMPANIES_DIR); // Debug
        console.log('Target company dir:', companyDir); // Debug

        // Şirket klasörünü oluştur
        if (!fs.existsSync(companyDir)) {
            console.log('Creating company directory:', companyDir); // Debug
            fs.mkdirSync(companyDir, { recursive: true });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filepath = path.join(companyDir, filename);

        console.log('Full file path:', filepath); // Debug
        console.log('File size:', buffer.length); // Debug

        // Dosyayı kaydet
        fs.writeFileSync(filepath, buffer);
        console.log('File saved successfully'); // Debug

        // Get page count for the PDF
        let pageCount = 0;
        try {
            const pdf = (await import('pdf-parse')).default;
            const pdfData = await pdf(buffer);
            pageCount = pdfData.numpages || 0;
            console.log(`PDF ${filename} has ${pageCount} pages`);
        } catch (error) {
            console.warn(`Could not get page count for ${filename}:`, error);
            pageCount = 10; // Assume average of 10 pages if we can't determine
        }

        // Metadata oluştur
        const pdfInfo: UploadedPDF = {
            id: Date.now().toString(),
            filename,
            originalName: file.name,
            uploadDate: new Date(),
            size: file.size,
            quarter: metadata?.quarter,
            year: metadata?.year,
            company: company,
            documentType: (metadata as any)?.documentType,
            sector: (metadata as any)?.sector,
            language: (metadata as any)?.language || 'tr',
            pageCount: pageCount
        };

        // Metadata'yı JSON olarak kaydet
        const metadataFile = path.join(companyDir, `${filename}.meta.json`);
        console.log('Saving metadata to:', metadataFile); // Debug
        fs.writeFileSync(metadataFile, JSON.stringify(pdfInfo, null, 2));

        return pdfInfo;
    } catch (error) {
        console.error('PDF save error:', error);
        console.error('Error details:', {
            UPLOAD_DIR,
            COMPANIES_DIR,
            company: metadata?.company,
        }); // Debug
        throw new Error('PDF could not be saved: ' + (error as Error).message);
    }
}

export async function extractTextFromPDF(filename: string, company?: string): Promise<string> {
    try {
        let filepath: string | undefined;

        if (company) {
            filepath = path.join(COMPANIES_DIR, company, filename);
        } else {
            // Backward compatibility - search in all companies
            const companies = getCompanies();
            let found = false;

            for (const comp of companies) {
                const testPath = path.join(COMPANIES_DIR, comp, filename);
                if (fs.existsSync(testPath)) {
                    filepath = testPath;
                    found = true;
                    break;
                }
            }

            if (!found) {
                throw new Error(`PDF not found: ${filename}`);
            }
        }

        if (!filepath || !fs.existsSync(filepath)) {
            throw new Error(`PDF not found: ${filename}`);
        }

        console.log('Reading PDF from:', filepath); // Debug

        // Dynamic import to avoid issues with pdf-parse
        const pdf = (await import('pdf-parse')).default;
        const buffer = fs.readFileSync(filepath);
        
        console.log('PDF buffer size:', buffer.length); // Debug
        
        const data = await pdf(buffer);
        
        console.log('Extracted text length:', data.text.length); // Debug
        
        return data.text;
    } catch (error) {
        console.error('PDF text extraction error:', error);
        
        // Fallback to basic file info if PDF parsing fails
        const fallbackText = `[PDF Content from ${company}/${filename}]
        
Unable to extract text content from this PDF file. 
This might be a scanned document or have text extraction issues.
File: ${filename}
Company: ${company}

Please ensure the PDF contains extractable text content.`;
        
        return fallbackText;
    }
}

export async function getAllPDFs(company?: string): Promise<UploadedPDF[]> {
    try {
        console.log('Getting PDFs, company filter:', company);
        console.log('Companies dir exists:', fs.existsSync(COMPANIES_DIR));

        if (!fs.existsSync(COMPANIES_DIR)) {
            console.log('Companies directory does not exist, creating...');
            fs.mkdirSync(COMPANIES_DIR, { recursive: true });
            return [];
        }

        const pdfs: UploadedPDF[] = [];
        const companies = company ? [company] : getCompanies();

        console.log('Available companies:', companies);

        for (const comp of companies) {
            const companyDir = path.join(COMPANIES_DIR, comp);

            if (!fs.existsSync(companyDir)) {
                console.log(`Company dir does not exist: ${companyDir}`);
                continue;
            }

            const files = fs.readdirSync(companyDir);
            const metadataFiles = files.filter(file => file.endsWith('.meta.json'));

            console.log(`Found ${metadataFiles.length} metadata files in ${comp}`);

            for (const metaFile of metadataFiles) {
                try {
                    const metaPath = path.join(companyDir, metaFile);
                    const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

                    // PDF dosyasının hala var olduğunu kontrol et
                    const pdfPath = path.join(companyDir, metadata.filename);
                    if (fs.existsSync(pdfPath)) {
                        // Add page count if missing (for older uploads)
                        let pageCount = metadata.pageCount;
                        if (!pageCount) {
                            try {
                                const pdf = (await import('pdf-parse')).default;
                                const buffer = fs.readFileSync(pdfPath);
                                const pdfData = await pdf(buffer);
                                pageCount = pdfData.numpages || 10;
                                
                                // Update metadata file with page count
                                const updatedMetadata = { ...metadata, pageCount };
                                fs.writeFileSync(metaPath, JSON.stringify(updatedMetadata, null, 2));
                                console.log(`Added page count (${pageCount}) to ${metadata.filename}`);
                            } catch (error) {
                                console.warn(`Could not get page count for ${metadata.filename}:`, error);
                                pageCount = 10; // Default estimate
                            }
                        }
                        
                        pdfs.push({
                            ...metadata,
                            uploadDate: new Date(metadata.uploadDate),
                            company: comp,
                            pageCount: pageCount
                        });
                    } else {
                        console.log(`PDF file missing: ${pdfPath}`);
                    }
                } catch (error) {
                    console.error(`Metadata could not be read: ${metaFile}`, error);
                }
            }
        }

        console.log(`Total PDFs found: ${pdfs.length}`);

        return pdfs.sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime());
    } catch (error) {
        console.error('PDF list could not be retrieved:', error);
        return [];
    }
}

export function deletePDF(filename: string, company: string): boolean {
    try {
        const companyDir = path.join(COMPANIES_DIR, company);
        const filepath = path.join(companyDir, filename);
        const metaPath = path.join(companyDir, `${filename}.meta.json`);

        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }

        if (fs.existsSync(metaPath)) {
            fs.unlinkSync(metaPath);
        }

        return true;
    } catch (error) {
        console.error('PDF could not be deleted:', error);
        return false;
    }
}

export async function extractMultiplePDFs(filenames: string[], company?: string): Promise<{ filename: string; content: string; company?: string }[]> {
    const results = [];

    for (const filename of filenames) {
        try {
            const content = await extractTextFromPDF(filename, company);
            results.push({ filename, content, company });
        } catch (error) {
            console.error(`PDF could not be extracted: ${filename}`, error);
        }
    }

    return results;
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}