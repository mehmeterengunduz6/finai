'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../../lib/types';
import MessageBubble from './MessageBubble';
import ProcessSteps, { ProcessStep } from './ProcessSteps';
import { ArrowUpIcon } from '@heroicons/react/24/outline';
import { BorderBeam } from '../ui/magicui/border-beam';
import { Button } from '../ui/Button';

interface ChatInterfaceProps {
    messages: ChatMessage[];
    onSendMessage: (message: string) => void;
    isLoading: boolean;
    currentProcessStep?: ProcessStep;
}



export default function ChatInterface({ messages, onSendMessage, isLoading, currentProcessStep }: ChatInterfaceProps) {
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const previousMessageCountRef = useRef(0);

    // Auto scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        
        // Update previous count after animation
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



    return (
        <div className="shadow-lg h-full flex flex-col" style={{ backgroundColor: '#0f0f10' }}>
            {messages.length === 0 ? (
                // Centered layout when no messages
                <div className="flex flex-col h-full">
                    {/* Centered content */}
                    <div className="flex-1 flex flex-col items-center justify-center px-4">
                        <div className="text-center mb-8">
                            <h3 className="text-xl font-semibold mb-3" style={{ color: '#ffffff' }}>Ask questions about your financial reports</h3>
                        </div>
                        
                        {/* Centered input */}
                        <div className="w-full max-w-2xl">
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
                                        size={100}
                                        className="from-transparent via-blue-500 to-transparent"
                                        duration={1.5}
                                    />
                                    <Button
                                        type="submit"
                                        disabled={!inputValue.trim() || isLoading}
                                        className="absolute right-2 w-10 h-10 rounded-full flex items-center justify-center focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                        style={{
                                            backgroundColor: inputValue.trim() ? '#ffffff' : '#2d2d2d',
                                            border: inputValue.trim() ? 'none' : '1px solid #404040',
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
                </div>
            ) : (
                // Normal chat layout when messages exist
                <>
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-4">
                        {messages.map((message, index) => {
                            // Check if this message is new based on previous count
                            const isNewMessage = index >= previousMessageCountRef.current;
                            return (
                                <MessageBubble 
                                    key={message.id} 
                                    message={message} 
                                    isNewMessage={isNewMessage}
                                />
                            );
                        })}

                        {/* Process Steps indicator */}
                        {isLoading && currentProcessStep && (
                            <div className="w-full">
                                <ProcessSteps currentStep={currentProcessStep} />
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Form */}
                    <div className="px-4 pt-1 pb-4">
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
                                    size={100}
                                    className="from-transparent via-blue-500 to-transparent"
                                    duration={1.5}
                                />
                                <Button
                                    type="submit"
                                    disabled={!inputValue.trim() || isLoading}
                                    className="absolute right-2 w-10 h-10 rounded-full flex items-center justify-center focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    style={{
                                        backgroundColor: inputValue.trim() ? '#ffffff' : '#2d2d2d',
                                        border: inputValue.trim() ? 'none' : '1px solid #404040',
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
                </>
            )}
        </div>
    );
}