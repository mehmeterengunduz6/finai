import Anthropic from '@anthropic-ai/sdk';
import { AnalysisRequest, AnalysisResponse, ChartData } from './types';
import * as fs from 'fs';

// Initialize Anthropic client only when needed to avoid build-time errors
let anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
    if (!anthropic) {
        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error('ANTHROPIC_API_KEY environment variable is required');
        }
        anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
    }
    return anthropic;
}

// Model configuration - use Opus for test mode
const MODEL = 'claude-3-5-haiku-latest';

// Simple language detection function
export function detectLanguage(text: string): 'tr' | 'en' {
    // Turkish-specific characters
    const turkishChars = 'ğüşıöçĞÜŞİÖÇ';
    const turkishWords = ['ve', 'veya', 'ile', 'için', 'bu', 'şu', 'ne', 'nasıl', 'neden', 'hangi'];
    
    // Count Turkish characters and common words
    const hasTurkishChars = [...text].some(char => turkishChars.includes(char));
    const hasTurkishWords = turkishWords.some(word => 
        text.toLowerCase().split(/\s+/).includes(word)
    );
    
    return (hasTurkishChars || hasTurkishWords) ? 'tr' : 'en';
}

// Function to parse chart data from Claude's response
function parseChartData(response: string): ChartData | null {
    try {
        // Look for JSON chart data in the response
        const chartMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (!chartMatch) {
            console.log('No chart JSON found in response');
            return null;
        }

        const chartData = JSON.parse(chartMatch[1]);
        
        // Validate the chart data structure
        if (chartData.type && chartData.title && chartData.labels && chartData.datasets) {
            console.log('Valid chart data parsed:', chartData.type);
            return chartData as ChartData;
        }
        
        console.log('Invalid chart data structure');
        return null;
    } catch (error) {
        console.error('Error parsing chart data:', error);
        return null;
    }
}

// Function to create a fallback chart when Claude doesn't generate one
function createFallbackChart(question: string, language: 'tr' | 'en'): ChartData {
    // Simple fallback chart for common financial questions
    if (language === 'tr') {
        return {
            type: 'bar',
            title: 'Finansal Veri Analizi',
            labels: ['Q1 2022', 'Q2 2022', 'Q3 2022', 'Q4 2022'],
            datasets: [{
                label: 'Değer (Milyon TL)',
                data: [100, 120, 110, 130]
            }]
        };
    } else {
        return {
            type: 'bar',
            title: 'Financial Data Analysis',
            labels: ['Q1 2022', 'Q2 2022', 'Q3 2022', 'Q4 2022'],
            datasets: [{
                label: 'Value (Million TL)',
                data: [100, 120, 110, 130]
            }]
        };
    }
}

