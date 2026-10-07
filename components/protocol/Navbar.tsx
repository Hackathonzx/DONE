'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NetworkBadge } from '../web3/NetworkBadge';
import { WalletConnectButton } from '../web3/WalletConnectButton';
import { ShieldCheck, PlusCircle, LayoutDashboard, Briefcase, FileCode } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Protocol Explorer', icon: FileCode },
    { href: '/sponsor', label: 'Sponsor Portfolio', icon: LayoutDashboard },
    { href: '/worker', label: 'Worker Deliverables', icon: Briefcase },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-cyan-500 flex items-center justify-center font-mono font-bold text-black group-hover:bg-cyan-400 transition-colors">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-extrabold text-sm sm:text-base tracking-wider text-zinc-100">
                  DONE
                </span>
                <span className="text-[10px] font-mono px-1 bg-cyan-950 text-cyan-400 border border-cyan-800">
                  PROTOCOL
                </span>
              </div>
              <p className="text-[9px] font-mono text-zinc-400 tracking-tight hidden sm:block">
                SOLANA SETTLEMENT INFRASTRUCTURE
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 font-mono text-xs">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors border ${
                    isActive
                      ? 'border-zinc-700 bg-zinc-900 text-cyan-300 font-semibold'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side utilities */}
        <div className="flex items-center gap-3">
          <Link
            href="/agreements/new"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>New Agreement</span>
          </Link>

          <NetworkBadge />
          <WalletConnectButton />
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="lg:hidden flex items-center justify-around border-t border-zinc-800/60 bg-zinc-950 px-2 py-2 font-mono text-[11px]">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-2 py-1 ${isActive ? 'text-cyan-400 font-bold border-b border-cyan-400' : 'text-zinc-400'}`}
            >
              {link.label}
            </Link>
          );
        })}
        <Link
          href="/agreements/new"
          className="text-cyan-300 font-semibold px-2 py-1 flex items-center gap-1"
        >
          <PlusCircle className="w-3 h-3" /> New
        </Link>
      </div>
    </header>
  );
}
