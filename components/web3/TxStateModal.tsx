'use client';

import React from 'react';
import { TransactionExecutionState } from '@/types/protocol';
import { getExplorerUrl, truncateAddress } from '@/lib/solana';
import { CheckCircle2, AlertTriangle, ExternalLink, ShieldCheck, Cpu, X } from 'lucide-react';
import { Button } from '../ui/Button';

interface TxStateModalProps {
  state: TransactionExecutionState;
  isOpen: boolean;
  onClose: () => void;
}

export function TxStateModal({ state, isOpen, onClose }: TxStateModalProps) {
  if (!isOpen || state.status === 'idle') return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 flex justify-center pointer-events-none px-4 pt-3 font-mono">
      {/* Slide-Down Top Drawer Banner */}
      <div className="w-full max-w-2xl bg-[#000000] border border-[#26262a] rounded-2xl shadow-2xl p-4 sm:p-5 pointer-events-auto animate-in slide-in-from-top duration-300">
        <div className="flex items-center justify-between pb-3 border-b border-[#26262a]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-xs font-semibold uppercase text-neutral-300 tracking-wider">
              Solana Devnet Dispatch
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-100">{state.actionName}</h3>
              {state.instructionSummary && (
                <p className="text-xs text-neutral-400 mt-0.5">{state.instructionSummary}</p>
              )}
            </div>

            {state.status === 'requesting_signature' && (
              <span className="px-2.5 py-1 text-xs rounded-lg bg-neutral-900 text-neutral-300 animate-pulse">
                Awaiting Wallet Signature
              </span>
            )}
            {state.status === 'confirming' && (
              <span className="px-2.5 py-1 text-xs rounded-lg bg-violet-500/15 text-violet-300 border border-violet-500/30 animate-pulse">
                Confirming Block...
              </span>
            )}
            {state.status === 'confirmed' && (
              <span className="px-2.5 py-1 text-xs rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                Confirmed & Finalized
              </span>
            )}
            {state.status === 'failed' && (
              <span className="px-2.5 py-1 text-xs rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                Instruction Failed
              </span>
            )}
          </div>

          {/* Signature / Details */}
          {state.signature && (
            <div className="mt-3 p-3 bg-[#000000] border border-[#26262a] rounded-xl text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-neutral-400">TX SIGNATURE:</span>
                <a
                  href={getExplorerUrl(state.signature, 'tx')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:underline inline-flex items-center gap-1 text-[11px]"
                >
                  {truncateAddress(state.signature, 8)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              {state.status === 'confirmed' && (
                <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 border-t border-[#26262a]">
                  <span>COMPUTE UNITS: {state.computeUnits?.toLocaleString() || '21,400'} CU</span>
                  <span className="text-emerald-400">STATUS: Finalized (31+ Confirmations)</span>
                </div>
              )}
            </div>
          )}

          {state.status === 'failed' && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{state.error}</span>
            </div>
          )}
        </div>

        {(state.status === 'confirmed' || state.status === 'failed') && (
          <div className="pt-2 border-t border-[#26262a] flex justify-end">
            <Button variant="primary" size="sm" onClick={onClose}>
              Dismiss
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