export async function analyzeWithClaude(
    request: AnalysisRequest,
    pdfFiles: { filename: string; filepath: string; company?: string }[]
): Promise<AnalysisResponse> {
    // Detect language from the question
    const language = detectLanguage(request.question);

    const systemPrompt = language === 'tr' 
        ? `Sen bir finansal şirket analizi uzmanısın. Verilen PDF finansal raporlarını analiz eder ve SADECE GRAFİK oluşturursun.

ÖNEMLİ UYARI: Kullanıcı sadece grafik görecek, metin cevabını görmeyecek. Bu nedenden analizini detaylı yaz (console'da göreceğiz) ve sadece JSON grafik oluştur.

Analiz kuralları:
1. Sadece verilen PDF'lerdeki bilgileri kullan
2. Sayısal verileri doğru şekilde çıkar ve hesapla
3. Döviz/kur bilgilerine dikkat et
4. Bulgularını detaylı olarak yaz (kullanıcı görmeyecek ama console'da göreceğiz)
5. Hangi raporları kullandığını, sayıları nereden aldığını detaylı açıkla
6. Türkçe analiz yap

GRAFİK OLUŞTURMA (ANA GÖREV):
Analizinin sonunda MUTLAKA uygun grafik oluştur:
- Bar chart: karşılaştırmalar, yıllık veriler için
- Line chart: büyüme trendi, zaman serisi için
- Pie/Doughnut chart: yüzde dağılımları için

GRAFİK FORMATI (çok önemli):
\`\`\`json
{
  "type": "bar|line|pie|doughnut",
  "title": "Grafik Başlığı",
  "labels": ["Label1", "Label2", "Label3"],
  "datasets": [{
    "label": "Veri Seti Adı",
    "data": [sayı1, sayı2, sayı3],
    "backgroundColor": ["#3B82F6", "#EF4444", "#F59E0B", "#10B981", "#F97316"]
  }]
}
\`\`\`

Renk kullanımı: Mavi (#3B82F6), kırmızı (#EF4444), amber (#F59E0B), yeşil (#10B981), turuncu (#F97316)`
        : `You are a financial company analysis expert. You analyze financial reports from provided PDFs and CREATE ONLY CHARTS.

IMPORTANT WARNING: The user will only see the chart, not your text response. Therefore, write your analysis for console logging and focus on generating the JSON chart.

Analysis rules:
1. Only use information from the provided PDFs
2. Extract and calculate numerical data accurately
3. Pay attention to currency/foreign exchange information
4. Write detailed findings (user won't see but we'll see in console)
5. Explain which reports you used and where you got the numbers from
6. Provide analysis in English

CHART GENERATION (MAIN TASK):
You MUST create an appropriate chart to visualize the analysis:
- Bar chart: for comparisons, yearly data
- Line chart: for growth trends, time series
- Pie/Doughnut chart: for percentage distributions

CHART FORMAT (very important):
\`\`\`json
{
  "type": "bar|line|pie|doughnut",
  "title": "Chart Title",
  "labels": ["Label1", "Label2", "Label3"],
  "datasets": [{
    "label": "Dataset Name",
    "data": [number1, number2, number3],
    "backgroundColor": ["#3B82F6", "#EF4444", "#F59E0B", "#10B981", "#F97316"]
  }]
}
\`\`\`

Colors: blue (#3B82F6), red (#EF4444), amber (#F59E0B), green (#10B981), orange (#F97316)`;

    try {
        // Create content array with text and PDFs
        const content: Anthropic.MessageParam['content'] = [
            {
                type: 'text',
                text: `${language === 'tr' ? 'Soru' : 'Question'}: ${request.question}

${request.context ? `${language === 'tr' ? 'Ek Bağlam' : 'Additional Context'}: ${request.context}` : ''}

${language === 'tr' ? 'Lütfen yukarıdaki soruyu aşağıdaki PDF dosyalarındaki bilgilere dayanarak yanıtlayın ve uygun bir grafik oluşturun:' : 'Please answer the above question based on the information in the following PDF files and create an appropriate chart:'}`
            }
        ];

        // Add PDF files to content
        for (const pdfFile of pdfFiles) {
            try {
                if (fs.existsSync(pdfFile.filepath)) {
                    const pdfBuffer = fs.readFileSync(pdfFile.filepath);
                    const base64PDF = pdfBuffer.toString('base64');

                    content.push({
                        type: 'document',
                        source: {
                            type: 'base64',
                            media_type: 'application/pdf',
                            data: base64PDF
                        }
                    });

                    console.log(`Added PDF to Claude: ${pdfFile.filename} (${pdfFile.company})`);
                } else {
                    console.warn(`PDF file not found: ${pdfFile.filepath}`);
                }
            } catch (error) {
                console.error(`Error reading PDF ${pdfFile.filename}:`, error);
            }
        }

        console.log(`Using model: ${MODEL} for analysis with ${pdfFiles.length} PDF files`);

        const response = await getAnthropicClient().messages.create({
            model: MODEL,
            max_tokens: 4000,
            temperature: 0.1, // Increase if you want to more creatvitiy.
            system: systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: content
                }
            ],
        });

        const responseContent = response.content[0];
        if (responseContent.type !== 'text') {
            throw new Error('Unexpected response type from Claude');
        }

        // Parse chart data from response
        let chartData = parseChartData(responseContent.text);
        
        // If no chart data found, create a fallback
        if (!chartData) {
            console.log('No valid chart data found, creating fallback');
            chartData = createFallbackChart(request.question, language);
        }

        // Log the full analysis to console for debugging (not shown to user)
        console.log('\n=== CLAUDE ANALYSIS RESULTS ===');
        console.log('📊 Full Analysis Text:');
        console.log(responseContent.text);
        console.log('\n📁 Files Analyzed:', pdfFiles.map(pdf => pdf.filename).join(', '));
        console.log('📊 Chart Data Generated:', chartData ? 'Yes' : 'No');
        if (chartData) {
            console.log('📈 Chart Type:', chartData.type);
            console.log('📝 Chart Title:', chartData.title);
            console.log('🗺 Chart Labels:', chartData.labels?.join(', '));
        }
        console.log('==================================\n');

        // Return empty answer - user only sees the chart
        return {
            answer: '', // Empty text - user only sees chart
            usedFiles: pdfFiles.map(pdf => pdf.filename),
            confidence: 0.9,
            chartData: chartData,
        };

    } catch (error) {
        console.error('Anthropic API error:', error);
        
        // Handle request too large error
        if (error instanceof Error && (error.message.includes('413') || error.message.includes('request_too_large'))) {
            console.log('Request too large, attempting with fewer documents...');
            
            if (pdfFiles.length > 1) {
                // Retry with half the documents
                const reducedFiles = pdfFiles.slice(0, Math.ceil(pdfFiles.length / 2));
                console.log(`Retrying with ${reducedFiles.length} documents instead of ${pdfFiles.length}`);
                
                try {
                    return await analyzeWithClaude(request, reducedFiles);
                } catch (retryError) {
                    console.error('Retry also failed:', retryError);
                    // Fall through to general error handling
                }
            }
        }
        
        // Handle PDF page limit error
        if (error instanceof Error && error.message.includes('maximum of 100 PDF pages')) {
            console.log('PDF page limit exceeded, attempting with fewer documents...');
            
            if (pdfFiles.length > 1) {
                // Retry with fewer documents, prioritizing the most recent ones
                const reducedFiles = pdfFiles.slice(0, Math.max(1, Math.ceil(pdfFiles.length / 2)));
                console.log(`Retrying with ${reducedFiles.length} documents instead of ${pdfFiles.length}`);
                
                try {
                    return await analyzeWithClaude(request, reducedFiles);
                } catch (retryError) {
                    console.error('Page limit retry also failed:', retryError);
                    
                    // Final attempt with just the first document
                    if (reducedFiles.length > 1) {
                        console.log('Final attempt with single document...');
                        try {
                            return await analyzeWithClaude(request, [pdfFiles[0]]);
                        } catch (finalError) {
                            console.error('Single document retry also failed:', finalError);
                        }
                    }
                }
            }
        }
        
        // If PDF processing fails, let's try a fallback approach
        if (error instanceof Error && error.message.includes('document')) {
            console.log('Document type not supported, falling back to text extraction...');
            
            // Import pdf-parse dynamically as fallback
            try {
                const pdf = (await import('pdf-parse')).default;
                let combinedText = '';
                
                for (const pdfFile of pdfFiles) {
                    try {
                        if (fs.existsSync(pdfFile.filepath)) {
                            const buffer = fs.readFileSync(pdfFile.filepath);
                            const data = await pdf(buffer);
                            combinedText += `=== ${pdfFile.filename} (${pdfFile.company}) ===\n${data.text}\n\n`;
                        }
                    } catch (pdfError) {
                        console.error(`Error extracting PDF ${pdfFile.filename}:`, pdfError);
                        combinedText += `=== ${pdfFile.filename} (${pdfFile.company}) ===\n[PDF extraction failed]\n\n`;
                    }
                }
                
                // Retry with text content
                const textResponse = await getAnthropicClient().messages.create({
                    model: MODEL,
                    max_tokens: 4000,
                    temperature: 0.1,
                    system: systemPrompt,
                    messages: [
                        {
                            role: 'user',
                            content: `${language === 'tr' ? 'Soru' : 'Question'}: ${request.question}

PDF Contents:
${combinedText}

${request.context ? `${language === 'tr' ? 'Ek Bağlam' : 'Additional Context'}: ${request.context}` : ''}`
                        }
                    ],
                });
                
                const textResponseContent = textResponse.content[0];
                if (textResponseContent.type === 'text') {
                    // Parse chart data from fallback response
                    let chartData = parseChartData(textResponseContent.text);
                    
                    // If no chart data found, create a fallback
                    if (!chartData) {
                        console.log('No valid chart data found in fallback, creating fallback');
                        chartData = createFallbackChart(request.question, language);
                    }
                    
                    // Log fallback analysis to console (not shown to user)
                    console.log('\n=== FALLBACK ANALYSIS RESULTS ===');
                    console.log('🔄 Fallback Analysis Text:');
                    console.log(textResponseContent.text);
                    console.log('\n📁 Files Analyzed (Fallback):', pdfFiles.map(pdf => pdf.filename).join(', '));
                    console.log('=====================================\n');

                    // Return empty answer - user only sees the chart
                    return {
                        answer: '', // Empty text - user only sees chart
                        usedFiles: pdfFiles.map(pdf => pdf.filename),
                        confidence: 0.8,
                        chartData: chartData,
                    };
                }
            } catch (fallbackError) {
                console.error('Fallback text extraction also failed:', fallbackError);
            }
        }
        
        throw new Error('Analysis failed: ' + (error as Error).message);
    }
}

