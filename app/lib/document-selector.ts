import { UploadedPDF } from './types';

export interface DocumentScore {
  pdf: UploadedPDF;
  score: number;
  reasons: string[];
}

export interface DocumentSelectionResult {
  selectedPDFs: UploadedPDF[];
  totalScore: number;
  selectionReasons: string[];
  droppedPDFs: UploadedPDF[];
}

// Keywords for different types of financial queries
const QUERY_KEYWORDS = {
  revenue: ['gelir', 'revenue', 'hasılat', 'satış', 'income'],
  profit: ['kar', 'profit', 'net kar', 'net profit', 'kazanç'],
  loss: ['zarar', 'loss', 'kayıp'],
  financial: ['finansal', 'financial', 'mali', 'economic'],
  quarterly: ['çeyrek', 'quarter', 'quarterly', 'q1', 'q2', 'q3', 'q4'],
  annual: ['yıllık', 'annual', 'yearly', 'senelik'],
  growth: ['büyüme', 'growth', 'artış', 'increase'],
  comparison: ['karşılaştır', 'compare', 'vs', 'göre', 'compared'],
  trend: ['trend', 'eğilim', 'değişim', 'change'],
  recent: ['son', 'recent', 'latest', 'güncel', 'current'],
  historical: ['geçmiş', 'historical', 'önceki', 'previous', 'eski']
};

// Timeframe patterns for intelligent date range extraction
const TIMEFRAME_PATTERNS = [
  { pattern: /(?:son|last|past)\s+(\d+)\s+(?:yıl|year|years)/i, type: 'years' },
  { pattern: /(?:son|last|past)\s+(\d+)\s+(?:ay|month|months)/i, type: 'months' },
  { pattern: /(?:son|last|past)\s+(\d+)\s+(?:çeyrek|quarter|quarters)/i, type: 'quarters' },
  { pattern: /(\d{4})\s*-\s*(\d{4})/i, type: 'year_range' },
  { pattern: /(\d{4})\s+(?:yılı|year)/i, type: 'single_year' }
];

export interface TimeframeContext {
  years?: number;
  months?: number;
  quarters?: number;
  yearRange?: [number, number];
  singleYear?: number;
  type: 'years' | 'months' | 'quarters' | 'year_range' | 'single_year';
}

export interface QueryContext {
  timeframe?: TimeframeContext;
  informationType: 'annual_summary' | 'quarterly_detail' | 'trend_analysis' | 'general';
  preferredDocumentTypes: string[];
  needsComprehensiveData: boolean;
}

// Intelligent query analysis functions
function extractTimeframeFromQuery(query: string): TimeframeContext | null {
  for (const { pattern, type } of TIMEFRAME_PATTERNS) {
    const match = query.match(pattern);
    if (match) {
      switch (type) {
        case 'years':
          return { years: parseInt(match[1]), type: 'years' };
        case 'months':
          return { months: parseInt(match[1]), type: 'months' };
        case 'quarters':
          return { quarters: parseInt(match[1]), type: 'quarters' };
        case 'year_range':
          return { yearRange: [parseInt(match[1]), parseInt(match[2])], type: 'year_range' };
        case 'single_year':
          return { singleYear: parseInt(match[1]), type: 'single_year' };
      }
    }
  }
  return null;
}

