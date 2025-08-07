'use client';

import React from 'react';
import { ChatMessage } from '../../lib/types';
import FinancialChart from '../ui/FinancialChart';

interface MessageBubbleProps {
    message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
    const isUser = message.type === 'user';

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
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Message Content */}
                <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    {/* Only show text content for user messages, not assistant messages */}
                    {isUser && (
                        <div
                            className="px-4 py-3 rounded-3xl text-white"
                            style={{ backgroundColor: '#303030' }}
                        >
                            <div className="text-base leading-relaxed whitespace-pre-wrap">
                                {formatContent(message.content)}
                            </div>
                        </div>
                    )}

                    {/* Chart Display */}
                    {!isUser && message.metadata?.chartData && (
                        <div className="w-full max-w-2xl mt-3">
                            <FinancialChart 
                                chartData={message.metadata.chartData} 
                                className="mt-2"
                            />
                        </div>
                    )}

                    {/* Remove metadata display - no text for assistant messages */}
                </div>
            </div>
        </div>
    );
}