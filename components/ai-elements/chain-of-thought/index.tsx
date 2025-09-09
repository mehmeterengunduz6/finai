'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Loader2, Dot, Brain } from 'lucide-react';

type Status = 'complete' | 'active' | 'pending';

interface ChainContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const ChainContext = createContext<ChainContextValue | null>(null);

function useChainContext() {
  const ctx = useContext(ChainContext);
  if (!ctx) throw new Error('ChainOfThought components must be used within <ChainOfThought />');
  return ctx;
}

type RootProps = React.ComponentProps<'div'> & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ChainOfThought({ open, defaultOpen = false, onOpenChange, className = '', children, ...rest }: RootProps) {
  const isControlled = typeof open === 'boolean';
  const [internalOpen, setInternalOpen] = useState<boolean>(defaultOpen);

  const actualOpen = isControlled ? (open as boolean) : internalOpen;
  const setOpen = useCallback(
    (v: boolean) => {
      if (!isControlled) setInternalOpen(v);
      onOpenChange?.(v);
    },
    [isControlled, onOpenChange]
  );

  const ctx = useMemo(() => ({ open: actualOpen, setOpen }), [actualOpen, setOpen]);

  return (
    <ChainContext.Provider value={ctx}>
      <div
        className={`w-full max-w-2xl rounded-xl border border-input/50 bg-input/20 backdrop-blur-sm ${className}`}
        {...rest}
      >
        {children}
      </div>
    </ChainContext.Provider>
  );
}

type HeaderProps = React.ComponentProps<'button'> & {
  children?: React.ReactNode;
};

export function ChainOfThoughtHeader({ children, className = '', ...rest }: HeaderProps) {
  const { open, setOpen } = useChainContext();
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={`group w-full flex items-center justify-between px-3 py-2 text-sm text-gray-300 hover:bg-input/30 rounded-t-xl ${className}`}
      {...rest}
    >
      <div className="flex items-center gap-2">
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="font-medium">{children ?? 'Chain of Thought'}</span>
      </div>
      <Brain size={16} className="text-gray-400 transition-colors group-hover:text-white" aria-hidden="true" />
    </button>
  );
}

type ContentProps = React.ComponentProps<'div'>;

export function ChainOfThoughtContent({ children, className = '', ...rest }: ContentProps) {
  const { open } = useChainContext();
  return (
    <div
      className={`px-3 py-2 transition-all duration-300 ${open ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 hidden'} ${className}`}
      {...rest}
    >
      {open ? children : null}
    </div>
  );
}

type LucideIcon = React.ComponentType<{ size?: number; className?: string }>;

type StepProps = React.ComponentProps<'div'> & {
  icon?: LucideIcon;
  label: string;
  description?: string;
  status?: Status;
  showConnector?: boolean;
};

export function ChainOfThoughtStep({ icon: Icon = Dot, label, description, status = 'complete', showConnector = false, className = '', children, ...rest }: StepProps) {
  const StatusIcon = status === 'complete' ? CheckCircle2 : status === 'active' ? Loader2 : Icon;
  const spin = status === 'active';
  return (
    <div className={`flex items-start gap-3 ${className}`} {...rest}>
      <div className="relative mt-0.5">
        <StatusIcon size={16} className={`${spin ? 'animate-spin' : ''} ${status === 'complete' ? 'text-green-400' : 'text-blue-400'}`} />
        {showConnector && (
          <div className="-mx-px absolute top-7 bottom-0 left-1/2 w-px bg-border" />
        )}
      </div>
      <div className="flex-1">
        <p className={`text-sm ${status === 'complete' ? 'text-green-300' : 'text-gray-300'}`}>{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
        {children && <div className="mt-2">{children}</div>}
      </div>
    </div>
  );
}

type SearchResultsProps = React.ComponentProps<'div'>;

export function ChainOfThoughtSearchResults({ children, className = '', ...rest }: SearchResultsProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`} {...rest}>
      {children}
    </div>
  );
}

type SearchResultProps = React.ComponentProps<'span'>;

export function ChainOfThoughtSearchResult({ children, className = '', ...rest }: SearchResultProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-input bg-background/40 px-2 py-0.5 text-xs text-gray-300 ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}

type ImageProps = React.ComponentProps<'div'> & {
  caption?: string;
};

export function ChainOfThoughtImage({ caption, children, className = '', ...rest }: ImageProps) {
  return (
    <div className={`rounded-lg overflow-hidden border border-input/50 bg-background/30 ${className}`} {...rest}>
      <div className="w-full">{children}</div>
      {caption && <div className="px-2 py-1 text-xs text-gray-400 border-t border-input/40">{caption}</div>}
    </div>
  );
}
