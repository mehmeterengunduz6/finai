'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { ShimmeringText } from '@/components/ui/shimmering-text';

export interface ProcessStep {
  id: string;
  text: string;
  status: 'pending' | 'in_progress' | 'completed';
  timestamp?: Date;
}

interface ProcessStepsProps {
  currentStep?: ProcessStep;
  allSteps?: ProcessStep[];
  className?: string;
}

export default function ProcessSteps({ currentStep, allSteps, className = "" }: ProcessStepsProps) {
  const [displayedSteps, setDisplayedSteps] = useState<ProcessStep[]>([]);

  // Handle step accumulation - add new steps to the list instead of replacing
  useEffect(() => {
    if (currentStep) {
      setDisplayedSteps(prevSteps => {
        // Check if this step already exists
        const existingIndex = prevSteps.findIndex(step => step.id === currentStep.id);
        
        if (existingIndex !== -1) {
          // Update existing step - ensure we create a completely new object for React to detect changes
          const updatedSteps = [...prevSteps];
          updatedSteps[existingIndex] = { 
            ...currentStep,
            timestamp: currentStep.status === 'completed' ? new Date() : currentStep.timestamp
          };
          return updatedSteps;
        } else {
          // Add new step
          return [...prevSteps, { ...currentStep }];
        }
      });
    }
  }, [currentStep]);

  // Clear steps when there's no current step (process finished)
  // Commented out to keep steps visible for testing
  // useEffect(() => {
  //   if (!currentStep) {
  //     // Delay clearing to show final state briefly
  //     const timer = setTimeout(() => {
  //       setDisplayedSteps([]);
  //     }, 3000);
  //     return () => clearTimeout(timer);
  //   }
  // }, [currentStep]);

  if (displayedSteps.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {displayedSteps.map((step, index) => (
        <div
          key={step.id}
          className={`flex items-center space-x-3 px-3 py-2 transition-all duration-300 ease-in-out opacity-100 transform translate-y-0`}
        >
          {/* Status Icon */}
          <div className="flex-shrink-0">
            {step.status === 'completed' ? (
              <CheckCircleIcon className="h-4 w-4 text-green-400" />
            ) : (
              <div className="relative">
                <Cog6ToothIcon 
                  className={`h-4 w-4 text-blue-400 ${
                    step.status === 'in_progress' ? 'animate-spin' : ''
                  }`} 
                />
              </div>
            )}
          </div>

          {/* Step Text */}
          <div className="flex-1 min-w-0">
            {step.status === 'in_progress' ? (
              <ShimmeringText 
                text={step.text}
                className="text-sm font-medium"
                duration={1.5}
                repeatDelay={0.5}
                color="#9CA3AF"
                shimmerColor="#ffffff"
              />
            ) : (
              <p className={`text-sm font-medium transition-colors duration-300 ${
                step.status === 'completed' ? 'text-green-400' : 'text-gray-400'
              }`}>
                {step.text}
              </p>
            )}
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

// Helper function to create a dynamic step
export const createProcessStep = (id: string, text: string, status: 'pending' | 'in_progress' | 'completed' = 'pending'): ProcessStep => ({
  id,
  text,
  status,
  timestamp: status === 'completed' ? new Date() : undefined
});