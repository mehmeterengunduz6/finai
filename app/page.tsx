'use client';

import { useState, useEffect } from 'react';
import ChatInterface from './components/chat/ChatInterface';
import { ChatMessage, UploadedPDF } from './lib/types';

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pdfs, setPDFs] = useState<UploadedPDF[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testMode, setTestMode] = useState(false);

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

    if (testMode) {
      // Test mode - simulate AI response without using tokens
      setTimeout(() => {
      const testResponses = [
        "This is a test response to your question: '" + question + "'. In a real scenario, I would analyze your financial reports and provide detailed insights.",
        "Test mode: I received your question about '" + question + "'. The AI would typically search through your uploaded PDFs and provide financial analysis.",
        "Demo response: Your query '" + question + "' would trigger a comprehensive analysis of your financial documents, including revenue trends, FX impacts, and quarterly comparisons.",
        "UI Test: The system would process '" + question + "' by scanning through your uploaded reports and generating charts and insights based on the data."
      ];
      
      const randomResponse = testResponses[Math.floor(Math.random() * testResponses.length)];

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: randomResponse,
        timestamp: new Date(),
        metadata: {
          usedFiles: ['test-file-1.pdf', 'test-file-2.pdf'],
          analysisType: 'financial',
          chartData: {
            type: 'bar',
            title: 'Test Chart Data',
            labels: ['Q1', 'Q2', 'Q3', 'Q4'],
            datasets: [{
              label: 'Revenue',
              data: [100, 120, 140, 160],
              backgroundColor: '#3B82F6'
            }]
          },
        },
      };

        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 1500); // Simulate 1.5 second loading time
    } else {
      // Real API call
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question,
            selectedFiles: pdfs.map(pdf => pdf.filename),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          
          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: data.answer,
            timestamp: new Date(),
            metadata: {
              usedFiles: data.usedFiles,
              analysisType: 'financial',
              chartData: data.chartData,
            },
          };

          setMessages(prev => [...prev, assistantMessage]);
        } else {
          throw new Error('Analysis failed');
        }
      } catch (error) {
        console.error('Error analyzing question:', error);
        
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: 'Sorry, I encountered an error while analyzing your question. Please try again.',
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Unique companies from PDFs
  const availableCompanies = [...new Set(pdfs.map(pdf => pdf.company).filter(Boolean))];

  return (
    <div className="h-screen" style={{ backgroundColor: '#0f0f10' }}>
      <div className="mx-auto px-4 pt-4 pb-4 max-w-3xl h-full">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}