function analyzeQueryContext(query: string): QueryContext {
  const lowerQuery = query.toLowerCase();
  const timeframe = extractTimeframeFromQuery(query);
  
  // Determine information type based on query content
  let informationType: QueryContext['informationType'] = 'general';
  let preferredDocumentTypes: string[] = [];
  let needsComprehensiveData = false;

  // Check for annual summary indicators (revenue, profit, total performance)
  const hasAnnualSummaryKeywords = [
    ...QUERY_KEYWORDS.revenue,
    ...QUERY_KEYWORDS.profit,
    'toplam', 'total', 'genel', 'overall', 'summary', 'özet'
  ].some(keyword => lowerQuery.includes(keyword));

  // Check for trend analysis indicators
  const hasTrendKeywords = [
    ...QUERY_KEYWORDS.trend,
    ...QUERY_KEYWORDS.growth,
    ...QUERY_KEYWORDS.comparison,
    'değişim', 'change', 'artış', 'azalış', 'increase', 'decrease'
  ].some(keyword => lowerQuery.includes(keyword));

  // Check for quarterly detail needs
  const hasQuarterlyKeywords = QUERY_KEYWORDS.quarterly.some(keyword => lowerQuery.includes(keyword));

  if (hasAnnualSummaryKeywords && timeframe?.type === 'years') {
    // For annual data requests (like "last 5 years revenue and profit")
    informationType = 'annual_summary';
    preferredDocumentTypes = ['annual', 'quarterly_q4', 'year_end'];
    needsComprehensiveData = false; // Don't need all quarters, just year-end data
  } else if (hasTrendKeywords || (timeframe && timeframe.type === 'years')) {
    informationType = 'trend_analysis';
    preferredDocumentTypes = ['annual', 'quarterly_q4'];
    needsComprehensiveData = timeframe ? timeframe.years > 3 : false;
  } else if (hasQuarterlyKeywords) {
    informationType = 'quarterly_detail';
    preferredDocumentTypes = ['quarterly', 'quarterly_q1', 'quarterly_q2', 'quarterly_q3', 'quarterly_q4'];
    needsComprehensiveData = true;
  } else {
    informationType = 'general';
    preferredDocumentTypes = ['quarterly', 'annual'];
    needsComprehensiveData = true;
  }

  return {
    timeframe,
    informationType,
    preferredDocumentTypes,
    needsComprehensiveData
  };
}

function getRelevantYearsForTimeframe(timeframe: TimeframeContext | null): number[] {
  // Since we're in 2025, we need to adjust the current year logic for financial data
  // Most financial reports are for previous years, so for "last 2 years" we want 2024 and 2023
  const currentYear = new Date().getFullYear();
  
  if (!timeframe) return [currentYear, currentYear - 1]; // Default to current and previous year
  
  switch (timeframe.type) {
    case 'years':
      // For "last N years", include the most recent complete years
      // Since we're in 2025, "last 2 years" should be 2024 and 2023
      return Array.from({ length: timeframe.years! }, (_, i) => (currentYear - 1) - i);
    case 'year_range':
      const [startYear, endYear] = timeframe.yearRange!;
      return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
    case 'single_year':
      return [timeframe.singleYear!];
    case 'quarters':
      // For quarter-based queries, focus on recent years
      const yearsForQuarters = Math.ceil(timeframe.quarters! / 4);
      return Array.from({ length: yearsForQuarters }, (_, i) => (currentYear - 1) - i);
    case 'months':
      // For month-based queries, focus on recent years
      const yearsForMonths = Math.ceil(timeframe.months! / 12);
      return Array.from({ length: yearsForMonths }, (_, i) => (currentYear - 1) - i);
    default:
      return [currentYear, currentYear - 1];
  }
}

function getPreferredQuartersForAnnualData(): number[] {
  // For annual summary data, Q4 and year-end reports are most comprehensive
  return [4]; // Q4 contains full year data
}

function shouldIncludeDocument(pdf: UploadedPDF, context: QueryContext): boolean {
  const pdfYear = pdf.year || extractYearFromFilename(pdf.filename);
  const relevantYears = getRelevantYearsForTimeframe(context.timeframe);
  
  // Filter by year relevance first
  if (pdfYear && relevantYears.length > 0 && !relevantYears.includes(pdfYear)) {
    return false;
  }
  
  // For annual summary requests, prefer Q4 and year-end documents
  if (context.informationType === 'annual_summary') {
    const filename = pdf.filename.toLowerCase();
    
    // Check filename for year-end indicators first (most reliable)
    const isYearEnd = filename.includes('yıl') && filename.includes('sonu') || // "yıl sonu" = year-end
                     filename.includes('year') && filename.includes('end') ||
                     filename.includes('annual') || filename.includes('yıllık') ||
                     filename.includes('31122') || filename.includes('1231') ||  // 31.12 date format
                     filename.includes('december') || filename.includes('aralık');
    
    if (isYearEnd) return true;
    
    // Check for quarterly indicators in filename that should be excluded
    const hasQuarterlyMarkers = filename.includes('çeyrek') || filename.includes('quarter') ||
                               filename.includes('q1') || filename.includes('q2') || filename.includes('q3') ||
                               filename.includes('1.çeyrek') || filename.includes('2.çeyrek') || filename.includes('3.çeyrek') ||
                               filename.includes('1ceyrek') || filename.includes('2ceyrek') || filename.includes('3ceyrek') ||
                               filename.includes('03.') || filename.includes('06.') || filename.includes('09.');  // Q1, Q2, Q3 dates
    
    // If it has quarterly markers, exclude it unless it's Q4
    if (hasQuarterlyMarkers) {
      const isQ4 = filename.includes('4.çeyrek') || filename.includes('4ceyrek') || 
                   filename.includes('q4') || filename.includes('12.') ||
                   filename.includes('december') || filename.includes('aralık');
      return isQ4;
    }
    
    // If document has quarter metadata
    const quarterNum = typeof pdf.quarter === 'string' ? parseInt(pdf.quarter) : pdf.quarter;
    if (quarterNum && quarterNum > 0) {
      return quarterNum === 4; // Only include Q4 for annual summary
    }
    
    // If no quarter info, check if it's clearly an annual report
    if (isAnnualReport(pdf)) {
      return true;
    }
    
    // For annual summary, be more selective - only include if it's clearly year-end data
    return false;
  }
  
  return true; // Include all documents for other query types
}

