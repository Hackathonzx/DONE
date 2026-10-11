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
          <label className="text-xs font-medium text-neutral-300 tracking-wide flex justify-between">
            <span>{label}</span>
          </label>
        )}
        <input
          ref={ref}
          className={`w-full bg-[#000000] border px-3.5 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 rounded-xl focus:outline-none focus:border-violet-500 transition-colors ${
            error ? 'border-red-500' : 'border-[#26262a]'
          } ${className}`}
          {...props}
        />
        {helperText && !error && <span className="text-[11px] text-neutral-400">{helperText}</span>}
        {error && <span className="text-[11px] text-red-400">{error}</span>}
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
          <label className="text-xs font-medium text-neutral-300 tracking-wide flex justify-between">
            <span>{label}</span>
          </label>
        )}
        <textarea
          ref={ref}
          className={`w-full bg-[#000000] border px-3.5 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 rounded-xl focus:outline-none focus:border-violet-500 transition-colors ${
            error ? 'border-red-500' : 'border-[#26262a]'
          } ${className}`}
          {...props}
        />
        {helperText && !error && <span className="text-[11px] text-neutral-400">{helperText}</span>}
        {error && <span className="text-[11px] text-red-400">{error}</span>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
