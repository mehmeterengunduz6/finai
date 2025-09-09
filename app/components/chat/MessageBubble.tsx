'use client';

import React, { useState, useEffect } from 'react';
import { ChatMessage } from '../../lib/types';
import FinancialChart from '../ui/FinancialChart';
import {
    ChainOfThought,
    ChainOfThoughtContent,
    ChainOfThoughtHeader,
    ChainOfThoughtStep,
} from '@/components/ai-elements/chain-of-thought';
import { Search, Building2, FileSearch, ListChecks, FileText, LineChart, MessageSquare, BarChart3 } from 'lucide-react';

interface MessageBubbleProps {
    message: ChatMessage;
    isNewMessage?: boolean;
    onAddToBoard?: (chartData: any, title: string) => void;
    showAddToBoardButton?: boolean;
}

export default function MessageBubble({ message, isNewMessage, onAddToBoard, showAddToBoardButton }: MessageBubbleProps) {
    const isUser = message.type === 'user';
    const [isVisible, setIsVisible] = useState(!isNewMessage);

    // Trigger animation for new messages
    useEffect(() => {
        if (isNewMessage) {
            // Small delay to ensure the element is mounted
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isNewMessage]);

    // Format message content (preserve line breaks)
    const formatContent = (content: string) => {
        return content.split('\n').map((line, index) => (
            <span key={index}>
                {line}
                {index < content.split('\n').length - 1 && <br />}
            </span>
        ));
    };

    return (
        <div 
            className={`flex ${isUser ? 'justify-end' : 'justify-start'} transition-all duration-500 ease-out ${
                isVisible 
                    ? 'opacity-100 transform translate-y-0 scale-100' 
                    : 'opacity-0 transform -translate-y-4 scale-95'
            }`}
            style={{
                transitionProperty: 'opacity, transform',
                transitionDuration: '0.5s',
                transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' // More bouncy easing
            }}
        >
            <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Message Content */}
                <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    {/* Only show text content for user messages, not assistant messages */}
                    {isUser && (
                        <div
                            className="px-4 py-3 rounded-3xl text-white"
                            style={{ backgroundColor: '#303030' }}
                        >
                            <div className="text-[0.95rem] leading-relaxed whitespace-pre-wrap">
                                {formatContent(message.content)}
                            </div>
                        </div>
                    )}

                    {/* Chain of Thought (reasoning steps) using ai-elements API */}
                    {!isUser && message.metadata?.reasoningSteps && message.metadata.reasoningSteps.length > 0 && (
                        <div className="w-full max-w-2xl">
                            <ChainOfThought defaultOpen>
                                <ChainOfThoughtHeader />
                                <ChainOfThoughtContent>
                                    {message.metadata.reasoningSteps.map((s, idx) => {
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
                                            <ChainOfThoughtStep key={s.id} icon={Icon} label={s.text} status={status} showConnector={idx < (message.metadata?.reasoningSteps?.length ?? 0) - 1} />
                                        );
                                    })}
                                </ChainOfThoughtContent>
                            </ChainOfThought>
                        </div>
                    )}

                    {/* Chart Display (below Chain of Thought) */}
                    {!isUser && message.metadata?.chartData && (
                        <div className="w-full max-w-2xl mt-3">
                            <FinancialChart 
                                chartData={message.metadata.chartData} 
                                className="mt-2"
                                onAddToBoard={onAddToBoard}
                                showAddToBoardButton={showAddToBoardButton}
                            />
                        </div>
                    )}

                    {/* Remove metadata display - no text for assistant messages */}
                </div>
            </div>
        </div>
    );
}
