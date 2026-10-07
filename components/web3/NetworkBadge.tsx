'use client';

import React from 'react';
import { useWallet } from './WalletContext';
import { Activity } from 'lucide-react';

export function NetworkBadge() {
  const { cluster, currentSlot, rpcLatencyMs } = useWallet();

  return (
    <div className="hidden md:flex items-center gap-3 px-2.5 py-1 bg-zinc-950/80 border border-zinc-800 text-xs font-mono">
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-zinc-200 uppercase font-semibold text-[11px]">SOLANA {cluster}</span>
      </div>
      <span className="text-zinc-700">|</span>
      <div className="text-zinc-400 text-[11px] flex items-center gap-1">
        <span>SLOT:</span>
        <span className="text-zinc-200 tabular-nums">#{currentSlot.toLocaleString()}</span>
      </div>
      <span className="text-zinc-700">|</span>
      <div className="text-zinc-400 text-[11px] flex items-center gap-1">
        <Activity className="w-3 h-3 text-cyan-400" />
        <span className="text-zinc-200 tabular-nums">{rpcLatencyMs}ms</span>
      </div>
    </div>
  );
}
