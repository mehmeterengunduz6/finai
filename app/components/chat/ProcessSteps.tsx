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
  currentStep?: ProcessStep;
  className?: string;
}

export default function ProcessSteps({ currentStep, className = "" }: ProcessStepsProps) {
  const [displayStep, setDisplayStep] = useState<ProcessStep | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Handle step transitions with smooth animations
  useEffect(() => {
    if (currentStep) {
      if (!displayStep || displayStep.id !== currentStep.id) {
        // Fade out current step
        setIsVisible(false);
        
        // After fade out, update step and fade in
        setTimeout(() => {
          setDisplayStep(currentStep);
          setIsVisible(true);
        }, 200);
      } else {
        // Same step, just update status
        setDisplayStep(currentStep);
      }
    } else {
      setIsVisible(false);
      setTimeout(() => setDisplayStep(null), 200);
    }
  }, [currentStep, displayStep]);

  if (!displayStep) return null;

  return (
    <div className={`${className}`}>
      <div
        className={`flex items-center space-x-3 transition-all duration-300 ease-in-out ${
          isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2'
        }`}
      >
        {/* Status Icon */}
        <div className="flex-shrink-0">
          {displayStep.status === 'completed' ? (
            <CheckCircleIcon className="h-5 w-5 text-green-400" />
          ) : (
            <div className="relative">
              <Cog6ToothIcon 
                className={`h-5 w-5 text-blue-400 ${
                  displayStep.status === 'in_progress' ? 'animate-spin' : ''
                }`} 
              />
            </div>
          )}
        </div>

        {/* Step Text */}
        <div className="flex-1 min-w-0">
          <p 
            className={`text-sm font-medium transition-colors duration-300 ${
              displayStep.status === 'completed' 
                ? 'text-green-300' 
                : displayStep.status === 'in_progress'
                ? 'text-blue-300'
                : 'text-gray-400'
            }`}
          >
            {displayStep.text}
          </p>
          {displayStep.timestamp && displayStep.status === 'completed' && (
            <p className="text-xs text-gray-500 mt-1">
              {displayStep.timestamp.toLocaleTimeString('tr-TR', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
              })}
            </p>
          )}
        </div>
      </div>
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