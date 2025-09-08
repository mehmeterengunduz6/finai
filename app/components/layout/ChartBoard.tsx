'use client';

import React, { useState, useCallback, useRef } from 'react';
import { ChartBoardItem, ChartBoardItemUpdate, ViewMode } from './types';
import ChartBoardItemComponent from './ChartBoardItem';
import { PlusIcon } from '@heroicons/react/24/outline';

interface ChartBoardProps {
  items: ChartBoardItem[];
  onUpdateItems: (items: ChartBoardItem[]) => void;
  className?: string;
  viewMode?: ViewMode;
  onCreateChart?: (slotId: string) => void;
}

export default function ChartBoard({ items, onUpdateItems, className = '', viewMode, onCreateChart }: ChartBoardProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const itemsContainerRef = useRef<HTMLDivElement>(null);

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

      {/* Board Header removed for full-view experience */}

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
      <div className="absolute inset-0 overflow-auto" ref={itemsContainerRef}>
        {(() => {
          const cols = viewMode === 'split' ? 2 : 3;
          const rows = Math.max(2, Math.ceil(items.length / cols) + 1);
          const total = cols * rows;
          const gridStyle: React.CSSProperties = {
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: '1rem',
            padding: '1rem'
          };

          const slots = Array.from({ length: total }).map((_, idx) => {
            const row = Math.floor(idx / cols);
            const col = idx % cols;
            const slotId = `r${row}-c${col}`;
            const item = items[idx];
            return (
              <div key={slotId} className="relative w-full">
                <div className="w-full aspect-[4/3]">
                  {item ? (
                    <ChartBoardItemComponent
                      item={item}
                      isSelected={selectedItems.includes(item.id)}
                      onUpdate={(updates) => handleItemUpdate(item.id, updates)}
                      onDelete={() => handleDeleteItem(item.id)}
                      onSelect={(multiSelect) => handleSelectItem(item.id, multiSelect)}
                      variant="grid"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onCreateChart && onCreateChart(slotId)}
                      className="w-full h-full border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Create chart"
                      tabIndex={0}
                    >
                      <span className="text-3xl">+</span>
                    </button>
                  )}
                </div>
              </div>
            );
          });

          return (
            <div style={gridStyle}>
              {slots}
            </div>
          );
        })()}
      </div>

      {/* Tips container removed per request */}
    </div>
  );
}