// Time relevance scoring
function getTimeRelevanceScore(pdf: UploadedPDF, query: string): number {
  const currentYear = new Date().getFullYear();
  const pdfYear = pdf.year || extractYearFromFilename(pdf.filename);
  
  if (!pdfYear) return 0;
  
  let score = 0;
  const yearDiff = currentYear - pdfYear;
  
  // Recent data is more valuable
  if (yearDiff === 0) score += 30; // Current year
  else if (yearDiff === 1) score += 25; // Last year
  else if (yearDiff <= 2) score += 20; // 2 years ago
  else if (yearDiff <= 3) score += 15; // 3 years ago
  else if (yearDiff <= 5) score += 10; // Up to 5 years
  else score += 5; // Older than 5 years
  
  // Check if query asks for historical data
  const hasHistoricalKeywords = QUERY_KEYWORDS.historical.some(keyword => 
    query.toLowerCase().includes(keyword)
  );
  
  if (hasHistoricalKeywords && yearDiff > 2) {
    score += 15; // Boost older documents for historical queries
  }
  
  // Check for recent/latest keywords
  const hasRecentKeywords = QUERY_KEYWORDS.recent.some(keyword => 
    query.toLowerCase().includes(keyword)
  );
  
  if (hasRecentKeywords && yearDiff <= 1) {
    score += 20; // Boost very recent documents
  }
  
  return score;
}

// Content relevance scoring
function getContentRelevanceScore(pdf: UploadedPDF, query: string): number {
  const lowerQuery = query.toLowerCase();
  const filename = pdf.filename.toLowerCase();
  const originalName = pdf.originalName?.toLowerCase() || '';
  
  let score = 0;
  
  // Check for specific keywords in query
  Object.entries(QUERY_KEYWORDS).forEach(([category, keywords]) => {
    const matchCount = keywords.filter(keyword => lowerQuery.includes(keyword)).length;
    if (matchCount > 0) {
      score += matchCount * 5;
      
      // Bonus for matching document type
      if (category === 'quarterly' && (pdf.quarter || isQuarterlyReport(pdf))) {
        score += 10;
      }
      if (category === 'annual' && isAnnualReport(pdf)) {
        score += 10;
      }
      if ((category === 'revenue' || category === 'profit') && isFinancialReport(pdf)) {
        score += 15;
      }
    }
  });
  
  // Filename relevance
  if (filename.includes('sonuc') || filename.includes('result')) score += 10;
  if (filename.includes('sunum') || filename.includes('presentation')) score += 8;
  if (filename.includes('finansal') || filename.includes('financial')) score += 12;
  if (filename.includes('kar') || filename.includes('profit')) score += 10;
  if (filename.includes('gelir') || filename.includes('revenue')) score += 10;
  
  // Extra score for year-end documents 
  if (filename.includes('yıl') && filename.includes('sonu')) score += 15; // "yıl sonu" = year-end
  if (filename.includes('31122') || filename.includes('1231')) score += 15; // End of year dates
  if (filename.includes('annual') && filename.includes('report')) score += 12;
  
  return score;
}

