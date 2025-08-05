'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

export interface ProcessStep {
  id: string;
  text: string;
  status: 'pending' | 'in_progress' | 'completed';
  timestamp?: Date;
}

interface ProcessStepsProps {
  steps: ProcessStep[];
  className?: string;
}

export default function ProcessSteps({ steps, className = "" }: ProcessStepsProps) {
  const [visibleSteps, setVisibleSteps] = useState<ProcessStep[]>([]);

  // Animate steps as they appear
  useEffect(() => {
    steps.forEach((step, index) => {
      setTimeout(() => {
        setVisibleSteps(prev => {
          const existing = prev.find(s => s.id === step.id);
          if (existing) {
            // Update existing step
            return prev.map(s => s.id === step.id ? step : s);
          } else {
            // Add new step
            return [...prev, step];
          }
        });
      }, index * 200); // Stagger the appearance
    });
  }, [steps]);

  return (
    <div className={`space-y-3 ${className}`}>
      {visibleSteps.map((step, index) => (
        <div
          key={step.id}
          className={`flex items-center space-x-3 transition-all duration-500 ease-in-out ${
            step.status === 'pending' ? 'opacity-50' : 'opacity-100'
          }`}
        >
          {/* Status Icon */}
          <div className="flex-shrink-0">
            {step.status === 'completed' ? (
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
            ) : (
              <div className="relative">
                <Cog6ToothIcon 
                  className={`h-5 w-5 text-blue-400 ${
                    step.status === 'in_progress' ? 'animate-spin' : ''
                  }`} 
                />
              </div>
            )}
          </div>

          {/* Step Text */}
          <div className="flex-1 min-w-0">
            <p 
              className={`text-sm font-medium transition-colors duration-300 ${
                step.status === 'completed' 
                  ? 'text-green-300' 
                  : step.status === 'in_progress'
                  ? 'text-blue-300'
                  : 'text-gray-400'
              }`}
            >
              {step.text}
            </p>
            {step.timestamp && step.status === 'completed' && (
              <p className="text-xs text-gray-500 mt-1">
                {step.timestamp.toLocaleTimeString('tr-TR', { 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  second: '2-digit' 
                })}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Predefined process steps for the Turkish interface
export const getProcessSteps = (query: string): ProcessStep[] => {
  // Extract company name from query for more personalized steps
  const companyMatch = query.match(/(hitit|httbt)/i);
  const companyName = companyMatch ? 'Hitit' : 'şirket';

  return [
    {
      id: 'analyzing_query',
      text: 'Mesaj analiz ediliyor...',
      status: 'pending'
    },
    {
      id: 'identifying_company',
      text: `${companyName} şirketi tespit ediliyor...`,
      status: 'pending'
    },
    {
      id: 'searching_documents',
      text: 'Finansal raporlar aranıyor...',
      status: 'pending'
    },
    {
      id: 'selecting_relevant',
      text: 'En uygun belgeler seçiliyor...',
      status: 'pending'
    },
    {
      id: 'reading_files',
      text: 'Rapor içerikleri okunuyor...',
      status: 'pending'
    },
    {
      id: 'analyzing_data',
      text: 'Finansal veriler analiz ediliyor...',
      status: 'pending'
    },
    {
      id: 'generating_response',
      text: 'Yanıt hazırlanıyor...',
      status: 'pending'
    },
    {
      id: 'creating_chart',
      text: 'Grafik oluşturuluyor...',
      status: 'pending'
    }
  ];
};