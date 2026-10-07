'use client';

import React, { useState } from 'react';
import { AgreementAccount } from '@/types/protocol';
import { formatUsdc, truncateAddress } from '@/lib/solana';
import { protocolClient } from '@/lib/protocol/client';
import { useWallet } from '../web3/WalletContext';
import { Button } from '../ui/Button';
import { PublicKey } from '@solana/web3.js';
import { Lock, AlertCircle, Droplets, ArrowRight } from 'lucide-react';

interface FundingModalProps {
  agreement: AgreementAccount;
  isOpen: boolean;
  onClose: () => void;
  onExecute: (
    actionName: string,
    instructionSummary: string,
    fn: () => Promise<{ signature: string; vaultPda: PublicKey }>
  ) => Promise<any>;
}

export function FundingModal({ agreement, isOpen, onClose, onExecute }: FundingModalProps) {
  const { usdcBalance, requestDevnetUsdcFaucet } = useWallet();
  const [funding, setFunding] = useState(false);

  if (!isOpen) return null;

  const totalRequired = agreement.totalAmountUsdc;
  const hasSufficientUsdc = usdcBalance >= totalRequired;

  const handleFund = async () => {
    setFunding(true);
    try {
      await onExecute(
        'fundAgreement',
        `Locking ${formatUsdc(totalRequired)} USDC into Vault PDA (${truncateAddress(agreement.vaultPda, 4)})`,
        async () => {
          return protocolClient.fundAgreement({
            agreement: new PublicKey(agreement.publicKey),
            amount: totalRequired,
          });
        }
      );
      onClose();
    } finally {
      setFunding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 shadow-2xl p-6 font-mono text-xs sm:text-sm text-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-zinc-100 uppercase tracking-wider text-xs">
              FUND PROTOCOL ESCROW VAULT
            </span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <p className="text-xs text-zinc-400">
            To activate this agreement and enable work milestones, transfer the agreed budget from your wallet ATA into the deterministic Escrow Vault PDA.
          </p>

          <div className="p-4 bg-zinc-900 border border-zinc-800 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">AGREEMENT:</span>
              <span className="font-semibold text-zinc-200 truncate max-w-[200px]">{agreement.title}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">REQUIRED ESCROW AMOUNT:</span>
              <span className="text-base font-bold text-emerald-400">
                ${formatUsdc(totalRequired)} USDC
              </span>
            </div>
            <div className="flex justify-between items-center text-xs pt-2 border-t border-zinc-800">
              <span className="text-zinc-400">VAULT PDA:</span>
              <span className="text-cyan-400 font-mono text-[11px] truncate max-w-[200px]">
                {agreement.vaultPda}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">YOUR WALLET BALANCE:</span>
              <span className={hasSufficientUsdc ? 'text-zinc-200' : 'text-rose-400 font-semibold'}>
                ${formatUsdc(usdcBalance)} USDC
              </span>
            </div>
          </div>

          {!hasSufficientUsdc && (
            <div className="p-3 bg-amber-950/40 border border-amber-800/80 text-amber-300 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                <span className="text-xs font-semibold">Insufficient Devnet USDC</span>
              </div>
              <p className="text-[11px] text-amber-400/90">
                Your wallet balance is below the required agreement amount. Use the Devnet faucet to mint test USDC.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs text-cyan-300 border-cyan-800"
                onClick={() => requestDevnetUsdcFaucet(totalRequired)}
              >
                <Droplets className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                Airdrop +${formatUsdc(totalRequired)} Devnet USDC
              </Button>
            </div>
          )}

          {/* Rules & safety */}
          <div className="text-[11px] text-zinc-400 space-y-1">
            <p>• Vault funds are locked by Anchor Program ID {truncateAddress('DoneProt11111111111111111111111111111111111', 4)}.</p>
            <p>• Funds can ONLY be released once Definition of Done criteria are verified.</p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={funding}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleFund}
            disabled={!hasSufficientUsdc || funding}
            isLoading={funding}
          >
            Lock USDC into Escrow
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