// Document type relevance
function getDocumentTypeScore(pdf: UploadedPDF, query: string): number {
  const docType = (pdf as any).documentType || 'quarterly';
  const lowerQuery = query.toLowerCase();
  
  let score = 0;
  
  switch (docType) {
    case 'quarterly':
      score += 20; // Quarterly reports are usually most detailed
      if (QUERY_KEYWORDS.quarterly.some(k => lowerQuery.includes(k))) score += 15;
      break;
    case 'annual':
      score += 25; // Annual reports have comprehensive data
      if (QUERY_KEYWORDS.annual.some(k => lowerQuery.includes(k))) score += 20;
      break;
    case 'presentation':
      score += 15; // Presentations have key highlights
      break;
    case 'financial':
      score += 30; // Direct financial reports are most relevant
      break;
    default:
      score += 10;
  }
  
  return score;
}

// Quarter coverage scoring (prefer variety)
function getQuarterCoverageBonus(selectedPDFs: UploadedPDF[], candidate: UploadedPDF): number {
  const existingQuarters = new Set(selectedPDFs.map(pdf => pdf.quarter).filter(Boolean));
  const candidateQuarter = candidate.quarter;
  
  if (candidateQuarter && !existingQuarters.has(candidateQuarter)) {
    return 10; // Bonus for adding a new quarter
  }
  
  return 0;
}

// Helper functions
function extractYearFromFilename(filename: string): number | null {
  // Try different year extraction patterns
  const patterns = [
    /(\d{4})-y[ıi]l/i,  // "2024-yıl" pattern
    /(\d{4})[-_]?y[ıi]l/i,  // "2024_yıl" or similar
    /31122(\d{4})/i,  // "311220XX" date format  
    /(\d{4})-(\d{1,2})-(\d{1,2})/,  // ISO date format
    /(\d{1,2})\.(\d{1,2})\.(\d{4})/,  // DD.MM.YYYY format
    /(\d{4})/  // Any 4-digit year (fallback)
  ];
  
  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      // For date patterns, extract the year (last group for most patterns)
      if (pattern.source.includes('31122')) {
        return parseInt(`20${match[1]}`); // "311220XX" -> "20XX"
      } else if (pattern.source.includes('\\.')) {
        return parseInt(match[3]); // DD.MM.YYYY -> YYYY
      } else {
        return parseInt(match[1]); // First captured group for most patterns
      }
    }
  }
  
  return null;
}

function isQuarterlyReport(pdf: UploadedPDF): boolean {
  const filename = pdf.filename.toLowerCase();
  return pdf.quarter !== undefined || 
         QUERY_KEYWORDS.quarterly.some(k => filename.includes(k));
}

function isAnnualReport(pdf: UploadedPDF): boolean {
  const filename = pdf.filename.toLowerCase();
  const docType = (pdf as any).documentType;
  return docType === 'annual' || 
         QUERY_KEYWORDS.annual.some(k => filename.includes(k));
}

function isFinancialReport(pdf: UploadedPDF): boolean {
  const filename = pdf.filename.toLowerCase();
  const docType = (pdf as any).documentType;
  return docType === 'financial' || 
         filename.includes('finansal') || 
         filename.includes('financial') ||
         filename.includes('sonuc') ||
         filename.includes('result');
}

// Main document selection function
export function selectRelevantDocuments(
  allPDFs: UploadedPDF[], 
  query: string, 
  maxDocuments: number = 5
): DocumentSelectionResult {
  
  // Score each document
  const scoredDocuments: DocumentScore[] = allPDFs.map(pdf => {
    const timeScore = getTimeRelevanceScore(pdf, query);
    const contentScore = getContentRelevanceScore(pdf, query);
    const typeScore = getDocumentTypeScore(pdf, query);
    
    const totalScore = timeScore + contentScore + typeScore;
    
    const reasons: string[] = [];
    if (timeScore > 20) reasons.push(`Recent data (${pdf.year || 'unknown year'})`);
    if (contentScore > 15) reasons.push('High content relevance');
    if (typeScore > 20) reasons.push(`Relevant document type (${(pdf as any).documentType || 'quarterly'})`);
    
    return {
      pdf,
      score: totalScore,
      reasons
    };
  });
  
  // Sort by score (descending)
  scoredDocuments.sort((a, b) => b.score - a.score);
  
  // Select documents with quarter coverage bonus
  const selectedPDFs: UploadedPDF[] = [];
  const selectionReasons: string[] = [];
  let totalScore = 0;
  
  for (const scoredDoc of scoredDocuments) {
    if (selectedPDFs.length >= maxDocuments) break;
    
    const quarterBonus = getQuarterCoverageBonus(selectedPDFs, scoredDoc.pdf);
    const finalScore = scoredDoc.score + quarterBonus;
    
    selectedPDFs.push(scoredDoc.pdf);
    totalScore += finalScore;
    
    const reasons = [...scoredDoc.reasons];
    if (quarterBonus > 0) reasons.push('Adds quarter diversity');
    
    selectionReasons.push(
      `${scoredDoc.pdf.originalName}: ${finalScore} points (${reasons.join(', ')})`
    );
  }
  
  const droppedPDFs = allPDFs.filter(pdf => 
    !selectedPDFs.some(selected => selected.id === pdf.id)
  );
  
  return {
    selectedPDFs,
    totalScore,
    selectionReasons,
    droppedPDFs
  };
}

