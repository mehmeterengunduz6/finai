'use client';

import React from 'react';

interface ShimmeringTextProps {
  text: string;
  className?: string;
  duration?: number;
  repeatDelay?: number;
}

export function ShimmeringText({ 
  text, 
  className = '', 
  duration = 1.5, 
  repeatDelay = 1
}: ShimmeringTextProps) {
  return (
    <span
      className={className}
      style={{
        background: `linear-gradient(90deg, 
          transparent 0%, 
          transparent 20%, 
          rgba(255,255,255,0.8) 50%, 
          transparent 80%, 
          transparent 100%
        ), 
        linear-gradient(90deg, #ffffff, #ffffff)`,
        backgroundSize: '200% 100%, 100% 100%',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        color: 'transparent',
        animation: `shimmer ${duration}s linear infinite`,
        animationDelay: `${repeatDelay}s`,
        display: 'inline-block',
      }}
    >
      {text}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0, 0 0;
          }
          100% {
            background-position: 200% 0, 0 0;
          }
        }
      `}</style>
    </span>
  );
}