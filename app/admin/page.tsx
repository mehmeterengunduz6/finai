'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UploadedPDF } from '../lib/types';
import PDFUploadBulk from './components/PDFUploadBulk';
import PDFListEditable from './components/PDFListEditable';
import MissingPeriods from './components/MissingPeriods';
import CoverageOverview from './components/CoverageOverview';
import { 
  DocumentArrowUpIcon, 
  DocumentTextIcon, 
  ExclamationTriangleIcon, 
  ChartBarIcon 
} from '@heroicons/react/24/outline';

export default function AdminPage() {
  const [pdfs, setPDFs] = useState<UploadedPDF[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [companies, setCompanies] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'reports' | 'missing' | 'overview'>('upload');

  useEffect(() => {
    fetchPDFs();
    fetchCompanies();
  }, []);

  const fetchPDFs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/reports');
      if (response.ok) {
        const data = await response.json();
        setPDFs(data.pdfs);
      }
    } catch (error) {
      console.error('Failed to fetch PDFs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  };

  const handleUploadSuccess = () => {
    fetchPDFs();
    fetchCompanies();
  };

  const handleDelete = async (filename: string, company: string) => {
    if (!confirm('Bu PDF dosyasını silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await fetch(`/api/reports?filename=${filename}&company=${company}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchPDFs();
        fetchCompanies();
      } else {
        alert('PDF silinemedi');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('PDF silinemedi');
    }
  };

  const handleUpdate = async (pdf: UploadedPDF, updates: Partial<UploadedPDF>) => {
    try {
      const response = await fetch('/api/reports/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pdf, updates }),
      });

      if (response.ok) {
        fetchPDFs();
        fetchCompanies();
        alert('Rapor bilgileri başarıyla güncellendi!');
      } else {
        const data = await response.json();
        alert('Güncelleme başarısız: ' + data.error);
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Güncelleme başarısız: ' + (error as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Yönetim Paneli</h1>
              <p className="text-gray-600 mt-2">
                BIST şirketlerinin finansal raporlarını yönetin
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ← Sohbete Dön
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900">Toplam Rapor</h3>
            <p className="text-3xl font-bold text-blue-600">{pdfs.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900">Şirket Sayısı</h3>
            <p className="text-3xl font-bold text-green-600">{companies.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900">Son Yükleme</h3>
            <p className="text-sm text-gray-600">
              {pdfs.length > 0 ? new Date(pdfs[0].uploadDate).toLocaleDateString('tr-TR') : 'Henüz yükleme yok'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('upload')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'upload'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <DocumentArrowUpIcon className="h-5 w-5" />
                  <span>Rapor Yükle</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'reports'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <DocumentTextIcon className="h-5 w-5" />
                  <span>Raporlar ({pdfs.length})</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('missing')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'missing'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  <span>Eksik Dönemler</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <ChartBarIcon className="h-5 w-5" />
                  <span>Genel Bakış</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="min-h-[600px]">
          {activeTab === 'upload' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Upload Section */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Yeni Rapor Yükle</h2>
                  <p className="text-gray-600 mt-1">
                    Tekli veya toplu yükleme ile finansal raporlar ekleyin
                  </p>
                </div>
                <div className="p-6">
                  <PDFUploadBulk onUploadSuccess={handleUploadSuccess} />
                </div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Hızlı İstatistikler</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Toplam Rapor:</span>
                      <span className="font-semibold text-blue-600">{pdfs.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Şirket Sayısı:</span>
                      <span className="font-semibold text-green-600">{companies.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Son Yükleme:</span>
                      <span className="text-sm text-gray-500">
                        {pdfs.length > 0 ? new Date(pdfs[0].uploadDate).toLocaleDateString('tr-TR') : 'Henüz yükleme yok'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">💡 İpucu</h3>
                  <p className="text-gray-600 text-sm">
                    Toplu yükleme modunu kullanarak aynı şirketin birden fazla dönem raporunu tek seferde yükleyebilirsiniz. 
                    Dosya adlarından otomatik olarak çeyrek ve yıl bilgileri tespit edilir.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Yüklenmiş Raporlar</h2>
                <p className="text-gray-600 mt-1">
                  Mevcut finansal raporları yönetin ve düzenleyin
                </p>
              </div>
              <div className="p-6">
                <PDFListEditable 
                  pdfs={pdfs} 
                  onDelete={handleDelete}
                  onUpdate={handleUpdate}
                  isLoading={isLoading}
                />
              </div>
            </div>
          )}

          {activeTab === 'missing' && (
            <MissingPeriods pdfs={pdfs} />
          )}

          {activeTab === 'overview' && (
            <CoverageOverview pdfs={pdfs} />
          )}
        </div>
      </div>
    </div>
  );
}