// Get file size estimate (rough)
export function estimateRequestSize(pdfs: UploadedPDF[]): number {
  // Rough estimate: each PDF contributes about 50KB to 200KB of text
  // This is very approximate and depends on the actual PDF content
  const avgSizePerPDF = 100 * 1024; // 100KB average
  return pdfs.length * avgSizePerPDF;
}

// Calculate total pages for a set of PDFs
export function calculateTotalPages(pdfs: UploadedPDF[]): number {
  return pdfs.reduce((total, pdf) => {
    return total + (pdf.pageCount || 10); // Default to 10 pages if unknown
  }, 0);
}

// Progressive selection with page limits (Anthropic has 100-page limit)
export function selectDocumentsWithPageLimit(
  allPDFs: UploadedPDF[], 
  query: string, 
  maxPages: number = 100
): DocumentSelectionResult {
  
  // Score each document
  const scoredDocuments: DocumentScore[] = allPDFs.map(pdf => {
    const timeScore = getTimeRelevanceScore(pdf, query);
    const contentScore = getContentRelevanceScore(pdf, query);
    const typeScore = getDocumentTypeScore(pdf, query);
    
    const totalScore = timeScore + contentScore + typeScore;
    
    const reasons: string[] = [];
    if (timeScore > 20) reasons.push(`Recent data (${pdf.year || 'unknown year'})`);
    if (contentScore > 15) reasons.push('High content relevance');
    if (typeScore > 20) reasons.push(`Relevant document type (${(pdf as any).documentType || 'quarterly'})`);
    
    return {
      pdf,
      score: totalScore,
      reasons
    };
  });
  
  // Sort by score (descending)
  scoredDocuments.sort((a, b) => b.score - a.score);
  
  // Select documents while staying under page limit
  const selectedPDFs: UploadedPDF[] = [];
  const selectionReasons: string[] = [];
  let totalScore = 0;
  let totalPages = 0;
  
  for (const scoredDoc of scoredDocuments) {
    const pdfPages = scoredDoc.pdf.pageCount || 10;
    
    // Check if adding this PDF would exceed the page limit
    if (totalPages + pdfPages > maxPages) {
      console.log(`Skipping ${scoredDoc.pdf.originalName} (${pdfPages} pages) - would exceed page limit`);
      continue;
    }
    
    const quarterBonus = getQuarterCoverageBonus(selectedPDFs, scoredDoc.pdf);
    const finalScore = scoredDoc.score + quarterBonus;
    
    selectedPDFs.push(scoredDoc.pdf);
    totalScore += finalScore;
    totalPages += pdfPages;
    
    const reasons = [...scoredDoc.reasons];
    if (quarterBonus > 0) reasons.push('Adds quarter diversity');
    reasons.push(`${pdfPages} pages`);
    
    selectionReasons.push(
      `${scoredDoc.pdf.originalName}: ${finalScore} points (${reasons.join(', ')})`
    );
    
    console.log(`Selected: ${scoredDoc.pdf.originalName} (${pdfPages} pages) - Total pages: ${totalPages}/${maxPages}`);
  }
  
  const droppedPDFs = allPDFs.filter(pdf => 
    !selectedPDFs.some(selected => selected.id === pdf.id)
  );
  
  console.log(`Final selection: ${selectedPDFs.length} documents, ${totalPages} total pages`);
  
  return {
    selectedPDFs,
    totalScore,
    selectionReasons: [
      ...selectionReasons,
      `Total pages used: ${totalPages}/${maxPages}`
    ],
    droppedPDFs
  };
}

