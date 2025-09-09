'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../../lib/types';
import MessageBubble from './MessageBubble';
import type { ProcessStep } from './ProcessSteps';
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from '@/components/ai-elements/chain-of-thought';
import { Search, Building2, FileSearch, ListChecks, FileText, LineChart, MessageSquare, BarChart3 } from 'lucide-react';
import { ArrowUpIcon } from '@heroicons/react/24/outline';
import { BorderBeam } from '../ui/magicui/border-beam';
import { Button } from '../ui/Button';
import { ShimmeringText } from '@/components/ui/shimmering-text';
import { motion } from 'motion/react';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  currentProcessStep?: ProcessStep;
  chainOfThoughtSteps?: ProcessStep[];
  onAddToBoard?: (chartData: any, title: string) => void;
  showAddToBoardButtons?: boolean;
  // True when the layout is split (chat + board). Used to adjust input position.
  isSplitView?: boolean;
}

export default function ChatInterface({
  messages,
  onSendMessage,
  isLoading,
  currentProcessStep,
  chainOfThoughtSteps = [],
  onAddToBoard,
  showAddToBoardButtons,
  isSplitView = false,
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousMessageCountRef = useRef(0);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    const timer = setTimeout(() => {
      previousMessageCountRef.current = messages.length;
    }, 600);
    return () => clearTimeout(timer);
  }, [messages]);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const hasMessages = messages.length > 0;
  const hasCoT = chainOfThoughtSteps && chainOfThoughtSteps.length > 0;

  return (
    <div className="shadow-lg h-full flex flex-col" style={{ backgroundColor: '#0f0f10' }}>
      {/* Messages area when present or when showing live Chain of Thought */}
      {(hasMessages || hasCoT) && (
        <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-4">
          {messages.map((message, index) => {
            const isNewMessage = index >= previousMessageCountRef.current;
            return (
              <MessageBubble
                key={message.id}
                message={message}
                isNewMessage={isNewMessage}
                onAddToBoard={onAddToBoard}
                showAddToBoardButton={showAddToBoardButtons}
              />
            );
          })}

          {/* Live Chain of Thought during generation */}
          {hasCoT && (
            <div className="w-full max-w-3xl mx-auto">
              <ChainOfThought defaultOpen>
                <ChainOfThoughtHeader />
                <ChainOfThoughtContent>
                  {chainOfThoughtSteps.map((s, idx) => {
                    const id = (s.id || '').toLowerCase();
                    const Icon =
                      id.includes('company') ? Building2 :
                      id.includes('document_search') ? Search :
                      id.includes('document_selection') ? ListChecks :
                      id.includes('content_extraction') ? FileSearch :
                      id.includes('data_analysis') ? LineChart :
                      id.includes('response_generation') ? MessageSquare :
                      id.includes('chart_creation') ? BarChart3 :
                      id.includes('query') ? Search : FileText;
                    const status: 'complete' | 'active' | 'pending' = s.status === 'completed' ? 'complete' : s.status === 'in_progress' ? 'active' : 'pending';
                    return (
                      <ChainOfThoughtStep key={s.id} icon={Icon} label={s.text} status={status} showConnector={idx < (chainOfThoughtSteps?.length ?? 0) - 1} />
                    );
                  })}
                </ChainOfThoughtContent>
              </ChainOfThought>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* When empty: add spacers to control vertical position.
          - Split view: add top spacer to push input to bottom.
          - Chat-only home: add top and bottom spacers to center input. */}
      {/* Top spacer: always add when empty to enable centering or bottom anchoring */}
      {!hasMessages && !hasCoT && <div className="flex-1" />}

      {/* Input section */}
      <motion.div
        layout
        className={`px-4 pt-1 pb-4`}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        style={{ willChange: 'transform' }}
      >
        {!hasMessages && !hasCoT && (
          <div className="text-center mb-6">
            <ShimmeringText
              text="Ask questions about your financial reports"
              className="text-xl font-semibold"
              duration={1.5}
              repeatDelay={1}
              color="#cccccc"
              shimmerColor="#ffffff"
            />
          </div>
        )}
        <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto">
          <div className="relative flex items-center">
            {/* Single-line, truncating placeholder overlay to avoid wrapping */}
            {!(isFocused || inputValue.trim().length > 0) && (
              <div
                className="absolute left-4 right-14 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none whitespace-nowrap overflow-hidden text-ellipsis text-sm"
                aria-hidden="true"
              >
                {"Hitit'in gelirlerinin yüzde kaçı döviz kazancından oluşuyor?"}
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="w-full pl-4 pr-14 py-4 rounded-xl focus:outline-none resize-none min-h-[60px] max-h-32"
              style={{
                backgroundColor: '#2d2d2d',
                border: '1px solid #404040',
                color: '#ffffff',
                fontWeight: '500',
                transition: 'background-color 0.2s ease, border-color 0.2s ease',
              }}
              disabled={isLoading}
              rows={1}
            />
            <BorderBeam size={100} className="from-transparent via-blue-500 to-transparent" duration={1.5} />
            <Button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="absolute right-2 w-10 h-10 rounded-full flex items-center justify-center focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              style={{
                backgroundColor: inputValue.trim() ? '#ffffff' : '#2d2d2d',
                border: inputValue.trim() ? 'none' : '1px solid #404040',
                color: inputValue.trim() ? '#000000' : '#ffffff',
                transition: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = inputValue.trim() ? '#f0f0f0' : '#404040';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = inputValue.trim() ? '#ffffff' : '#2d2d2d';
                }
              }}
            >
              <ArrowUpIcon className="h-5 w-5" />
            </Button>
          </div>
        </form>
      </motion.div>

      {/* Bottom spacer: only add in chat-only home to center content */}
      {!hasMessages && !isSplitView && !hasCoT && <div className="flex-1" />}
    </div>
  );
}
