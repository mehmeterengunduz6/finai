'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { ChartBoardItem, ViewMode } from './types';
import FinancialChart from '../ui/FinancialChart';
import { XMarkIcon } from '@heroicons/react/24/outline';

type ItemVariant = 'free' | 'grid';

interface ChartBoardItemComponentProps {
  item: ChartBoardItem;
  isSelected: boolean;
  onUpdate: (updates: Partial<ChartBoardItem>) => void;
  onDelete: () => void;
  onSelect: (multiSelect: boolean) => void;
  containerRef?: React.RefObject<HTMLDivElement>;
  viewMode?: ViewMode;
  variant?: ItemVariant;
}

export default function ChartBoardItemComponent({ 
  item, 
  isSelected, 
  onUpdate, 
  onDelete, 
  onSelect,
  containerRef,
  viewMode,
  variant = 'free'
}: ChartBoardItemComponentProps) {
  const [isResizing, setIsResizing] = useState(false);
  const initializedRef = useRef(false);

  // Ensure initial placement to top-right when newly added (position 0,0)
  useEffect(() => {
    if (initializedRef.current) return;
    if (!containerRef?.current) return;

    // Detect uninitialized position (0,0)
    if (item.position?.x === 0 && item.position?.y === 0) {
      const containerWidth = containerRef.current.clientWidth || 0;
      const padding = 20; // visual padding from edges
      // Default width based on view mode: 1/2 in split, else 1/3
      const columns = viewMode === 'split' ? 2 : 3;
      const desiredWidth = Math.floor((containerWidth - padding * 2) / columns);
      const width = Math.max(300, desiredWidth);
      // Default height ~3/4 of width, within min/max bounds
      const desiredHeight = Math.round(width * 0.75);
      const height = Math.max(250, Math.min(600, desiredHeight));

      const newX = 0; // align to left
      const newY = 0; // align to top

      onUpdate({ 
        size: { width, height },
        position: { x: newX, y: newY }
      });
    }

    initializedRef.current = true;
  }, [containerRef, item.position?.x, item.position?.y, item.size?.width, onUpdate, viewMode]);

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

  const isInteracting = isResizing;

  // Adjust size when view mode changes to keep desired column width
  useEffect(() => {
    if (!containerRef?.current) return;
    const containerWidth = containerRef.current.clientWidth || 0;
    const padding = 20;
    const columns = viewMode === 'split' ? 2 : 3;
    const desiredWidth = Math.floor((containerWidth - padding * 2) / columns);
    const width = Math.max(300, desiredWidth);
    const height = Math.max(250, Math.round(width * 0.75));
    const newX = 0; // keep aligned to left in all modes
    // only update if significant change
    if (Math.abs((item.size?.width || 0) - width) > 8) {
      onUpdate({ size: { width, height }, position: { x: newX, y: item.position?.y ?? padding } });
    }
  }, [viewMode]);

  // If in split view and the item width matches approx 1/3, bump to 1/2 on mount
  useEffect(() => {
    if (!containerRef?.current) return;
    if (viewMode !== 'split') return;
    const containerWidth = containerRef.current.clientWidth || 0;
    const padding = 20;
    const third = Math.floor((containerWidth - padding * 2) / 3);
    const half = Math.floor((containerWidth - padding * 2) / 2);
    const current = item.size?.width || 0;
    if (current > 0 && Math.abs(current - third) <= 12 && Math.abs(current - half) > 12) {
      const width = Math.max(300, half);
      const height = Math.max(250, Math.round(width * 0.75));
      onUpdate({ size: { width, height } });
    }
  // run once on mount for new items
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Grid variant: render simple, equal-sized tile without Rnd
  if (variant === 'grid') {
    return (
      <div
        className={`${isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''} border border-gray-700 rounded-xl box-border overflow-visible min-w-0 min-h-0 relative w-full h-full`}
        onClick={handleSelect}
      >
        {/* Title overlay */}
        <div className="absolute top-2 left-2 z-10 bg-black/50 text-white text-sm px-2 py-1 rounded">
          {item.title}
        </div>
        {/* Floating delete button */}
        <button
          onClick={handleDelete}
          className="absolute top-2 right-2 z-10 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50/10 rounded transition-colors"
          title="Delete chart"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
        <div className="absolute inset-0 p-4 pt-12 overflow-visible min-w-0 min-h-0">
          <FinancialChart chartData={item.chartData} className="h-full w-full" frameless />
        </div>
        {isSelected && (
          <div className="absolute inset-0 ring-2 ring-blue-500 ring-opacity-50 pointer-events-none" />
        )}
      </div>
    );
  }

  return (
    <Rnd
      size={item.size}
      position={item.position}
      // Disable dragging per requirement
      disableDragging
      // Remove resizing UI per request
      enableResizing={false}
      onResizeStart={handleResizeStart}
      onResizeStop={handleResizeStop}
      minWidth={300}
      minHeight={250}
      // allow width to scale with container
      maxHeight={600}
      bounds="parent"
      className={`${isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''} border border-gray-700 rounded-xl box-border overflow-visible min-w-0 min-h-0 ml-4`}
  >
      <div className="w-full h-full relative overflow-visible min-w-0 min-h-0" onClick={handleSelect}>
        {/* Title overlay */}
        <div className="absolute top-2 left-2 z-10 bg-black/50 text-white text-sm px-2 py-1 rounded">
          {item.title}
        </div>
        {/* Floating delete button */}
        <button
          onClick={handleDelete}
          className="absolute top-2 right-2 z-10 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50/10 rounded transition-colors"
          title="Delete chart"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        {/* Frameless chart content with internal padding to avoid SVG touching border */}
        <div className="absolute inset-0 p-4 pt-12 overflow-visible min-w-0 min-h-0">
          <FinancialChart 
            chartData={item.chartData}
            className="h-full w-full"
            frameless
          />
        </div>

        {/* Selection indicator (subtle) */}
        {isSelected && (
          <div className="absolute inset-0 ring-2 ring-blue-500 ring-opacity-50 pointer-events-none" />
        )}
      </div>
    </Rnd>
  );
}
