'use client';

import React from 'react';
import { ChatMessage } from '../../lib/types';
import { UserIcon, CpuChipIcon } from '@heroicons/react/24/outline';
import FinancialChart from '../ui/FinancialChart';

interface MessageBubbleProps {
    message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
    const isUser = message.type === 'user';

    // Format timestamp
    const timeString = message.timestamp.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

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
            <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} space-x-2`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 ${isUser ? 'ml-2' : 'mr-2'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-black' : 'bg-gray-600'
                        }`}>
                        {isUser ? (
                            <UserIcon className="h-5 w-5 text-white" />
                        ) : (
                            <CpuChipIcon className="h-5 w-5 text-white" />
                        )}
                    </div>
                </div>

                {/* Message Content */}
                <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                        className={`px-4 py-3 rounded-2xl ${isUser
                                ? 'bg-black text-white rounded-br-md'
                                : 'bg-gray-100 text-white rounded-bl-md'
                            }`}
                        style={!isUser ? { backgroundColor: '#151519' } : {}}
                    >
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
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
                    <div className={`mt-1 text-xs ${isUser ? 'text-right' : 'text-left'}`} style={{ color: '#ffffff' }}>
                        {timeString}
                        {message.metadata?.usedFiles && message.metadata.usedFiles.length > 0 && (
                            <span className="ml-2">
                                • Used {message.metadata.usedFiles.length} report{message.metadata.usedFiles.length > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}