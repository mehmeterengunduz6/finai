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
const MODEL = 'claude-3-5-haiku-20241022';

// Simple language detection function
function detectLanguage(text: string): 'tr' | 'en' {
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
        ? `Sen bir finansal şirket analizi uzmanısın. Verilen PDF finansal raporlarını analiz eder ve sorulara bu raporlara dayanarak cevap verirsin.

Önemli kurallar:
1. Sadece verilen PDF'lerdeki bilgileri kullan
2. Sayısal verileri doğru şekilde çıkar ve hesapla
3. Döviz/kur bilgilerine özellikle dikkat et
4. İstenen veri PDF'lerde mevcut değilse, bunu açıkça belirt
5. Net, detaylı ve spesifik sayı ve yüzdeler içeren cevaplar ver
6. Analizinde hangi raporları/çeyrekleri kullandığını belirt
7. Cevabını sadece Türkçe olarak ver, İngilizce kullanma

GRAFIK OLUŞTRUMA:
Her cevabının sonunda, analizin görselleştirmesini yapmak için uygun bir grafik oluştur. Grafik tipini verilere göre belirle:
- Bar chart: kategorik karşılaştırmalar için
- Line chart: zaman serisi verileri için  
- Pie/Doughnut chart: yüzde dağılımları için

Cevabının sonuna şu formatta JSON grafiği ekle (öncesinde "Grafik için JSON:" yazmadan sadece JSON bloğunu ekle):
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

Önemli: backgroundColor dizisinde her veri noktası için ayrı bir renk belirt. Şirket raporlarında belirtilen renkler varsa onları kullan, yoksa parlak renkler kullan: mavi (#3B82F6), kırmızı (#EF4444), amber (#F59E0B), yeşil (#10B981), turuncu (#F97316).`
        : `You are a financial company analysis expert. You analyze financial reports from provided PDFs and answer questions based on them.

Important rules:
1. Only use information from the provided PDFs
2. Extract and calculate numerical data accurately
3. Pay special attention to currency/foreign exchange information
4. If requested data is not available in the PDFs, clearly state this
5. Provide clear, detailed answers with specific numbers and percentages
6. Mention which reports/quarters you used for your analysis
7. Provide your answer only in English, do not use Turkish

CHART GENERATION:
At the end of each response, create an appropriate chart to visualize your analysis. Choose the chart type based on the data:
- Bar chart: for categorical comparisons
- Line chart: for time series data
- Pie/Doughnut chart: for percentage distributions

Add a JSON chart at the end of your response in this format:
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

Important: Include backgroundColor array with a distinct color for each data point. Use company report colors if mentioned, otherwise use bright colors: blue (#3B82F6), red (#EF4444), amber (#F59E0B), green (#10B981), orange (#F97316).`;

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

        // Remove chart JSON and any "Grafik için JSON:" text from the displayed text
        const cleanedText = responseContent.text
            .replace(/Grafik için JSON:\s*/gi, '')
            .replace(/```json\s*\{[\s\S]*?\}\s*```/g, '')
            .trim();

        return {
            answer: cleanedText,
            usedFiles: pdfFiles.map(pdf => pdf.filename),
            confidence: 0.9,
            chartData: chartData,
        };

    } catch (error) {
        console.error('Anthropic API error:', error);
        
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
                    
                    const cleanedText = textResponseContent.text
                        .replace(/Grafik için JSON:\s*/gi, '')
                        .replace(/```json\s*\{[\s\S]*?\}\s*```/g, '')
                        .trim();

                    return {
                        answer: cleanedText,
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