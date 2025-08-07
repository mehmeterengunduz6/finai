'use client';

import React, { useState, useCallback } from 'react';
import { ChartBoardItem, ChartBoardItemUpdate } from './types';
import ChartBoardItemComponent from './ChartBoardItem';
import { PlusIcon } from '@heroicons/react/24/outline';

interface ChartBoardProps {
  items: ChartBoardItem[];
  onUpdateItems: (items: ChartBoardItem[]) => void;
  className?: string;
}

export default function ChartBoard({ items, onUpdateItems, className = '' }: ChartBoardProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Handle item updates (position, size changes)
  const handleItemUpdate = useCallback((itemId: string, updates: Partial<ChartBoardItem>) => {
    const updatedItems = items.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    );
    onUpdateItems(updatedItems);
  }, [items, onUpdateItems]);

  // Handle item deletion
  const handleDeleteItem = useCallback((itemId: string) => {
    const updatedItems = items.filter(item => item.id !== itemId);
    onUpdateItems(updatedItems);
    setSelectedItems(prev => prev.filter(id => id !== itemId));
  }, [items, onUpdateItems]);

  // Handle item selection
  const handleSelectItem = useCallback((itemId: string, multiSelect: boolean = false) => {
    if (multiSelect) {
      setSelectedItems(prev => 
        prev.includes(itemId) 
          ? prev.filter(id => id !== itemId)
          : [...prev, itemId]
      );
    } else {
      setSelectedItems([itemId]);
    }
  }, []);

  // Clear selection when clicking on empty area
  const handleBoardClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedItems([]);
    }
  }, []);

  return (
    <div 
      className={`relative w-full h-full overflow-hidden select-none ${className}`}
      style={{ backgroundColor: '#0f0f10' }}
      onClick={handleBoardClick}
    >
      {/* Grid Background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 0'
        }}
      />

      {/* Board Header */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="flex items-center justify-between">
          <div className="text-white">
            <h2 className="text-lg font-semibold">Chart Board</h2>
            <p className="text-sm text-gray-400">
              {items.length} chart{items.length !== 1 ? 's' : ''} on board
            </p>
          </div>
          
          {/* Board Controls */}
          <div className="flex items-center gap-2">
            {selectedItems.length > 0 && (
              <div className="bg-black/80 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-1.5">
                <span className="text-sm text-white">
                  {selectedItems.length} selected
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <PlusIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-medium mb-2">No Charts Yet</h3>
            <p className="text-sm">
              Create charts in the chat and click "Add to Board" to start building your dashboard
            </p>
          </div>
        </div>
      )}

      {/* Chart Items */}
      <div className="absolute inset-0 pt-20"> {/* pt-20 to account for header */}
        {items.map((item) => (
          <ChartBoardItemComponent
            key={item.id}
            item={item}
            isSelected={selectedItems.includes(item.id)}
            onUpdate={(updates) => handleItemUpdate(item.id, updates)}
            onDelete={() => handleDeleteItem(item.id)}
            onSelect={(multiSelect) => handleSelectItem(item.id, multiSelect)}
          />
        ))}
      </div>

      {/* Keyboard shortcuts info */}
      <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2">
        <div className="text-xs text-gray-400 space-y-1">
          <div>• Drag to move charts</div>
          <div>• Drag bottom-right corner to resize</div>
          <div>• Ctrl+click for multi-select</div>
        </div>
      </div>
    </div>
  );
}