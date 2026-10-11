import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'destructive' | 'ghost' | 'violet';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', isLoading = false, className = '', disabled, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center font-mono font-medium transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:opacity-40 disabled:cursor-not-allowed select-none rounded-xl tracking-wide text-xs sm:text-sm active:scale-[0.98]';

    const variants = {
      primary:
        'bg-violet-600 text-white font-semibold hover:bg-violet-500 active:bg-violet-700 shadow-lg shadow-violet-600/25 border border-violet-500/40',
      violet:
        'bg-violet-600 text-white font-semibold hover:bg-violet-500 active:bg-violet-700 shadow-lg shadow-violet-600/25 border border-violet-500/40',
      secondary:
        'bg-[#000000] border border-[#26262a] text-neutral-200 hover:border-violet-500/40 hover:text-white',
      outline:
        'bg-transparent border border-[#26262a] text-neutral-200 hover:bg-[#000000] hover:border-violet-500/30',
      danger:
        'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20',
      destructive:
        'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20',
      ghost:
        'bg-transparent hover:bg-[#000000] text-neutral-300 border border-transparent',
    };

    const sizes = {
      sm: 'py-1.5 px-3 text-xs gap-1.5',
      md: 'py-2.5 px-4 text-xs sm:text-sm gap-2',
      lg: 'py-3 px-5 text-sm gap-2.5',
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
