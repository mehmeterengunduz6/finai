// Borsa Istanbul (BIST) Company Definitions
export interface BISTCompany {
  code: string;
  name: string;
  nameEn: string;
  sector: string;
  color: string;
}

export const BIST_COMPANIES: { [key: string]: BISTCompany } = {
  // Major BIST companies
  'HTTBT': {
    code: 'HTTBT',
    name: 'Hitit Bilgisayar',
    nameEn: 'Hitit Computer Services',
    sector: 'Technology',
    color: 'bg-blue-100 text-blue-800'
  },
  'THYAO': {
    code: 'THYAO',
    name: 'Türk Hava Yolları',
    nameEn: 'Turkish Airlines',
    sector: 'Transportation',
    color: 'bg-red-100 text-red-800'
  },
  'AKBNK': {
    code: 'AKBNK',
    name: 'Akbank',
    nameEn: 'Akbank',
    sector: 'Banking',
    color: 'bg-green-100 text-green-800'
  },
  'GARAN': {
    code: 'GARAN',
    name: 'Garanti BBVA',
    nameEn: 'Garanti BBVA',
    sector: 'Banking',
    color: 'bg-green-100 text-green-800'
  },
  'ISCTR': {
    code: 'ISCTR',
    name: 'İş Bankası',
    nameEn: 'Turkiye Is Bankasi',
    sector: 'Banking',
    color: 'bg-green-100 text-green-800'
  },
  'HALKB': {
    code: 'HALKB',
    name: 'Halkbank',
    nameEn: 'Halkbank',
    sector: 'Banking',
    color: 'bg-green-100 text-green-800'
  },
  'VAKBN': {
    code: 'VAKBN',
    name: 'VakıfBank',
    nameEn: 'VakifBank',
    sector: 'Banking',
    color: 'bg-green-100 text-green-800'
  },
  'YKBNK': {
    code: 'YKBNK',
    name: 'Yapı Kredi',
    nameEn: 'Yapi ve Kredi Bankasi',
    sector: 'Banking',
    color: 'bg-green-100 text-green-800'
  },
  'TCELL': {
    code: 'TCELL',
    name: 'Turkcell',
    nameEn: 'Turkcell',
    sector: 'Telecommunications',
    color: 'bg-yellow-100 text-yellow-800'
  },
  'TTKOM': {
    code: 'TTKOM',
    name: 'Türk Telekom',
    nameEn: 'Turk Telekom',
    sector: 'Telecommunications',
    color: 'bg-yellow-100 text-yellow-800'
  },
  'BIMAS': {
    code: 'BIMAS',
    name: 'BİM',
    nameEn: 'BIM Birlesik Magazalar',
    sector: 'Retail',
    color: 'bg-orange-100 text-orange-800'
  },
  'SOKM': {
    code: 'SOKM',
    name: 'ŞOK Marketler',
    nameEn: 'Sok Marketler',
    sector: 'Retail',
    color: 'bg-orange-100 text-orange-800'
  },
  'MGROS': {
    code: 'MGROS',
    name: 'Migros',
    nameEn: 'Migros Ticaret',
    sector: 'Retail',
    color: 'bg-orange-100 text-orange-800'
  },
  'KCHOL': {
    code: 'KCHOL',
    name: 'Koç Holding',
    nameEn: 'Koc Holding',
    sector: 'Holding',
    color: 'bg-purple-100 text-purple-800'
  },
  'SAHOL': {
    code: 'SAHOL',
    name: 'Sabancı Holding',
    nameEn: 'Sabanci Holding',
    sector: 'Holding',
    color: 'bg-purple-100 text-purple-800'
  },
  'EREGL': {
    code: 'EREGL',
    name: 'Ereğli Demir Çelik',
    nameEn: 'Eregli Demir ve Celik',
    sector: 'Steel',
    color: 'bg-gray-100 text-gray-800'
  },
  'TUPRS': {
    code: 'TUPRS',
    name: 'Tüpraş',
    nameEn: 'Tupras',
    sector: 'Energy',
    color: 'bg-indigo-100 text-indigo-800'
  },
  'PETKM': {
    code: 'PETKM',
    name: 'Petkim',
    nameEn: 'Petkim',
    sector: 'Petrochemical',
    color: 'bg-indigo-100 text-indigo-800'
  },
  'ASELS': {
    code: 'ASELS',
    name: 'ASELSAN',
    nameEn: 'Aselsan',
    sector: 'Defense',
    color: 'bg-slate-100 text-slate-800'
  },
  'TAVHL': {
    code: 'TAVHL',
    name: 'TAV Havalimanları',
    nameEn: 'TAV Airports',
    sector: 'Transportation',
    color: 'bg-red-100 text-red-800'
  },
  'ARCLK': {
    code: 'ARCLK',
    name: 'Arçelik',
    nameEn: 'Arcelik',
    sector: 'Consumer Goods',
    color: 'bg-teal-100 text-teal-800'
  }
};

