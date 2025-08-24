'use client';

import React from 'react';
import { ViewMode } from './types';
import { 
  ChatBubbleLeftRightIcon, 
  RectangleStackIcon, 
  Square3Stack3DIcon 
} from '@heroicons/react/24/outline';

interface ViewToggleProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  className?: string;
}

export default function ViewToggle({ currentMode, onModeChange, className = '' }: ViewToggleProps) {
  const modes = [
    {
      key: 'chat' as ViewMode,
      icon: ChatBubbleLeftRightIcon,
      label: 'Chat',
      tooltip: 'Full Chat View'
    },
    {
      key: 'split' as ViewMode,
      icon: RectangleStackIcon,
      label: 'Split',
      tooltip: 'Split View - Chat & Board'
    },
    {
      key: 'board' as ViewMode,
      icon: Square3Stack3DIcon,
      label: 'Board',
      tooltip: 'Full Chart Board'
    }
  ];

  return (
    <div className={`bg-black/80 backdrop-blur-sm border border-gray-700 rounded-xl p-1.5 flex gap-1 
      ${className} 
      max-w-sm mx-auto sm:max-w-none
    `}>
      {modes.map((mode) => {
        const IconComponent = mode.icon;
        const isActive = currentMode === mode.key;
        
        return (
          <button
            key={mode.key}
            onClick={() => onModeChange(mode.key)}
            title={mode.tooltip}
            className={`
              relative px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ease-in-out
              ${isActive 
                ? 'bg-white text-black shadow-lg' 
                : 'text-gray-300 hover:text-white hover:bg-white/10'
              }
            `}
          >
            <IconComponent className="w-4 h-4" />
            <span className="text-sm font-medium">{mode.label}</span>
            
            {/* Active indicator */}
            {isActive && (
              <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}