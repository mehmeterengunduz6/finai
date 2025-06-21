'use client';

import { useState, useEffect } from 'react';
import ChatInterface from './components/chat/ChatInterface';
import { ChatMessage, UploadedPDF } from './lib/types';

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pdfs, setPDFs] = useState<UploadedPDF[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Tüm PDF'leri yükle (all companies)
  useEffect(() => {
    fetchPDFs();
  }, []);

  const fetchPDFs = async () => {
    try {
      const response = await fetch('/api/reports'); // All companies
      if (response.ok) {
        const data = await response.json();
        setPDFs(data.pdfs);
      }
    } catch (error) {
      console.error('PDF listesi alınamadı:', error);
    }
  };

  const handleSendMessage = async (question: string) => {
    if (!question.trim()) return;

    // User mesajını ekle
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: question,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          // LLM tüm PDF'lere erişecek ve kendisi belirleyecek
        }),
      });

      if (!response.ok) {
        throw new Error('Analiz isteği başarısız');
      }

      const data = await response.json();

      // Assistant mesajını ekle with chart data
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.answer,
        timestamp: new Date(),
        metadata: {
          usedFiles: data.usedFiles,
          analysisType: 'financial',
          chartData: data.chartData, // Include chart data
        },
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Analiz hatası:', error);

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, an error occurred during analysis. Please try again.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Unique companies from PDFs
  const availableCompanies = [...new Set(pdfs.map(pdf => pdf.company).filter(Boolean))];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f0f10' }}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}