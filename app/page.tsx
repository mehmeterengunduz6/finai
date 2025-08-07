'use client';

import React, { useState } from 'react';
import ChatInterface from './components/chat/ChatInterface';
import { ChatMessage } from './lib/types';
import { ProcessStep, createProcessStep } from './components/chat/ProcessSteps';

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentProcessStep, setCurrentProcessStep] = useState<ProcessStep | undefined>();

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

  return (
    <div className="h-screen" style={{ backgroundColor: '#0f0f10' }}>
      <div className="mx-auto px-4 pt-4 pb-0 max-w-3xl h-full">
        <div className="h-[calc(100vh-32px)]">
          <ChatInterface 
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            currentProcessStep={currentProcessStep}
          />
        </div>
      </div>
    </div>
  );
}