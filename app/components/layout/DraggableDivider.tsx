'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface DraggableDividerProps {
  onDrag: (ratio: number) => void;
  containerRef: React.RefObject<HTMLElement>;
  className?: string;
}

export default function DraggableDivider({ onDrag, containerRef, className = '' }: DraggableDividerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dividerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const containerWidth = containerRect.width;
    
    // Calculate new ratio (minimum 20%, maximum 80%)
    const newRatio = Math.max(0.2, Math.min(0.8, mouseX / containerWidth));
    onDrag(newRatio);
  }, [isDragging, onDrag, containerRef]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div 
      ref={dividerRef}
      className={`
        relative w-1 bg-gray-700 hover:bg-gray-600 cursor-col-resize 
        transition-colors duration-200 select-none
        ${isDragging ? 'bg-blue-500' : ''}
        ${className}
      `}
      onMouseDown={handleMouseDown}
    >
      {/* Visual grip indicator */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="flex flex-col gap-1">
          {[...Array(3)].map((_, i) => (
            <div 
              key={i}
              className={`
                w-0.5 h-0.5 rounded-full transition-colors duration-200
                ${isDragging ? 'bg-white' : 'bg-gray-500'}
              `} 
            />
          ))}
        </div>
      </div>

      {/* Hover area for better UX */}
      <div 
        className="absolute inset-y-0 -inset-x-2 hover:bg-blue-500/20 transition-colors duration-200"
        style={{ width: '16px', left: '-8px' }}
      />
      
      {/* Dragging overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 cursor-col-resize" style={{ pointerEvents: 'none' }} />
      )}
    </div>
  );
}