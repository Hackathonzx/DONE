'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { DoneLogo } from '../protocol/DoneLogo';
import { useWallet } from '../web3/WalletContext';
import { WalletConnectButton } from '../web3/WalletConnectButton';
import { CreateAgreementDrawer } from '../protocol/CreateAgreementDrawer';
import {
  LayoutDashboard,
  FileCode,
  Shield,
  Briefcase,
  Settings,
  PlusCircle,
  Activity,
} from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { connected } = useWallet();
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  const navItems = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/agreements', label: 'Agreements', icon: FileCode },
    { href: '/sponsor', label: 'Sponsor Hub', icon: Shield },
    { href: '/worker', label: 'Worker Hub', icon: Briefcase },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#16171a] text-neutral-100 flex font-mono selection:bg-neutral-800 selection:text-white">
      {/* Create Agreement Drawer mounted globally */}
      <CreateAgreementDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        onSuccess={(agreementKey) => {
          router.push(`/agreements/${agreementKey}`);
        }}
      />

      {/* Desktop: Fixed Left Navigation */}
      <aside className="hidden md:flex flex-col w-64 bg-[#000000] border-r border-[#26262a] fixed inset-y-0 left-0 z-40 select-none">
        {/* Brand with DoneLogo */}
        <Link href="/" className="h-16 px-6 flex items-center gap-3 border-b border-[#26262a] hover:bg-neutral-950 transition-colors">
          <DoneLogo className="w-8 h-8" />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-base tracking-widest text-white">DONE</span>
              <span className="text-[10px] text-violet-400 font-semibold px-1.5 py-0.2 rounded bg-violet-500/10 border border-violet-500/30">
                ESCROW
              </span>
            </div>
            <span className="text-[10px] text-neutral-400 tracking-tight">SOLANA DEVNET</span>
          </div>
        </Link>

        {/* Navigation Targets */}
        <div className="p-4 space-y-1.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? 'bg-[#000000] text-white border border-violet-500/50 shadow-sm shadow-violet-950/40'
                    : 'text-neutral-400 hover:text-white hover:bg-[#000000] border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-violet-400' : 'text-neutral-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-4">
            <button
              onClick={() => setIsCreateDrawerOpen(true)}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-violet-600/25 border border-violet-500/40 active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Agreement</span>
            </button>
          </div>
        </div>

        {/* Desktop Left Nav Footer: Live Network Status */}
        <div className="p-4 border-t border-[#26262a] space-y-2 text-xs">
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-[#000000] border border-[#26262a] text-[11px] text-neutral-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Solana Devnet
            </span>
            <span className="text-violet-400 font-semibold">Live RPC</span>
          </div>
        </div>
      </aside>

      {/* Main Container Wrapper */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0 bg-[#16171a]">
        {/* Top Context Bar: Attached to top with rounded bottom corners (furthest from top attached corners) */}
        <header className="h-16 px-4 md:px-8 border-b border-x border-[#26262a] bg-[#000000] rounded-b-2xl flex items-center justify-between sticky top-0 z-30 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          {/* Mobile brand */}
          <Link href="/" className="md:hidden flex items-center gap-2.5">
            <DoneLogo className="w-7 h-7" />
            <span className="font-black text-sm tracking-wider text-white">DONE</span>
            <span className="text-[10px] text-violet-400 font-semibold px-1.5 py-0.2 rounded bg-violet-500/10 border border-violet-500/30">
              ESCROW
            </span>
          </Link>

          {/* Desktop Left: Live Status */}
          <div className="hidden md:flex items-center gap-3 text-xs text-neutral-400">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#000000] border border-[#26262a] text-neutral-200">
              <Activity className="w-3.5 h-3.5 text-violet-400" />
              <span>Non-Custodial Escrow Protocol</span>
            </div>
          </div>

          {/* Right: Quick Action & Live Wallet Button */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsCreateDrawerOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/30 text-violet-300 text-xs font-semibold transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Escrow</span>
            </button>

            <WalletConnectButton />
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Dock Navigation: Attached to bottom with rounded top corners, icons only (no text) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-[#000000] border-t border-x border-[#26262a] rounded-t-2xl z-40 flex items-center justify-around px-2 select-none shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
                active
                  ? 'text-violet-400 bg-violet-600/15 border border-violet-500/30'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#16171a]'
              }`}
            >
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
        <button
          onClick={() => setIsCreateDrawerOpen(true)}
          aria-label="New Escrow"
          title="New Escrow"
          className="p-2.5 rounded-xl text-violet-300 hover:text-white bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 transition-all flex items-center justify-center"
        >
          <PlusCircle className="w-5 h-5 text-violet-400" />
        </button>
      </nav>
    </div>
  );
}
