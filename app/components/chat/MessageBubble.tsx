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
                    <div
                        className={`${isUser
                                ? 'px-4 py-3 rounded-3xl bg-blue-500 text-white'
                                : 'text-white'
                            }`}
                        style={!isUser ? { backgroundColor: 'transparent' } : {}}
                    >
                        <div className="text-base leading-relaxed whitespace-pre-wrap">
                            {formatContent(message.content)}
                        </div>
                    </div>

                    {/* Chart Display */}
                    {!isUser && message.metadata?.chartData && (
                        <div className="w-full max-w-2xl mt-3">
                            <FinancialChart 
                                chartData={message.metadata.chartData} 
                                className="mt-2"
                            />
                        </div>
                    )}

                    {/* Metadata */}
                    {message.metadata?.usedFiles && message.metadata.usedFiles.length > 0 && (
                        <div className={`mt-1 text-xs ${isUser ? 'text-right' : 'text-left'}`} style={{ color: '#ffffff' }}>
                            Used {message.metadata.usedFiles.length} report{message.metadata.usedFiles.length > 1 ? 's' : ''}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}