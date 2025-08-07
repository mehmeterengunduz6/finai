'use client';

import React, { useState, useRef, useCallback } from 'react';
import { ChatMessage } from '../../lib/types';
import ChatInterface from '../chat/ChatInterface';
import ChartBoard from './ChartBoard';
import ViewToggle from './ViewToggle';
import DraggableDivider from './DraggableDivider';
import { ChartBoardItem } from './types';
import { ProcessStep } from '../chat/ProcessSteps';

export type ViewMode = 'chat' | 'split' | 'board';

interface SplitViewLayoutProps {
  // Chat props
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  currentProcessStep?: ProcessStep;
  
  // Chart board props
  chartBoardItems: ChartBoardItem[];
  onUpdateChartBoardItems: (items: ChartBoardItem[]) => void;
  onAddToBoard: (chartData: any, title: string) => void;
}

export default function SplitViewLayout({
  messages,
  onSendMessage,
  isLoading,
  currentProcessStep,
  chartBoardItems,
  onUpdateChartBoardItems,
  onAddToBoard
}: SplitViewLayoutProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [splitRatio, setSplitRatio] = useState(0.5); // 50% split by default
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle divider drag to resize split
  const handleDividerDrag = useCallback((newRatio: number) => {
    setSplitRatio(Math.max(0.2, Math.min(0.8, newRatio)));
  }, []);

  // Handle view mode changes
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  // Calculate widths based on view mode and split ratio
  const getChatWidth = () => {
    switch (viewMode) {
      case 'chat': return '100%';
      case 'split': return `${splitRatio * 100}%`;
      case 'board': return '0%';
      default: return '100%';
    }
  };

  const getBoardWidth = () => {
    switch (viewMode) {
      case 'chat': return '0%';
      case 'split': return `${(1 - splitRatio) * 100}%`;
      case 'board': return '100%';
      default: return '0%';
    }
  };

  const showDivider = viewMode === 'split';

  return (
    <div ref={containerRef} className="h-screen relative" style={{ backgroundColor: '#0f0f10' }}>
      {/* View Toggle Controls - Fixed at center top */}
      <ViewToggle 
        currentMode={viewMode}
        onModeChange={handleViewModeChange}
        className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50"
      />

      {/* Main Content Area */}
      <div className="flex h-full pt-16 relative overflow-hidden"> {/* pt-16 to account for view toggle */}
        
        {/* Chat Section */}
        <div 
          className="transition-all duration-300 ease-in-out overflow-hidden"
          style={{ 
            width: getChatWidth(),
            opacity: viewMode === 'board' ? 0 : 1
          }}
        >
          {viewMode !== 'board' && (
            <div className="h-full">
              <ChatInterface
                messages={messages}
                onSendMessage={onSendMessage}
                isLoading={isLoading}
                currentProcessStep={currentProcessStep}
                onAddToBoard={onAddToBoard}
                showAddToBoardButtons={viewMode === 'split'}
              />
            </div>
          )}
        </div>

        {/* Draggable Divider */}
        {showDivider && (
          <DraggableDivider
            onDrag={handleDividerDrag}
            containerRef={containerRef}
          />
        )}

        {/* Chart Board Section */}
        <div 
          className="transition-all duration-300 ease-in-out overflow-hidden"
          style={{ 
            width: getBoardWidth(),
            opacity: viewMode === 'chat' ? 0 : 1
          }}
        >
          {viewMode !== 'chat' && (
            <div className="h-full">
              <ChartBoard
                items={chartBoardItems}
                onUpdateItems={onUpdateChartBoardItems}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}