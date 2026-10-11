'use client';

import React, { useState } from 'react';
import { AgreementAccount } from '@/types/protocol';
import { formatUsdc, truncateAddress, DONE_PROGRAM_ID } from '@/lib/solana';
import { useWallet } from '../web3/WalletContext';
import { Button } from '../ui/Button';
import { SlideDrawer } from '../ui/SlideDrawer';
import { PublicKey } from '@solana/web3.js';
import { Lock, ArrowRight } from 'lucide-react';
import { executeOnChainFundAgreement } from '@/lib/protocol/anchorClient';

interface FundingModalProps {
  agreement: AgreementAccount;
  isOpen: boolean;
  onClose: () => void;
  onExecute: (
    actionName: string,
    instructionSummary: string,
    fn: () => Promise<{ signature: string }>
  ) => Promise<any>;
}

export function FundingModal({ agreement, isOpen, onClose, onExecute }: FundingModalProps) {
  const { publicKey, signTransaction, usdcBalance, refreshBalances } = useWallet();
  const [funding, setFunding] = useState(false);

  if (!isOpen) return null;

  const totalRequired = agreement.totalAmountUsdc;
  const hasSufficientUsdc = usdcBalance >= totalRequired;

  const handleFund = async () => {
    if (!publicKey) return;
    setFunding(true);
    try {
      await onExecute(
        'fundAgreement',
        `Transferring $${formatUsdc(totalRequired)} USDC into Vault PDA (${truncateAddress(agreement.vaultPda, 4)})`,
        async () => {
          const sig = await executeOnChainFundAgreement(
            publicKey,
            new PublicKey(agreement.publicKey),
            { signTransaction }
          );
          await refreshBalances();
          return { signature: sig };
        }
      );
      onClose();
    } finally {
      setFunding(false);
    }
  };

  return (
    <SlideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Fund Protocol Escrow Vault"
      subtitle={agreement.title}
    >
      <div className="space-y-4 font-mono text-xs">
        <p className="text-neutral-400">
          Transfer the agreed budget from your wallet ATA into the deterministic Escrow Vault PDA to activate this agreement.
        </p>

        <div className="p-4 bg-[#000000] border border-[#26262a] rounded-xl space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-neutral-400">AGREEMENT:</span>
            <span className="font-semibold text-neutral-200 truncate max-w-[200px]">{agreement.title}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-neutral-400">REQUIRED ESCROW AMOUNT:</span>
            <span className="text-base font-bold text-emerald-400">
              ${formatUsdc(totalRequired)} USDC
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-[#26262a]">
            <span className="text-neutral-400">VAULT PDA:</span>
            <span className="text-violet-300 font-mono text-[11px] truncate max-w-[200px]">
              {agreement.vaultPda}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-neutral-400">YOUR WALLET BALANCE:</span>
            <span className={hasSufficientUsdc ? 'text-neutral-200' : 'text-red-400 font-semibold'}>
              ${formatUsdc(usdcBalance)} USDC
            </span>
          </div>
        </div>

        {!hasSufficientUsdc && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 space-y-2">
            <p className="text-[11px]">
              Your wallet balance is below the required agreement amount. Request Devnet USDC from the Circle Testnet Faucet.
            </p>
            <a
              href="https://faucet.circle.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-violet-300 underline font-semibold"
            >
              Get Devnet USDC at Circle Faucet ↗
            </a>
          </div>
        )}

        <div className="text-[11px] text-neutral-400 space-y-1">
          <p>• Vault funds are held by Anchor Program ID {truncateAddress(DONE_PROGRAM_ID.toBase58(), 4)}.</p>
          <p>• Funds can ONLY be released once Definition of Done criteria are verified.</p>
        </div>

        <div className="pt-4 border-t border-[#26262a] flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={funding}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleFund}
            disabled={!hasSufficientUsdc || funding}
            isLoading={funding}
            className="bg-emerald-600 hover:bg-emerald-500 font-bold"
          >
            Lock USDC into Escrow
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </SlideDrawer>
  );
}
