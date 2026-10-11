'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { DoneLogo } from '../protocol/DoneLogo';

interface SlideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  width?: string;
}

export function SlideDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = 'w-[460px]',
}: SlideDrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-mono text-neutral-100">
      {/* Semi-transparent dark backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Desktop: Right Sidebar */}
      <aside
        className={`hidden md:flex flex-col fixed top-0 right-0 h-full ${width} max-w-full bg-[#000000] border-l border-[#26262a] p-6 z-50 overflow-y-auto shadow-2xl transition-transform duration-300 animate-in slide-in-from-right`}
      >
        <div className="flex items-start justify-between pb-4 border-b border-[#26262a]">
          <div className="flex items-center gap-3">
            <DoneLogo className="w-6 h-6" />
            <div>
              <div className="text-sm font-bold text-white">{title}</div>
              {subtitle && <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="py-4 flex-1">{children}</div>
      </aside>

      {/* Mobile: Bottom Drawer */}
      <div className="md:hidden fixed inset-x-0 bottom-0 bg-[#000000] border-t border-[#26262a] rounded-t-3xl p-6 z-50 max-h-[88vh] overflow-y-auto shadow-2xl transition-transform duration-300 animate-in slide-in-from-bottom">
        {/* Drag handle */}
        <div className="w-12 h-1.5 bg-[#26262a] rounded-full mx-auto mb-4" />

        <div className="flex items-start justify-between pb-4 border-b border-[#26262a]">
          <div className="flex items-center gap-3">
            <DoneLogo className="w-6 h-6" />
            <div>
              <div className="text-sm font-bold text-white">{title}</div>
              {subtitle && <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="py-4">{children}</div>
      </div>
    </div>
  );
}