// Backward compatibility - now uses page limit instead of size limit
export function selectDocumentsWithSizeLimit(
  allPDFs: UploadedPDF[], 
  query: string, 
  maxSizeBytes: number = 800 * 1024 // This parameter is now ignored
): DocumentSelectionResult {
  return selectDocumentsWithPageLimit(allPDFs, query, 100);
}

// NEW: Intelligent context-aware document selection
export function selectDocumentsWithIntelligentFiltering(
  allPDFs: UploadedPDF[], 
  query: string, 
  maxPages: number = 100
): DocumentSelectionResult {
  console.log(`=== INTELLIGENT DOCUMENT SELECTION ===`);
  console.log(`Query: "${query}"`);
  console.log(`Available PDFs: ${allPDFs.length}`);
  
  // Analyze query context
  const context = analyzeQueryContext(query);
  console.log('Query context:', context);
  
  // Pre-filter documents based on intelligent context analysis
  const contextFilteredPDFs = allPDFs.filter(pdf => shouldIncludeDocument(pdf, context));
  
  console.log(`After intelligent filtering: ${contextFilteredPDFs.length} documents (reduced from ${allPDFs.length})`);
  
  if (contextFilteredPDFs.length === 0) {
    console.log('No documents passed intelligent filtering, falling back to original selection');
    return selectDocumentsWithPageLimit(allPDFs, query, maxPages);
  }
  
  // Score the pre-filtered documents
  const scoredDocuments: DocumentScore[] = contextFilteredPDFs.map(pdf => {
    const timeScore = getTimeRelevanceScore(pdf, query);
    const contentScore = getContentRelevanceScore(pdf, query);
    const typeScore = getDocumentTypeScore(pdf, query);
    
    // Add context-aware scoring bonuses
    let contextBonus = 0;
    
    // Bonus for documents that match the identified information type
    if (context.informationType === 'annual_summary') {
      if (pdf.quarter === 4 || isAnnualReport(pdf)) {
        contextBonus += 25; // Strong bonus for Q4/annual reports in annual summary queries
      }
    }
    
    // Bonus for documents in the exact timeframe
    if (context.timeframe) {
      const pdfYear = pdf.year || extractYearFromFilename(pdf.filename);
      const relevantYears = getRelevantYearsForTimeframe(context.timeframe);
      if (pdfYear && relevantYears.includes(pdfYear)) {
        contextBonus += 15;
      }
    }
    
    const totalScore = timeScore + contentScore + typeScore + contextBonus;
    
    const reasons: string[] = [];
    if (timeScore > 20) reasons.push(`Recent data (${pdf.year || 'unknown year'})`);
    if (contentScore > 15) reasons.push('High content relevance');
    if (typeScore > 20) reasons.push(`Relevant document type (${(pdf as any).documentType || 'quarterly'})`);
    if (contextBonus > 0) reasons.push(`Context match bonus (+${contextBonus})`);
    
    return {
      pdf,
      score: totalScore,
      reasons
    };
  });
  
  // Sort by score (descending)
  scoredDocuments.sort((a, b) => b.score - a.score);
  
  // For multi-year analysis, ensure we have coverage for each required year
  const selectedPDFs: UploadedPDF[] = [];
  const selectionReasons: string[] = [];
  let totalScore = 0;
  let totalPages = 0;
  
  // Check if this is a multi-year trend analysis that requires year coverage
  const isMultiYearAnalysis = context.informationType === 'trend_analysis' && 
                             context.timeframe && 
                             context.timeframe.type === 'years' && 
                             context.timeframe.years > 1;
  
  if (isMultiYearAnalysis) {
    console.log('🎯 Multi-year analysis detected - ensuring year coverage');
    const requiredYears = getRelevantYearsForTimeframe(context.timeframe);
    console.log(`Required years: ${requiredYears.join(', ')}`);
    
    // Group documents by year
    const documentsByYear = new Map<number, DocumentScore[]>();
    for (const scoredDoc of scoredDocuments) {
      const pdfYear = scoredDoc.pdf.year || extractYearFromFilename(scoredDoc.pdf.filename);
      if (pdfYear) {
        if (!documentsByYear.has(pdfYear)) {
          documentsByYear.set(pdfYear, []);
        }
        documentsByYear.get(pdfYear)!.push(scoredDoc);
      }
    }
    
    // Select best document from each required year
    for (const year of requiredYears) {
      const yearDocs = documentsByYear.get(year);
      if (yearDocs && yearDocs.length > 0) {
        // Sort this year's documents by score and pick the best one
        yearDocs.sort((a, b) => b.score - a.score);
        const bestDoc = yearDocs[0];
        const pdfPages = bestDoc.pdf.pageCount || 10;
        
        // Check if adding this PDF would exceed the page limit
        if (totalPages + pdfPages <= maxPages) {
          selectedPDFs.push(bestDoc.pdf);
          totalScore += bestDoc.score;
          totalPages += pdfPages;
          
          const reasons = [...bestDoc.reasons, `Best ${year} document`, `${pdfPages} pages`];
          selectionReasons.push(
            `${bestDoc.pdf.originalName}: ${bestDoc.score} points (${reasons.join(', ')})`
          );
          
          console.log(`✅ Selected best ${year} document: ${bestDoc.pdf.originalName} (${pdfPages} pages)`);
        } else {
          console.log(`⚠️ Cannot fit ${year} document ${bestDoc.pdf.originalName} (${pdfPages} pages) - would exceed page limit`);
        }
      } else {
        console.log(`❌ No documents found for required year ${year}`);
      }
    }
    
    // Add additional high-scoring documents if there's space remaining
    for (const scoredDoc of scoredDocuments) {
      if (selectedPDFs.some(selected => selected.id === scoredDoc.pdf.id)) {
        continue; // Already selected
      }
      
      const pdfPages = scoredDoc.pdf.pageCount || 10;
      if (totalPages + pdfPages > maxPages) {
        break; // Would exceed page limit
      }
      
      selectedPDFs.push(scoredDoc.pdf);
      totalScore += scoredDoc.score;
      totalPages += pdfPages;
      
      const reasons = [...scoredDoc.reasons, 'Additional context', `${pdfPages} pages`];
      selectionReasons.push(
        `${scoredDoc.pdf.originalName}: ${scoredDoc.score} points (${reasons.join(', ')})`
      );
      
      console.log(`➕ Added additional context: ${scoredDoc.pdf.originalName} (${pdfPages} pages)`);
    }
    
  } else {
    // Standard selection for non-multi-year analysis
    for (const scoredDoc of scoredDocuments) {
      const pdfPages = scoredDoc.pdf.pageCount || 10;
      
      // Check if adding this PDF would exceed the page limit
      if (totalPages + pdfPages > maxPages) {
        console.log(`Skipping ${scoredDoc.pdf.originalName} (${pdfPages} pages) - would exceed page limit`);
        continue;
      }
      
      const quarterBonus = getQuarterCoverageBonus(selectedPDFs, scoredDoc.pdf);
      const finalScore = scoredDoc.score + quarterBonus;
      
      selectedPDFs.push(scoredDoc.pdf);
      totalScore += finalScore;
      totalPages += pdfPages;
      
      const reasons = [...scoredDoc.reasons];
      if (quarterBonus > 0) reasons.push('Adds quarter diversity');
      reasons.push(`${pdfPages} pages`);
      
      selectionReasons.push(
        `${scoredDoc.pdf.originalName}: ${finalScore} points (${reasons.join(', ')})`
      );
      
      console.log(`Selected: ${scoredDoc.pdf.originalName} (${pdfPages} pages) - Total pages: ${totalPages}/${maxPages}`);
    }
  }
  
  const droppedPDFs = allPDFs.filter(pdf => 
    !selectedPDFs.some(selected => selected.id === pdf.id)
  );
  
  console.log(`Final intelligent selection: ${selectedPDFs.length} documents, ${totalPages} total pages`);
  console.log(`Context-based filtering eliminated ${allPDFs.length - contextFilteredPDFs.length} irrelevant documents`);
  
  return {
    selectedPDFs,
    totalScore,
    selectionReasons: [
      `Query context: ${context.informationType} (${context.timeframe ? `${context.timeframe.type}: ${context.timeframe.years || context.timeframe.yearRange || context.timeframe.singleYear}` : 'no timeframe'})`,
      `Intelligent pre-filtering: ${contextFilteredPDFs.length}/${allPDFs.length} documents passed context analysis`,
      ...selectionReasons,
      `Total pages used: ${totalPages}/${maxPages}`
    ],
    droppedPDFs
  };
}

