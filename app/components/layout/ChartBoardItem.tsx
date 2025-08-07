'use client';

import React, { useState, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { ChartBoardItem } from './types';
import FinancialChart from '../ui/FinancialChart';
import { XMarkIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline';

interface ChartBoardItemComponentProps {
  item: ChartBoardItem;
  isSelected: boolean;
  onUpdate: (updates: Partial<ChartBoardItem>) => void;
  onDelete: () => void;
  onSelect: (multiSelect: boolean) => void;
}

export default function ChartBoardItemComponent({ 
  item, 
  isSelected, 
  onUpdate, 
  onDelete, 
  onSelect 
}: ChartBoardItemComponentProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Handle drag
  const handleDragStop = useCallback((_e: any, data: { x: number; y: number }) => {
    setIsDragging(false);
    onUpdate({
      position: { x: data.x, y: data.y }
    });
  }, [onUpdate]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  // Handle resize
  const handleResizeStop = useCallback((
    _e: any,
    _direction: any,
    ref: HTMLElement,
    _delta: any,
    position: { x: number; y: number }
  ) => {
    setIsResizing(false);
    onUpdate({
      size: {
        width: parseInt(ref.style.width),
        height: parseInt(ref.style.height)
      },
      position
    });
  }, [onUpdate]);

  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  // Handle selection
  const handleSelect = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(e.ctrlKey || e.metaKey);
  }, [onSelect]);

  // Handle delete
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  }, [onDelete]);

  const isInteracting = isDragging || isResizing;

  return (
    <Rnd
      size={item.size}
      position={item.position}
      onDragStart={handleDragStart}
      onDragStop={handleDragStop}
      onResizeStart={handleResizeStart}
      onResizeStop={handleResizeStop}
      minWidth={300}
      minHeight={250}
      maxWidth={800}
      maxHeight={600}
      bounds="parent"
      dragHandleClassName="chart-drag-handle"
      resizeHandleStyles={{
        bottomRight: {
          width: '20px',
          height: '20px',
          backgroundColor: isSelected ? '#3B82F6' : '#6B7280',
          border: '2px solid white',
          borderRadius: '50%',
          bottom: '-10px',
          right: '-10px',
          cursor: 'se-resize'
        }
      }}
      className={`
        ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
        ${isInteracting ? 'shadow-2xl' : 'shadow-lg'}
        transition-shadow duration-200
      `}
    >
      <div 
        className={`
          w-full h-full bg-white rounded-lg overflow-hidden relative
          ${isSelected ? 'ring-1 ring-blue-500' : 'ring-1 ring-gray-200'}
          ${isInteracting ? 'opacity-90' : 'opacity-100'}
          transition-all duration-200
        `}
        onClick={handleSelect}
      >
        {/* Header with drag handle and controls */}
        <div className="chart-drag-handle bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center justify-between cursor-move">
          <div className="flex items-center gap-2">
            <ArrowsPointingOutIcon className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-700 truncate" title={item.title}>
              {item.title}
            </h3>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleDelete}
              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              title="Delete chart"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chart Content */}
        <div className="p-3 h-full">
          <div className="h-full" style={{ height: 'calc(100% - 40px)' }}>
            <FinancialChart 
              chartData={item.chartData}
              className="h-full"
            />
          </div>
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
        )}

        {/* Resize Handle Custom Indicator */}
        <div 
          className={`
            absolute bottom-0 right-0 w-4 h-4 
            ${isSelected || isInteracting ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
            transition-opacity duration-200
          `}
          style={{
            background: 'linear-gradient(-45deg, transparent 0%, transparent 30%, #9CA3AF 30%, #9CA3AF 100%)',
            clipPath: 'polygon(100% 0%, 0% 100%, 100% 100%)'
          }}
        />
      </div>
    </Rnd>
  );
}