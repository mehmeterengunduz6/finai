'use client';

import React, { useState, useEffect } from 'react';
import { ChatMessage } from '../../lib/types';
import FinancialChart from '../ui/FinancialChart';

interface MessageBubbleProps {
    message: ChatMessage;
    isNewMessage?: boolean;
}

export default function MessageBubble({ message, isNewMessage }: MessageBubbleProps) {
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
                    <div
                        className={`${isUser
                                ? 'px-4 py-3 rounded-3xl text-white'
                                : 'text-white'
                            }`}
                        style={isUser ? { backgroundColor: '#303030' } : { backgroundColor: 'transparent' }}
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
                            {message.metadata.usedFiles.length} rapor kullanıldı
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}