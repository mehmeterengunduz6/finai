'use client';

import { useState, useEffect } from 'react';
import { UploadedPDF } from '../lib/types';
import PDFUpload from './components/PDFUpload';
import PDFList from './components/PDFList';

export default function AdminPage() {
  const [pdfs, setPDFs] = useState<UploadedPDF[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [companies, setCompanies] = useState<string[]>([]);

  useEffect(() => {
    fetchPDFs();
    fetchCompanies();
  }, []);

  const fetchPDFs = async () => {
    try {
      const response = await fetch('/api/reports');
      if (response.ok) {
        const data = await response.json();
        setPDFs(data.pdfs);
      }
    } catch (error) {
      console.error('Failed to fetch PDFs:', error);
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
    if (!confirm('Are you sure you want to delete this PDF?')) return;

    try {
      const response = await fetch(`/api/reports?filename=${filename}&company=${company}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchPDFs();
        fetchCompanies();
      } else {
        alert('Failed to delete PDF');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete PDF');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-gray-600 mt-2">
                Manage financial reports and company data
              </p>
            </div>
            <a
              href="/"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ← Back to Chat
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900">Total Reports</h3>
            <p className="text-3xl font-bold text-blue-600">{pdfs.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900">Companies</h3>
            <p className="text-3xl font-bold text-green-600">{companies.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900">Latest Upload</h3>
            <p className="text-sm text-gray-600">
              {pdfs.length > 0 ? new Date(pdfs[0].uploadDate).toLocaleDateString() : 'No uploads yet'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Upload New Report</h2>
              <p className="text-gray-600 mt-1">
                Add financial reports for analysis
              </p>
            </div>
            <div className="p-6">
              <PDFUpload onUploadSuccess={handleUploadSuccess} />
            </div>
          </div>

          {/* PDF List */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Uploaded Reports</h2>
              <p className="text-gray-600 mt-1">
                Manage existing financial reports
              </p>
            </div>
            <div className="p-6">
              <PDFList 
                pdfs={pdfs} 
                onDelete={handleDelete}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}