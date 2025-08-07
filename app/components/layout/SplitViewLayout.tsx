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
  
  // View mode props
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export default function SplitViewLayout({
  messages,
  onSendMessage,
  isLoading,
  currentProcessStep,
  chartBoardItems,
  onUpdateChartBoardItems,
  onAddToBoard,
  viewMode,
  onViewModeChange
}: SplitViewLayoutProps) {
  const [splitRatio, setSplitRatio] = useState(0.5); // 50% split by default
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle divider drag to resize split
  const handleDividerDrag = useCallback((newRatio: number) => {
    setSplitRatio(Math.max(0.2, Math.min(0.8, newRatio)));
  }, []);

  // Handle view mode changes
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    onViewModeChange(mode);
  }, [onViewModeChange]);

  // Calculate widths based on view mode and split ratio
  // Force chat mode when no charts are on board
  const effectiveViewMode = chartBoardItems.length === 0 ? 'chat' : viewMode;
  
  const getChatWidth = () => {
    switch (effectiveViewMode) {
      case 'chat': return '100%';
      case 'split': return `${splitRatio * 100}%`;
      case 'board': return '0%';
      default: return '100%';
    }
  };

  const getBoardWidth = () => {
    switch (effectiveViewMode) {
      case 'chat': return '0%';
      case 'split': return `${(1 - splitRatio) * 100}%`;
      case 'board': return '100%';
      default: return '0%';
    }
  };

  const showDivider = effectiveViewMode === 'split';

  return (
    <div ref={containerRef} className="h-screen relative" style={{ backgroundColor: '#0f0f10' }}>
      {/* View Toggle Controls - Only show when there are charts on the board */}
      {chartBoardItems.length > 0 && (
        <ViewToggle 
          currentMode={viewMode}
          onModeChange={handleViewModeChange}
          className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50"
        />
      )}

      {/* Main Content Area */}
      <div className={`flex h-full relative overflow-hidden ${chartBoardItems.length > 0 ? 'pt-16' : ''}`}> {/* pt-16 only when view toggle is visible */}
        
        {/* Chat Section */}
        <div 
          className="transition-all duration-300 ease-in-out overflow-hidden"
          style={{ 
            width: getChatWidth(),
            opacity: effectiveViewMode === 'board' ? 0 : 1
          }}
        >
          {effectiveViewMode !== 'board' && (
            <div className={`h-full ${effectiveViewMode === 'chat' ? 'flex justify-center px-4' : ''}`}>
              <div className={effectiveViewMode === 'chat' ? 'w-full max-w-3xl' : 'w-full'}>
                <ChatInterface
                  messages={messages}
                  onSendMessage={onSendMessage}
                  isLoading={isLoading}
                  currentProcessStep={currentProcessStep}
                  onAddToBoard={onAddToBoard}
                  showAddToBoardButtons={effectiveViewMode === 'split'}
                />
              </div>
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
            opacity: effectiveViewMode === 'chat' ? 0 : 1
          }}
        >
          {effectiveViewMode !== 'chat' && (
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