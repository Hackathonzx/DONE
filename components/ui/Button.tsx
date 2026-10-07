import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', isLoading = false, className = '', disabled, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center font-mono font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed select-none rounded-none tracking-wide text-xs sm:text-sm';

    const variants = {
      primary:
        'bg-cyan-500 hover:bg-cyan-400 text-black font-semibold border border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)]',
      secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700',
      outline: 'bg-transparent hover:bg-zinc-900 text-zinc-200 border border-zinc-800 hover:border-zinc-700',
      danger: 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800',
      ghost: 'bg-transparent hover:bg-zinc-800/60 text-zinc-300 border border-transparent',
    };

    const sizes = {
      sm: 'px-2.5 py-1 text-xs gap-1.5',
      md: 'px-4 py-2 gap-2',
      lg: 'px-5 py-2.5 text-sm gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-0.5 h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