// LLM-based intelligent document selection
export async function selectDocumentsWithLLM(
  allPDFs: UploadedPDF[],
  query: string,
  maxPages: number = 50
): Promise<DocumentSelectionResult> {
  
  console.log(`=== LLM DOCUMENT SELECTION ===`);
  console.log(`Query: "${query}"`);
  console.log(`Available PDFs: ${allPDFs.length}`);

  // Prepare document metadata for LLM
  const documentMetadata = allPDFs.map(pdf => ({
    id: pdf.id,
    filename: pdf.originalName || pdf.filename,
    year: pdf.year || extractYearFromFilename(pdf.filename),
    quarter: pdf.quarter,
    company: pdf.company,
    pages: pdf.pageCount || 10,
    uploadDate: pdf.uploadDate
  }));

  // Create the document selection prompt
  const selectionPrompt = `You are a financial analyst choosing the best documents for analysis.

QUERY: "${query}"

AVAILABLE DOCUMENTS:
${documentMetadata.map((doc, idx) => 
  `${idx + 1}. ${doc.filename} (${doc.year || 'unknown year'}, ${doc.quarter ? `Q${doc.quarter}` : 'annual'}, ${doc.pages} pages, Company: ${doc.company})`
).join('\n')}

CONSTRAINTS:
- Maximum total pages: ${maxPages}
- Select documents that provide the BEST data for answering the query
- For multi-year analysis, ensure coverage of all required years
- Prioritize year-end/annual reports over quarterly for annual comparisons
- Consider data completeness and relevance

INSTRUCTIONS:
1. Analyze what data is needed for this query
2. Select the most appropriate documents (by number)
3. Explain your reasoning

Respond in this exact JSON format:
{
  "reasoning": "Explain your selection logic and why these documents are best",
  "selectedDocuments": [1, 3, 5],
  "totalPages": 30,
  "coverageAnalysis": "Explain what years/quarters are covered"
}`;

  try {
    // Use Anthropic for document selection
    const anthropic = await import('@anthropic-ai/sdk');
    const client = new anthropic.default({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1500,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: selectionPrompt
        }
      ]
    });

    const responseContent = response.content[0];
    if (responseContent.type !== 'text') {
      throw new Error('Unexpected response type from LLM');
    }

    // Parse LLM response
    const jsonMatch = responseContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse LLM selection response');
    }

    const selectionData = JSON.parse(jsonMatch[0]);
    
    // Convert selected document indices to actual PDFs
    const selectedPDFs: UploadedPDF[] = [];
    const selectionReasons: string[] = [];
    let totalPages = 0;

    for (const docIndex of selectionData.selectedDocuments) {
      const pdf = allPDFs[docIndex - 1]; // Convert 1-based to 0-based index
      if (pdf) {
        selectedPDFs.push(pdf);
        totalPages += pdf.pageCount || 10;
        selectionReasons.push(`${pdf.originalName}: Selected by LLM for relevance`);
      }
    }

    console.log('LLM Selection Reasoning:', selectionData.reasoning);
    console.log('Coverage Analysis:', selectionData.coverageAnalysis);
    console.log(`Selected ${selectedPDFs.length} documents, ${totalPages} pages`);

    const droppedPDFs = allPDFs.filter(pdf => 
      !selectedPDFs.some(selected => selected.id === pdf.id)
    );

    return {
      selectedPDFs,
      totalScore: 100, // LLM selection gets max score
      selectionReasons: [
        `LLM Reasoning: ${selectionData.reasoning}`,
        `Coverage: ${selectionData.coverageAnalysis}`,
        ...selectionReasons,
        `Total pages: ${totalPages}/${maxPages}`
      ],
      droppedPDFs
    };

  } catch (error) {
    console.error('LLM document selection failed, falling back to algorithmic selection:', error);
    
    // Fallback to algorithmic selection
    return selectDocumentsWithIntelligentFiltering(allPDFs, query, maxPages);
  }
}