// Helper functions
export function getBISTCompany(code: string): BISTCompany | undefined {
  return BIST_COMPANIES[code.toUpperCase()];
}

export function getAllBISTCodes(): string[] {
  return Object.keys(BIST_COMPANIES).sort();
}

export function detectBISTCompanyFromFilename(filename: string): string | null {
  const upperFilename = filename.toUpperCase();
  const lowerFilename = filename.toLowerCase();
  
  // Check for exact BIST codes
  for (const code of Object.keys(BIST_COMPANIES)) {
    if (upperFilename.includes(code)) {
      return code.toLowerCase();
    }
  }
  
  // Special patterns for common Turkish company names
  const specialPatterns: { [key: string]: string } = {
    'hitit': 'httbt',
    'httbt': 'httbt',
    'turkcell': 'tcell',
    'tcell': 'tcell',
    'turktelekom': 'ttkom',
    'ttkom': 'ttkom',
    'akbank': 'akbnk',
    'akbnk': 'akbnk',
    'garanti': 'garan',
    'garan': 'garan',
    'isbank': 'isctr',
    'isctr': 'isctr',
    'halkbank': 'halkb',
    'halkb': 'halkb',
    'vakifbank': 'vakbn',
    'vakbn': 'vakbn',
    'yapikredi': 'ykbnk',
    'ykbnk': 'ykbnk'
  };
  
  // Check special patterns first
  for (const [pattern, code] of Object.entries(specialPatterns)) {
    if (lowerFilename.includes(pattern)) {
      return code;
    }
  }
  
  // Check for company names (Turkish)
  for (const [code, company] of Object.entries(BIST_COMPANIES)) {
    const nameVariations = [
      company.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      company.nameEn.toLowerCase().replace(/[^a-z0-9]/g, ''),
      company.code.toLowerCase()
    ];
    
    for (const variation of nameVariations) {
      if (lowerFilename.replace(/[^a-z0-9]/g, '').includes(variation)) {
        return code.toLowerCase();
      }
    }
  }
  
  return null;
}

export function getCompanyDisplayName(code: string): string {
  const company = getBISTCompany(code);
  return company ? `${company.code} - ${company.name}` : code.toUpperCase();
}

export function getCompanyColor(code: string): string {
  const company = getBISTCompany(code);
  return company?.color || 'bg-gray-100 text-gray-800';
}

// Document types for Turkish market
export const DOCUMENT_TYPES = {
  'quarterly': 'Çeyrek Raporu',
  'annual': 'Yıllık Rapor', 
  'presentation': 'Yatırımcı Sunumu',
  'financial': 'Mali Tablo',
  'other': 'Diğer'
} as const;

export type DocumentType = keyof typeof DOCUMENT_TYPES;

// Report periods
export const QUARTERS = {
  'Q1': '1. Çeyrek',
  'Q2': '2. Çeyrek', 
  'Q3': '3. Çeyrek',
  'Q4': '4. Çeyrek'
} as const;