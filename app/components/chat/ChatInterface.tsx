'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../../lib/types';
import MessageBubble from './MessageBubble';
import { ArrowUpIcon } from '@heroicons/react/24/outline';
import { BorderBeam } from '../ui/magicui/border-beam';
import { Button } from '../ui/button';

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
        <div className="rounded-lg shadow-lg h-[600px] flex flex-col" style={{ backgroundColor: '#0f0f10' }}>
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
            <div className="p-4">
                <form onSubmit={handleSubmit} className="relative">
                    <div className="relative flex items-center">
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Hitit'in gelirlerinin yüzde kaçı döviz kazancından oluşuyor?"
                            className="w-full pl-4 pr-14 py-4 rounded-xl focus:outline-none resize-none min-h-[60px] max-h-32"
                            style={{
                                backgroundColor: '#2d2d2d',
                                border: '1px solid #404040',
                                color: '#ffffff',
                                fontWeight: '500',
                                transition: 'all 0.3s ease-in-out'
                            }}
                            disabled={isLoading}
                            rows={1}
                        />
                        <BorderBeam
                            size={40}
                            className="from-transparent via-yellow-500 to-transparent"
                            duration={1.5}
                        />
                        <Button
                            type="submit"
                            disabled={!inputValue.trim() || isLoading}
                            className="absolute right-2 w-10 h-10 rounded-full flex items-center justify-center focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            style={{
                                backgroundColor: inputValue.trim() ? '#ffffff' : '#2d2d2d',
                                border: 'none',
                                color: inputValue.trim() ? '#000000' : '#ffffff',
                                transition: 'all 0.3s ease-in-out'
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
            </div>
        </div>
    );
}