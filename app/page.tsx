'use client';

import React, { useRef, useState } from 'react';
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
  const [reasoningSteps, setReasoningSteps] = useState<ProcessStep[]>([]);
  const reasoningStepsRef = useRef<ProcessStep[]>([]);

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
                // accumulate steps for later display under assistant response
                setReasoningSteps(prev => {
                  const idx = prev.findIndex(s => s.id === step.id);
                  let next: ProcessStep[];
                  if (idx !== -1) {
                    const copy = [...prev];
                    copy[idx] = { ...step };
                    next = copy;
                  } else {
                    next = [...prev, { ...step }];
                  }
                  reasoningStepsRef.current = next;
                  return next;
                });
              } else if (data.type === 'final_result') {
                // Create message with NO TEXT CONTENT - only chart
                // Finalize all reasoning steps as completed for the summary under the message
                const finalizedSteps = (reasoningStepsRef.current || []).map(s => ({
                  id: s.id,
                  text: s.text,
                  status: 'completed' as const,
                  timestamp: s.timestamp || new Date()
                }));

                const assistantMessage: ChatMessage = {
                  id: (Date.now() + 1).toString(),
                  content: '', // Empty content - user only sees chart
                  type: 'assistant',
                  timestamp: new Date(),
                  metadata: {
                    chartData: data.data.chartData, // Only include chart data
                    reasoningSteps: finalizedSteps
                  }
                };

                setMessages(prev => [...prev, assistantMessage]);
                // Clear accumulated steps for next run
                setReasoningSteps([]);
                reasoningStepsRef.current = [];
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
      // Initialize at (0,0); component will align to top-right
      position: { x: 0, y: 0 },
      // Start with max allowed size
      size: { width: 800, height: 600 },
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

  // Handle creating a chart from an empty slot (open modal/route placeholder)
  const handleCreateChart = (slotId: string) => {
    console.log('Create chart requested for slot:', slotId);
    // TODO: open modal or navigate to chart creation route
  };

  return (
    <SplitViewLayout
      messages={messages}
      onSendMessage={handleSendMessage}
      isLoading={isLoading}
      currentProcessStep={currentProcessStep}
      chainOfThoughtSteps={reasoningSteps}
      chartBoardItems={chartBoardItems}
      onUpdateChartBoardItems={handleUpdateChartBoardItems}
      onAddToBoard={handleAddToBoard}
      onCreateChart={handleCreateChart}
      viewMode={viewMode}
      onViewModeChange={handleViewModeChange}
    />
  );
}
