import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5 font-mono">
        {label && (
          <label className="text-xs font-medium text-zinc-300 tracking-wide flex justify-between">
            <span>{label}</span>
          </label>
        )}
        <input
          ref={ref}
          className={`w-full bg-zinc-900/90 border px-3 py-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 rounded-none focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-colors ${
            error ? 'border-rose-500' : 'border-zinc-800'
          } ${className}`}
          {...props}
        />
        {helperText && !error && <span className="text-[11px] text-zinc-400">{helperText}</span>}
        {error && <span className="text-[11px] text-rose-400">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helperText, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5 font-mono">
        {label && (
          <label className="text-xs font-medium text-zinc-300 tracking-wide flex justify-between">
            <span>{label}</span>
          </label>
        )}
        <textarea
          ref={ref}
          className={`w-full bg-zinc-900/90 border px-3 py-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 rounded-none focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-colors ${
            error ? 'border-rose-500' : 'border-zinc-800'
          } ${className}`}
          {...props}
        />
        {helperText && !error && <span className="text-[11px] text-zinc-400">{helperText}</span>}
        {error && <span className="text-[11px] text-rose-400">{error}</span>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
