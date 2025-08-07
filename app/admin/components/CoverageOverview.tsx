'use client';

import { useState, useEffect } from 'react';
import { UploadedPDF } from '../../lib/types';
import { 
    ChartBarIcon, 
    BuildingOfficeIcon, 
    DocumentTextIcon,
    TrendingUpIcon,
    TrendingDownIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { 
    getCoverageStats, 
    getTopPerformingCompanies,
    getUrgentCompanies,
    type CoverageStats,
    type CompanyCoverage 
} from '../../lib/analytics';
import { getCompanyColor } from '../../lib/bist-companies';

interface CoverageOverviewProps {
    pdfs: UploadedPDF[];
}

export default function CoverageOverview({ pdfs }: CoverageOverviewProps) {
    const [stats, setStats] = useState<CoverageStats | null>(null);
    const [topPerformers, setTopPerformers] = useState<CompanyCoverage[]>([]);
    const [urgentCompanies, setUrgentCompanies] = useState<CompanyCoverage[]>([]);

    useEffect(() => {
        const coverageStats = getCoverageStats(pdfs);
        setStats(coverageStats);

        const topCompanies = getTopPerformingCompanies(pdfs, 5);
        setTopPerformers(topCompanies);

        const urgent = getUrgentCompanies(pdfs);
        setUrgentCompanies(urgent.slice(0, 5)); // Top 5 most urgent
    }, [pdfs]);

    if (!stats) {
        return (
            <div className="animate-pulse space-y-6">
                <div className="bg-gray-200 h-48 rounded-lg"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-200 h-64 rounded-lg"></div>
                    <div className="bg-gray-200 h-64 rounded-lg"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center space-x-3">
                    <ChartBarIcon className="h-6 w-6 text-blue-500" />
                    <h2 className="text-xl font-semibold text-gray-900">Kapsama Durumu Genel Bakış</h2>
                </div>
                <p className="text-gray-600 mt-2">
                    BIST şirketlerinin finansal rapor kapsama durumu ve istatistikleri
                </p>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <BuildingOfficeIcon className="h-8 w-8 text-blue-500" />
                        </div>
                        <div className="ml-4">
                            <h3 className="text-lg font-medium text-gray-900">Toplam Şirket</h3>
                            <div className="flex items-baseline">
                                <span className="text-3xl font-bold text-blue-600">
                                    {stats.totalCompanies}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500">
                                {stats.companiesWithReports} şirketin raporu var
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <DocumentTextIcon className="h-8 w-8 text-green-500" />
                        </div>
                        <div className="ml-4">
                            <h3 className="text-lg font-medium text-gray-900">Toplam Rapor</h3>
                            <div className="flex items-baseline">
                                <span className="text-3xl font-bold text-green-600">
                                    {stats.totalReports}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500">
                                Ortalama {stats.avgReportsPerCompany} rapor/şirket
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <TrendingUpIcon className="h-8 w-8 text-purple-500" />
                        </div>
                        <div className="ml-4">
                            <h3 className="text-lg font-medium text-gray-900">Kapsanan Dönem</h3>
                            <div className="flex items-baseline">
                                <span className="text-3xl font-bold text-purple-600">
                                    {stats.totalCoveredPeriods}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500">
                                / {stats.totalPossiblePeriods} mümkün dönem
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <ChartBarIcon className={`h-8 w-8 ${ 
                                stats.overallCompletionPercentage >= 50 ? 'text-green-500' : 'text-red-500'
                            }`} />
                        </div>
                        <div className="ml-4">
                            <h3 className="text-lg font-medium text-gray-900">Genel Tamamlanma</h3>
                            <div className="flex items-baseline">
                                <span className={`text-3xl font-bold ${
                                    stats.overallCompletionPercentage >= 50 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {stats.overallCompletionPercentage.toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                <div
                                    className={`h-2 rounded-full ${
                                        stats.overallCompletionPercentage >= 50 ? 'bg-green-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${stats.overallCompletionPercentage}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sector Breakdown */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Sektör Dağılımı</h3>
                <div className="flex flex-wrap gap-2">
                    {stats.sectorsRepresented.map((sector, index) => (
                        <span
                            key={sector}
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                                [
                                    'bg-blue-100 text-blue-800',
                                    'bg-green-100 text-green-800',
                                    'bg-purple-100 text-purple-800',
                                    'bg-yellow-100 text-yellow-800',
                                    'bg-red-100 text-red-800',
                                    'bg-indigo-100 text-indigo-800',
                                    'bg-pink-100 text-pink-800',
                                    'bg-gray-100 text-gray-800'
                                ][index % 8]
                            }`}
                        >
                            {sector}
                        </span>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Performing Companies */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center space-x-2 mb-4">
                        <TrendingUpIcon className="h-5 w-5 text-green-500" />
                        <h3 className="text-lg font-medium text-gray-900">
                            En İyi Performans ({topPerformers.length})
                        </h3>
                    </div>

                    <div className="space-y-3">
                        {topPerformers.map((company, index) => (
                            <div key={company.company} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                                        index === 0 ? 'bg-yellow-500' :
                                        index === 1 ? 'bg-gray-400' :
                                        index === 2 ? 'bg-amber-600' :
                                        'bg-blue-500'
                                    }`}>
                                        {index + 1}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">
                                            {company.companyName}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {company.sector} • {company.totalReports} rapor
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-green-600">
                                        {company.completionPercentage}%
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {company.periodsCovered.length} dönem
                                    </div>
                                </div>
                            </div>
                        ))}

                        {topPerformers.length === 0 && (
                            <div className="text-center py-8">
                                <TrendingDownIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-500">Henüz rapor bulunan şirket yok</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Companies Needing Attention */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center space-x-2 mb-4">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                        <h3 className="text-lg font-medium text-gray-900">
                            Dikkat Gerektiren Şirketler ({urgentCompanies.length})
                        </h3>
                    </div>

                    <div className="space-y-3">
                        {urgentCompanies.map((company) => (
                            <div key={company.company} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                                <div className="flex items-center space-x-3">
                                    <div className={`w-3 h-3 rounded-full ${
                                        company.totalReports === 0 ? 'bg-red-500' : 'bg-amber-500'
                                    }`} />
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">
                                            {company.companyName}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {company.sector} • {company.totalReports} rapor
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-lg font-bold ${
                                        company.totalReports === 0 ? 'text-red-600' : 'text-amber-600'
                                    }`}>
                                        {company.completionPercentage}%
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {company.missingPeriods.length} eksik dönem
                                    </div>
                                </div>
                            </div>
                        ))}

                        {urgentCompanies.length === 0 && (
                            <div className="text-center py-8">
                                <TrendingUpIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
                                <p className="text-green-600 font-medium">Tüm şirketler iyi durumda!</p>
                                <p className="text-gray-500 text-sm">Hiç acil dikkat gerektiren şirket yok</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Progress Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">İlerleme Özeti</h3>
                        <p className="text-gray-600 mt-1">
                            Son 5 yıl için {stats.totalCompanies} BIST şirketinin rapor kapsama durumu
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-blue-600">
                            {Math.round((stats.companiesWithReports / stats.totalCompanies) * 100)}%
                        </div>
                        <div className="text-sm text-gray-500">şirket kapsamında</div>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="bg-white rounded-lg p-4">
                        <div className="text-2xl font-bold text-green-600">
                            {stats.companiesWithReports}
                        </div>
                        <div className="text-sm text-gray-500">Raporu Olan Şirket</div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                        <div className="text-2xl font-bold text-blue-600">
                            {stats.totalCoveredPeriods}
                        </div>
                        <div className="text-sm text-gray-500">Kapsanan Dönem</div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                        <div className="text-2xl font-bold text-purple-600">
                            {stats.totalPossiblePeriods - stats.totalCoveredPeriods}
                        </div>
                        <div className="text-sm text-gray-500">Eksik Dönem</div>
                    </div>
                </div>
            </div>
        </div>
    );
}