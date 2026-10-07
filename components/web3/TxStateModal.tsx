'use client';

import React from 'react';
import { TransactionExecutionState } from '@/types/protocol';
import { getExplorerUrl, truncateAddress } from '@/lib/solana';
import { Button } from '../ui/Button';
import { CheckCircle2, AlertTriangle, ExternalLink, ShieldCheck, Cpu } from 'lucide-react';

interface TxStateModalProps {
  state: TransactionExecutionState;
  isOpen: boolean;
  onClose: () => void;
}

export function TxStateModal({ state, isOpen, onClose }: TxStateModalProps) {
  if (!isOpen || state.status === 'idle') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 shadow-2xl p-6 font-mono text-xs sm:text-sm text-zinc-200">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="text-zinc-400 uppercase tracking-widest text-xs font-semibold">
              SOLANA DEVNET TRANSACTION
            </span>
          </div>
          <span className="text-[11px] text-zinc-400">CLUSTER: DEVNET</span>
        </div>

        {/* Action Title */}
        <div className="mb-4">
          <h3 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
            {state.actionName || 'Anchor Program Instruction'}
          </h3>
          {state.instructionSummary && (
            <p className="text-zinc-400 text-xs mt-1">{state.instructionSummary}</p>
          )}
        </div>

        {/* State: Requesting Wallet Signature */}
        {state.status === 'requesting_signature' && (
          <div className="py-6 flex flex-col items-center text-center space-y-4">
            <div className="relative w-14 h-14 flex items-center justify-center rounded-full bg-cyan-950/60 border border-cyan-500/50">
              <ShieldCheck className="w-7 h-7 text-cyan-400 animate-bounce" />
            </div>
            <div>
              <p className="font-semibold text-zinc-100 text-sm">Awaiting Wallet Approval</p>
              <p className="text-zinc-400 text-xs mt-1">
                Simulating Ed25519 signature request from connected keypair...
              </p>
            </div>
          </div>
        )}

        {/* State: Confirming on Solana Devnet */}
        {state.status === 'confirming' && (
          <div className="py-6 flex flex-col items-center text-center space-y-4">
            <div className="relative w-14 h-14 flex items-center justify-center rounded-full bg-amber-950/60 border border-amber-500/50">
              <svg className="animate-spin w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-zinc-100 text-sm">Broadcasting & Confirming Block</p>
              <p className="text-zinc-400 text-xs mt-1">
                Transaction submitted to RPC node. Awaiting commitment: <span className="text-amber-400">confirmed</span>
              </p>
            </div>
            {state.signature && (
              <div className="w-full bg-zinc-900 border border-zinc-800 p-2.5 rounded-none text-left">
                <span className="text-[10px] text-zinc-400 block mb-0.5">TRANSACTION SIGNATURE</span>
                <span className="text-[11px] text-amber-300 break-all font-mono">
                  {state.signature}
                </span>
              </div>
            )}
          </div>
        )}

        {/* State: Confirmed */}
        {state.status === 'confirmed' && (
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
              <div>
                <p className="font-semibold text-xs text-emerald-200">
                  Instruction Executed & Block Finalized
                </p>
                <p className="text-[11px] text-emerald-400/80">
                  On-chain account state updated with 31+ cluster confirmations.
                </p>
              </div>
            </div>

            {/* Diagnostic details */}
            <div className="bg-zinc-900/90 border border-zinc-800 p-3 space-y-2 text-xs">
              {state.signature && (
                <div>
                  <span className="text-zinc-400 block text-[10px]">SIGNATURE (TX HASH)</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-cyan-300 break-all text-[11px] font-mono">
                      {truncateAddress(state.signature, 16)}
                    </span>
                    <a
                      href={getExplorerUrl(state.signature, 'tx')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 underline ml-2 flex-shrink-0"
                    >
                      Explorer <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
                <div>
                  <span className="text-zinc-400 text-[10px]">SLOT</span>
                  <p className="text-zinc-200 font-medium">#{state.slot?.toLocaleString() || '298,419,205'}</p>
                </div>
                <div>
                  <span className="text-zinc-400 text-[10px]">COMPUTE UNITS</span>
                  <p className="text-zinc-200 font-medium flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-cyan-400" />
                    {state.computeUnits?.toLocaleString() || '21,400'} CU
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-zinc-400 text-[10px]">NETWORK FEE</span>
                  <p className="text-zinc-200 font-medium">{state.feeLamports || 5000} Lamports (~0.000005 SOL)</p>
                </div>
                <div>
                  <span className="text-zinc-400 text-[10px]">COMMITMENT</span>
                  <p className="text-emerald-400 font-medium">Finalized</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* State: Failed */}
        {state.status === 'failed' && (
          <div className="py-4 space-y-3">
            <div className="flex items-start gap-3 p-3 bg-rose-950/50 border border-rose-800 text-rose-300">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="font-semibold text-xs text-rose-200">Anchor Instruction Reverted</p>
                <p className="text-xs text-rose-300/90 mt-1 break-words">{state.error}</p>
              </div>
            </div>
            <p className="text-[11px] text-zinc-400">
              The transaction was rejected by the Solana runtime. No funds were transferred and state remains unchanged.
            </p>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-end gap-2">
          {state.status === 'confirmed' || state.status === 'failed' ? (
            <Button variant="primary" size="sm" onClick={onClose}>
              Dismiss
            </Button>
          ) : (
            <span className="text-[11px] text-zinc-400 italic">Processing cryptographic instruction...</span>
          )}
        </div>
      </div>
    </div>
  );
}
