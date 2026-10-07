import React from 'react';

export function Card({
  children,
  className = '',
  highlight = false,
}: {
  children: React.ReactNode;
  className?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`border rounded-none bg-zinc-950/70 backdrop-blur-sm ${
        highlight
          ? 'border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.06)]'
          : 'border-zinc-800/80 hover:border-zinc-700/80 transition-colors'
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`p-4 sm:p-5 border-b border-zinc-800/80 flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
}

export function CardContent({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`p-4 sm:p-5 ${className}`}>{children}</div>;
}

export function CardFooter({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`p-4 sm:p-5 border-t border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
}
