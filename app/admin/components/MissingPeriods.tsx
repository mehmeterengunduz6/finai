'use client';

import { useState, useEffect } from 'react';
import { UploadedPDF } from '../../lib/types';
import { ExclamationTriangleIcon, ChartBarIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { 
    detectMissingPeriods, 
    getCompanyCoverage, 
    getUrgentCompanies,
    formatPeriod,
    type MissingPeriod,
    type CompanyCoverage 
} from '../../lib/analytics';
import { getCompanyDisplayName, getCompanyColor, getBISTCompany } from '../../lib/bist-companies';

interface MissingPeriodsProps {
    pdfs: UploadedPDF[];
}

export default function MissingPeriods({ pdfs }: MissingPeriodsProps) {
    const [selectedCompany, setSelectedCompany] = useState<string>('');
    const [urgentCompanies, setUrgentCompanies] = useState<CompanyCoverage[]>([]);
    const [missingPeriods, setMissingPeriods] = useState<MissingPeriod[]>([]);
    const [companyCoverage, setCompanyCoverage] = useState<CompanyCoverage | null>(null);

    useEffect(() => {
        const urgent = getUrgentCompanies(pdfs);
        setUrgentCompanies(urgent);
    }, [pdfs]);

    useEffect(() => {
        if (selectedCompany) {
            const missing = detectMissingPeriods(selectedCompany, pdfs);
            setMissingPeriods(missing);
            
            const coverage = getCompanyCoverage(selectedCompany, pdfs);
            setCompanyCoverage(coverage);
        } else {
            setMissingPeriods([]);
            setCompanyCoverage(null);
        }
    }, [selectedCompany, pdfs]);

    const companiesWithReports = [...new Set(pdfs.map(pdf => pdf.company?.toLowerCase()).filter(Boolean))];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center space-x-3">
                    <ExclamationTriangleIcon className="h-6 w-6 text-amber-500" />
                    <h2 className="text-xl font-semibold text-gray-900">Eksik Dönem Analizi</h2>
                </div>
                <p className="text-gray-600 mt-2">
                    Şirketlerin eksik çeyrek raporlarını tespit edin ve tamamlama durumunu takip edin
                </p>
            </div>

            {/* Urgent Companies Alert */}
            {urgentCompanies.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-medium text-red-800">
                                Acil Dikkat Gerektiren Şirketler ({urgentCompanies.length})
                            </h3>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {urgentCompanies.slice(0, 10).map((company) => (
                                    <button
                                        key={company.company}
                                        onClick={() => setSelectedCompany(company.company)}
                                        className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                                            company.totalReports === 0 
                                                ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                        }`}
                                    >
                                        {company.companyName} ({company.completionPercentage}%)
                                    </button>
                                ))}
                                {urgentCompanies.length > 10 && (
                                    <span className="px-2 py-1 text-xs text-gray-500">
                                        +{urgentCompanies.length - 10} daha...
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Company Selection */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Şirket Seçin</h3>
                    
                    <div className="space-y-3">
                        <button
                            onClick={() => setSelectedCompany('')}
                            className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                                !selectedCompany 
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                    : 'hover:bg-gray-50'
                            }`}
                        >
                            <span className="text-sm font-medium">Tüm Şirketler</span>
                        </button>
                        
                        {companiesWithReports.map((companyCode) => {
                            const company = getBISTCompany(companyCode!.toUpperCase());
                            const coverage = getCompanyCoverage(companyCode!, pdfs);
                            
                            return (
                                <button
                                    key={companyCode}
                                    onClick={() => setSelectedCompany(companyCode!)}
                                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                                        selectedCompany === companyCode 
                                            ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                            : 'hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-sm font-medium">
                                                {company?.code || companyCode?.toUpperCase()}
                                            </span>
                                            <p className="text-xs text-gray-500">
                                                {company?.name}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                                coverage.completionPercentage >= 80 ? 'bg-green-100 text-green-800' :
                                                coverage.completionPercentage >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {coverage.completionPercentage}%
                                            </span>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {coverage.totalReports} rapor
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Coverage Details */}
                <div className="lg:col-span-2 space-y-6">
                    {companyCoverage ? (
                        <>
                            {/* Company Stats */}
                            <div className="bg-white rounded-lg shadow p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-medium text-gray-900">
                                        {companyCoverage.companyName} Durumu
                                    </h3>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCompanyColor(companyCoverage.company)}`}>
                                        {companyCoverage.sector}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-600">
                                            {companyCoverage.totalReports}
                                        </div>
                                        <div className="text-sm text-gray-500">Toplam Rapor</div>
                                    </div>
                                    <div className="text-center">
                                        <div className={`text-2xl font-bold ${
                                            companyCoverage.completionPercentage >= 80 ? 'text-green-600' :
                                            companyCoverage.completionPercentage >= 50 ? 'text-yellow-600' :
                                            'text-red-600'
                                        }`}>
                                            {companyCoverage.completionPercentage}%
                                        </div>
                                        <div className="text-sm text-gray-500">Tamamlanma</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-purple-600">
                                            {companyCoverage.periodsCovered.length}
                                        </div>
                                        <div className="text-sm text-gray-500">Kapsanan Dönem</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-red-600">
                                            {companyCoverage.missingPeriods.length}
                                        </div>
                                        <div className="text-sm text-gray-500">Eksik Dönem</div>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mt-4">
                                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                                        <span>İlerleme</span>
                                        <span>{companyCoverage.completionPercentage}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-300 ${
                                                companyCoverage.completionPercentage >= 80 ? 'bg-green-500' :
                                                companyCoverage.completionPercentage >= 50 ? 'bg-yellow-500' :
                                                'bg-red-500'
                                            }`}
                                            style={{ width: `${companyCoverage.completionPercentage}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Missing Periods */}
                            {missingPeriods.length > 0 && (
                                <div className="bg-white rounded-lg shadow p-6">
                                    <div className="flex items-center space-x-2 mb-4">
                                        <CalendarDaysIcon className="h-5 w-5 text-red-500" />
                                        <h3 className="text-lg font-medium text-gray-900">
                                            Eksik Dönemler ({missingPeriods.length})
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {missingPeriods.map((period, index) => (
                                            <div
                                                key={index}
                                                className="bg-red-50 border border-red-200 rounded-lg p-3 text-center"
                                            >
                                                <div className="text-sm font-medium text-red-800">
                                                    {formatPeriod({ year: period.year, quarter: period.quarter })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Covered Periods */}
                            {companyCoverage.periodsCovered.length > 0 && (
                                <div className="bg-white rounded-lg shadow p-6">
                                    <div className="flex items-center space-x-2 mb-4">
                                        <ChartBarIcon className="h-5 w-5 text-green-500" />
                                        <h3 className="text-lg font-medium text-gray-900">
                                            Kapsanan Dönemler ({companyCoverage.periodsCovered.length})
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {companyCoverage.periodsCovered.map((period, index) => (
                                            <div
                                                key={index}
                                                className="bg-green-50 border border-green-200 rounded-lg p-3 text-center"
                                            >
                                                <div className="text-sm font-medium text-green-800">
                                                    {formatPeriod(period)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="text-center py-8">
                                <CalendarDaysIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Şirket Seçin
                                </h3>
                                <p className="text-gray-600">
                                    Detaylı dönem analizi için sol taraftan bir şirket seçin.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}