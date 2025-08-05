import { UploadedPDF } from './types';
import { getBISTCompany, getAllBISTCodes } from './bist-companies';

export interface PeriodKey {
  year: number;
  quarter: string;
}

export interface MissingPeriod {
  company: string;
  year: number;
  quarter: string;
  companyName: string;
}

export interface CompanyCoverage {
  company: string;
  companyName: string;
  sector: string;
  totalReports: number;
  periodsCovered: PeriodKey[];
  missingPeriods: PeriodKey[];
  yearRange: { start: number; end: number };
  lastUpdate: Date | null;
  completionPercentage: number;
}

export interface CoverageStats {
  totalCompanies: number;
  companiesWithReports: number;
  totalReports: number;
  totalPossiblePeriods: number;
  totalCoveredPeriods: number;
  overallCompletionPercentage: number;
  avgReportsPerCompany: number;
  sectorsRepresented: string[];
}

// Generate all possible periods for the last 5 years
export function generatePossiblePeriods(): PeriodKey[] {
  const periods: PeriodKey[] = [];
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  
  // Last 5 years + current year
  for (let year = currentYear - 5; year <= currentYear; year++) {
    const quarters = year === currentYear ? 
      [`Q1`, `Q2`, `Q3`, `Q4`].slice(0, currentQuarter) : 
      [`Q1`, `Q2`, `Q3`, `Q4`];
      
    for (const quarter of quarters) {
      periods.push({ year, quarter });
    }
  }
  
  return periods;
}

// Detect missing periods for a specific company
export function detectMissingPeriods(companyCode: string, pdfs: UploadedPDF[]): MissingPeriod[] {
  const normalizedCode = companyCode.toLowerCase();
  const company = getBISTCompany(companyCode.toUpperCase());
  const companyName = company?.name || companyCode;
  
  const companyPDFs = pdfs.filter(pdf => 
    pdf.company?.toLowerCase() === normalizedCode
  );
  
  const coveredPeriods = new Set<string>();
  companyPDFs.forEach(pdf => {
    if (pdf.year && pdf.quarter) {
      coveredPeriods.add(`${pdf.year}-${pdf.quarter}`);
    }
  });
  
  const possiblePeriods = generatePossiblePeriods();
  const missingPeriods: MissingPeriod[] = [];
  
  possiblePeriods.forEach(period => {
    const periodKey = `${period.year}-${period.quarter}`;
    if (!coveredPeriods.has(periodKey)) {
      missingPeriods.push({
        company: normalizedCode,
        year: period.year,
        quarter: period.quarter,
        companyName
      });
    }
  });
  
  return missingPeriods;
}

// Get coverage analysis for a specific company
export function getCompanyCoverage(companyCode: string, pdfs: UploadedPDF[]): CompanyCoverage {
  const normalizedCode = companyCode.toLowerCase();
  const company = getBISTCompany(companyCode.toUpperCase());
  const companyName = company?.name || companyCode;
  const sector = company?.sector || 'Unknown';
  
  const companyPDFs = pdfs.filter(pdf => 
    pdf.company?.toLowerCase() === normalizedCode
  );
  
  const periodsCovered: PeriodKey[] = [];
  let lastUpdate: Date | null = null;
  
  companyPDFs.forEach(pdf => {
    if (pdf.year && pdf.quarter) {
      periodsCovered.push({ year: pdf.year, quarter: pdf.quarter });
    }
    if (!lastUpdate || pdf.uploadDate > lastUpdate) {
      lastUpdate = pdf.uploadDate;
    }
  });
  
  const possiblePeriods = generatePossiblePeriods();
  const missingPeriods = possiblePeriods.filter(period => 
    !periodsCovered.some(covered => 
      covered.year === period.year && covered.quarter === period.quarter
    )
  );
  
  const yearRange = companyPDFs.length > 0 ? {
    start: Math.min(...companyPDFs.map(pdf => pdf.year || 9999)),
    end: Math.max(...companyPDFs.map(pdf => pdf.year || 0))
  } : { start: 0, end: 0 };
  
  const completionPercentage = possiblePeriods.length > 0 ? 
    (periodsCovered.length / possiblePeriods.length) * 100 : 0;
  
  return {
    company: normalizedCode,
    companyName,
    sector,
    totalReports: companyPDFs.length,
    periodsCovered: periodsCovered.sort((a, b) => 
      a.year !== b.year ? b.year - a.year : b.quarter.localeCompare(a.quarter)
    ),
    missingPeriods,
    yearRange,
    lastUpdate,
    completionPercentage: Math.round(completionPercentage)
  };
}