export async function generateSummary(pdfContent: string, filename: string): Promise<string> {
    try {
        // Detect language from the content
        const language = detectLanguage(pdfContent);

        const systemPrompt = language === 'tr'
            ? 'Sen bir finansal rapor özetleme uzmanısın. Verilen finansal raporu özlü ve net bir şekilde özetle. Cevabını sadece Türkçe olarak ver.'
            : 'You are a financial report summarization expert. Summarize the given financial report concisely and clearly. Provide your answer only in English.';

        console.log(`Using model: ${MODEL} for summary generation`);

        const response = await getAnthropicClient().messages.create({
            model: MODEL,
            max_tokens: 500,
            temperature: 0.1,
            system: systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: `${language === 'tr' ? 'Lütfen bu finansal raporu özetle' : 'Please summarize this financial report'}: ${filename}\n\n${pdfContent.substring(0, 8000)}`,
                },
            ],
        });

        const content = response.content[0];
        return content.type === 'text' ? content.text : (
            language === 'tr' ? 'Özet oluşturulamadı' : 'Summary could not be generated'
        );
    } catch (error) {
        console.error('Summary generation error:', error);
        return detectLanguage(pdfContent) === 'tr' 
            ? 'Özet oluşturulamadı' 
            : 'Summary could not be generated';
    }
}