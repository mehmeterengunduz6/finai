'use client';

import React, { useState } from 'react';
import SplitViewLayout from './components/layout/SplitViewLayout';
import { ChatMessage } from './lib/types';
import { ProcessStep, createProcessStep } from './components/chat/ProcessSteps';
import { ChartBoardItem } from './components/layout/types';

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentProcessStep, setCurrentProcessStep] = useState<ProcessStep | undefined>();
  const [chartBoardItems, setChartBoardItems] = useState<ChartBoardItem[]>([]);
  const [viewMode, setViewMode] = useState<'chat' | 'split' | 'board'>('chat');

  const handleSendMessage = async (message: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: message,
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/analyze-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: message }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not available');
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'step_update') {
                const step = createProcessStep(data.stepId, data.message, data.status);
                setCurrentProcessStep(step);
              } else if (data.type === 'final_result') {
                // Create message with NO TEXT CONTENT - only chart
                const assistantMessage: ChatMessage = {
                  id: (Date.now() + 1).toString(),
                  content: '', // Empty content - user only sees chart
                  type: 'assistant',
                  timestamp: new Date(),
                  metadata: {
                    chartData: data.data.chartData // Only include chart data
                  }
                };

                setMessages(prev => [...prev, assistantMessage]);
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'Üzgünüm, isteğinizi işlerken bir hata oluştu.',
        type: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setCurrentProcessStep(undefined);
    }
  };

  // Handle adding chart to board
  const handleAddToBoard = (chartData: any, title: string) => {
    const newItem: ChartBoardItem = {
      id: `chart-${Date.now()}`,
      chartData,
      title,
      position: { 
        x: Math.random() * 200 + 50, // Random position with some margin
        y: Math.random() * 200 + 50 
      },
      size: { width: 400, height: 300 },
      createdAt: new Date()
    };

    // Check if chart already exists on board
    const exists = chartBoardItems.some(item => 
      JSON.stringify(item.chartData) === JSON.stringify(chartData)
    );

    if (!exists) {
      setChartBoardItems(prev => [...prev, newItem]);
      // Auto-switch to split view when first chart is added
      if (chartBoardItems.length === 0) {
        setViewMode('split');
      }
      // Log successful addition for debugging
      console.log('Chart added to board:', title);
    } else {
      console.log('Chart already exists on board:', title);
    }
  };

  // Handle updating chart board items
  const handleUpdateChartBoardItems = (items: ChartBoardItem[]) => {
    setChartBoardItems(items);
    // Switch back to chat mode if all charts are removed
    if (items.length === 0 && viewMode !== 'chat') {
      setViewMode('chat');
    }
  };

  // Handle view mode changes
  const handleViewModeChange = (mode: 'chat' | 'split' | 'board') => {
    setViewMode(mode);
  };

  return (
    <SplitViewLayout
      messages={messages}
      onSendMessage={handleSendMessage}
      isLoading={isLoading}
      currentProcessStep={currentProcessStep}
      chartBoardItems={chartBoardItems}
      onUpdateChartBoardItems={handleUpdateChartBoardItems}
      onAddToBoard={handleAddToBoard}
      viewMode={viewMode}
      onViewModeChange={handleViewModeChange}
    />
  );
}