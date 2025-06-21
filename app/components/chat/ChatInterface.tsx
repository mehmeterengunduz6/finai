'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../../lib/types';
import MessageBubble from './MessageBubble';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';

interface ChatInterfaceProps {
    messages: ChatMessage[];
    onSendMessage: (message: string) => void;
    isLoading: boolean;
}

const EXAMPLE_QUESTIONS = [
    "What percentage of revenue comes from foreign currency in the last 5 years?",
    "How has the company's revenue grown quarter over quarter?",
    "What was the FX impact on earnings in Q3 2023?",
    "Compare revenue trends between Q1 2024 and Q1 2023"
];

export default function ChatInterface({ messages, onSendMessage, isLoading }: ChatInterfaceProps) {
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

    const handleExampleClick = (question: string) => {
        if (!isLoading) {
            setInputValue(question);
        }
    };

    return (
        <div className="rounded-lg shadow-lg h-[600px] flex flex-col" style={{ backgroundColor: '#1D1E22' }}>
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="mb-6">
                            <h3 className="text-xl font-semibold mb-3" style={{ color: '#ffffff' }}>Ask questions about your financial reports</h3>
                            <p className="text-base" style={{ color: '#ffffff' }}>Try one of these example questions:</p>
                        </div>

                        <div className="space-y-3 max-w-2xl mx-auto">
                            {EXAMPLE_QUESTIONS.map((question, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleExampleClick(question)}
                                    className="block w-full text-left p-4 text-sm rounded-lg transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                                    style={{ 
                                        backgroundColor: '#151519', 
                                        borderColor: '#343538',
                                        border: '1px solid #343538',
                                        color: '#ffffff'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#1D1E22';
                                        e.currentTarget.style.borderColor = '#4A4A4A';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = '#151519';
                                        e.currentTarget.style.borderColor = '#343538';
                                    }}
                                    disabled={isLoading}
                                >
                                    <span className="font-medium">"{question}"</span>
                                </button>
                            ))}
                        </div>
                        

                    </div>
                ) : (
                    messages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                    ))
                )}

                {/* Loading indicator */}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="rounded-lg px-4 py-2 max-w-xs" style={{ backgroundColor: '#151519' }}>
                            <div className="flex space-x-2">
                                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#ffffff' }}></div>
                                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#ffffff', animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#ffffff', animationDelay: '0.2s' }}></div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-4" style={{ borderTop: '1px solid #343538' }}>
                <form onSubmit={handleSubmit} className="flex space-x-2">
                    <div className="flex-1 relative">
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Hitit'in gelirlerinin yüzde kaçı döviz kazancından oluşuyor?"
                            className="w-full px-4 py-3 rounded-lg focus:outline-none resize-none min-h-[48px] max-h-32"
                            style={{
                                backgroundColor: '#151519',
                                border: '1px solid #343538',
                                color: '#ffffff',
                                transition: 'all 0.3s ease-in-out'
                            }}
                            disabled={isLoading}
                            rows={1}
                        />
                    </div>
                    <div className="relative">
                        <button
                            type="submit"
                            disabled={!inputValue.trim() || isLoading}
                            className="px-4 py-3 rounded-lg focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            style={{
                                backgroundColor: '#151519',
                                border: '1px solid #343538',
                                color: '#ffffff',
                                transition: 'all 0.3s ease-in-out'
                            }}
                            onMouseEnter={(e) => {
                                if (!e.currentTarget.disabled) {
                                    e.currentTarget.style.backgroundColor = '#1D1E22';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!e.currentTarget.disabled) {
                                    e.currentTarget.style.backgroundColor = '#151519';
                                }
                            }}
                        >
                            <PaperAirplaneIcon className="h-5 w-5" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}