// Get overall coverage statistics
export function getCoverageStats(pdfs: UploadedPDF[]): CoverageStats {
  const allCompanies = getAllBISTCodes();
  const companiesWithReports = new Set(
    pdfs.map(pdf => pdf.company?.toLowerCase()).filter(Boolean)
  );
  
  const possiblePeriods = generatePossiblePeriods();
  const totalPossiblePeriods = allCompanies.length * possiblePeriods.length;
  
  const coveredPeriods = new Set<string>();
  pdfs.forEach(pdf => {
    if (pdf.company && pdf.year && pdf.quarter) {
      coveredPeriods.add(`${pdf.company.toLowerCase()}-${pdf.year}-${pdf.quarter}`);
    }
  });
  
  const sectorsRepresented = [...new Set(
    pdfs.map(pdf => {
      if (pdf.company) {
        const company = getBISTCompany(pdf.company.toUpperCase());
        return company?.sector;
      }
      return null;
    }).filter(Boolean)
  )] as string[];
  
  const overallCompletionPercentage = totalPossiblePeriods > 0 ? 
    (coveredPeriods.size / totalPossiblePeriods) * 100 : 0;
  
  return {
    totalCompanies: allCompanies.length,
    companiesWithReports: companiesWithReports.size,
    totalReports: pdfs.length,
    totalPossiblePeriods,
    totalCoveredPeriods: coveredPeriods.size,
    overallCompletionPercentage: Math.round(overallCompletionPercentage * 100) / 100,
    avgReportsPerCompany: companiesWithReports.size > 0 ? 
      Math.round((pdfs.length / companiesWithReports.size) * 100) / 100 : 0,
    sectorsRepresented: sectorsRepresented.sort()
  };
}

// Get companies that need urgent attention (0 reports or very low coverage)
export function getUrgentCompanies(pdfs: UploadedPDF[]): CompanyCoverage[] {
  const allCompanies = getAllBISTCodes();
  const urgentCompanies: CompanyCoverage[] = [];
  
  for (const companyCode of allCompanies) {
    const coverage = getCompanyCoverage(companyCode, pdfs);
    if (coverage.totalReports === 0 || coverage.completionPercentage < 20) {
      urgentCompanies.push(coverage);
    }
  }
  
  return urgentCompanies.sort((a, b) => a.completionPercentage - b.completionPercentage);
}

// Get top performing companies by coverage
export function getTopPerformingCompanies(pdfs: UploadedPDF[], limit: number = 5): CompanyCoverage[] {
  const allCompanies = getAllBISTCodes();
  const performingCompanies: CompanyCoverage[] = [];
  
  for (const companyCode of allCompanies) {
    const coverage = getCompanyCoverage(companyCode, pdfs);
    if (coverage.totalReports > 0) {
      performingCompanies.push(coverage);
    }
  }
  
  return performingCompanies
    .sort((a, b) => b.completionPercentage - a.completionPercentage)
    .slice(0, limit);
}

// Format period for display
export function formatPeriod(period: PeriodKey): string {
  const quarterNames: { [key: string]: string } = {
    'Q1': '1. Çeyrek',
    'Q2': '2. Çeyrek',
    'Q3': '3. Çeyrek',
    'Q4': '4. Çeyrek'
  };
  
  return `${period.year} ${quarterNames[period.quarter] || period.quarter}`;
}