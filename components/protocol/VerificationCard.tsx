'use client';

import React, { useState } from 'react';
import { MilestoneAccount, MilestoneState } from '@/types/protocol';
import { formatUsdc, truncateAddress, getExplorerUrl } from '@/lib/solana';
import { useWallet } from '@/components/web3/WalletContext';
import { PublicKey } from '@solana/web3.js';
import {
  executeOnChainVerifyEvidence,
  executeOnChainReleaseMilestone,
} from '@/lib/protocol/anchorClient';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import {
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  Coins,
  Lock,
  ExternalLink,
} from 'lucide-react';

interface VerificationCardProps {
  agreementKey: string;
  milestone: MilestoneAccount;
  workerAddress: string;
  onExecute: (
    actionName: string,
    instructionSummary: string,
    fn: () => Promise<{ signature: string }>
  ) => Promise<any>;
}

export function VerificationCard({
  agreementKey,
  milestone,
  workerAddress,
  onExecute,
}: VerificationCardProps) {
  const { publicKey, signTransaction, refreshBalances } = useWallet();
  const [checkedCriteria, setCheckedCriteria] = useState<Record<number, boolean>>({});
  const [verificationNotes, setVerificationNotes] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  const toggleCriteria = (index: number) => {
    setCheckedCriteria((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const allCriteriaChecked =
    milestone.dodCriteria.length === 0 ||
    milestone.dodCriteria.every((_, idx) => checkedCriteria[idx]);

  const handleVerify = async () => {
    if (!publicKey) return;
    setIsVerifying(true);
    try {
      await onExecute(
        'verifyEvidence',
        `Attesting on-chain verification for Milestone #${milestone.index + 1}`,
        async () => {
          const sig = await executeOnChainVerifyEvidence(
            publicKey,
            new PublicKey(agreementKey),
            new PublicKey(milestone.publicKey),
            { signTransaction }
          );
          await refreshBalances();
          return { signature: sig };
        }
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRelease = async () => {
    if (!publicKey) return;
    setIsReleasing(true);
    try {
      await onExecute(
        'releaseMilestone',
        `Releasing ${formatUsdc(milestone.amountUsdc)} USDC to worker token account on Devnet`,
        async () => {
          const sig = await executeOnChainReleaseMilestone(
            publicKey,
            new PublicKey(agreementKey),
            new PublicKey(milestone.publicKey),
            new PublicKey(workerAddress),
            { signTransaction }
          );
          await refreshBalances();
          return { signature: sig };
        }
      );
    } finally {
      setIsReleasing(false);
    }
  };

  if (milestone.state === MilestoneState.RELEASED) {
    return (
      <Card className="border-emerald-500/40 bg-emerald-950/10 font-mono">
        <CardHeader>
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <h3 className="font-bold text-xs tracking-wider uppercase">
              MILESTONE SETTLED & PAID
            </h3>
          </div>
          <span className="text-[11px] text-emerald-300 font-bold">100% COMPLETE</span>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-neutral-400">
            Funds for this milestone have been disbursed from the protocol escrow vault directly to the assigned worker token account on Solana Devnet.
          </p>
          <div className="p-4 bg-[#000000] border border-[#26262a] rounded-xl space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">RELEASED VALUE:</span>
              <span className="text-base font-bold text-emerald-400">
                ${formatUsdc(milestone.amountUsdc)} USDC
              </span>
            </div>
            {milestone.settlementTx && (
              <div className="flex justify-between items-center pt-2 border-t border-[#26262a]">
                <span className="text-neutral-400">SOLANA TX SIGNATURE:</span>
                <a
                  href={getExplorerUrl(milestone.settlementTx, 'tx')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:text-violet-300 font-mono inline-flex items-center gap-1 underline text-[11px]"
                >
                  {truncateAddress(milestone.settlementTx, 10)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (milestone.state === MilestoneState.VERIFIED) {
    return (
      <Card className="border-violet-500/30 font-mono">
        <CardHeader>
          <div className="flex items-center gap-2 text-violet-400">
            <ShieldCheck className="w-4 h-4" />
            <h3 className="font-bold text-xs tracking-wider uppercase">
              DoD CRITERIA VERIFIED — SETTLEMENT UNLOCKED
            </h3>
          </div>
          <span className="text-[11px] text-violet-300 font-bold">READY FOR DISBURSAL</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-neutral-400">
            Definition of Done criteria have been verified on-chain. Escrow is unlocked for settlement release to the worker&apos;s USDC token account.
          </p>
          <div className="p-4 bg-[#000000] border border-[#26262a] rounded-xl space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">CLAIMABLE VALUE:</span>
              <span className="text-base font-bold text-emerald-400">
                ${formatUsdc(milestone.amountUsdc)} USDC
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">VERIFIED BY:</span>
              <span className="text-neutral-300 font-mono text-[11px]">
                {truncateAddress(milestone.verifier, 8)}
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <span className="text-[11px] text-neutral-500">
            Escrow ready to transfer USDC to Worker ATA
          </span>
          <Button
            variant="primary"
            size="md"
            onClick={handleRelease}
            disabled={isReleasing}
            isLoading={isReleasing}
            className="bg-emerald-600 hover:bg-emerald-500 font-bold text-white"
          >
            <Coins className="w-4 h-4 mr-2" />
            Release Payment (${formatUsdc(milestone.amountUsdc)} USDC)
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (milestone.state === MilestoneState.EVIDENCE_SUBMITTED) {
    return (
      <Card className="border-amber-500/30 font-mono">
        <CardHeader>
          <div className="flex items-center gap-2 text-amber-400">
            <FileCheck className="w-4 h-4" />
            <h3 className="font-bold text-xs tracking-wider uppercase">
              VERIFICATION AUDIT IN PROGRESS
            </h3>
          </div>
          <span className="text-[11px] text-amber-300 font-bold">ACTION REQUIRED</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-neutral-400">
            As the designated verifier ({truncateAddress(milestone.verifier, 6)}), check off each Definition of Done item against the submitted artifacts before confirming block verification.
          </p>

          {milestone.dodCriteria.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300 tracking-wider uppercase block">
                  CANONICAL CRITERIA AUDIT CHECKLIST:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const all: Record<number, boolean> = {};
                    milestone.dodCriteria.forEach((_, i) => {
                      all[i] = true;
                    });
                    setCheckedCriteria(all);
                  }}
                  className="text-[10px] text-violet-300 bg-[#000000] px-2.5 py-1 rounded-lg border border-violet-500/30"
                >
                  ⚡ Check All Criteria
                </button>
              </div>

              <div className="space-y-2">
                {milestone.dodCriteria.map((c, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleCriteria(idx)}
                    className={`p-3 border rounded-xl cursor-pointer select-none transition-colors flex items-start gap-2.5 ${
                      checkedCriteria[idx]
                        ? 'bg-[#000000] border-emerald-500/50 text-neutral-100'
                        : 'bg-[#000000] border-[#26262a] text-neutral-400'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center flex-shrink-0 ${
                        checkedCriteria[idx]
                          ? 'bg-emerald-500 border-emerald-500 text-black'
                          : 'border-[#26262a]'
                      }`}
                    >
                      {checkedCriteria[idx] && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                    </div>
                    <span className="text-xs leading-relaxed">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Textarea
            label="VERIFICATION AUDIT SIGN-OFF NOTES"
            rows={2}
            value={verificationNotes}
            onChange={(e) => setVerificationNotes(e.target.value)}
            placeholder="Attestation audit sign-off notes..."
            required
          />
        </CardContent>
        <CardFooter className="justify-between">
          <span className="text-[11px] text-neutral-500">
            {allCriteriaChecked
              ? 'All criteria checked ✓'
              : `Check all ${milestone.dodCriteria.length} items to confirm`}
          </span>
          <Button
            variant="primary"
            size="md"
            onClick={handleVerify}
            disabled={!allCriteriaChecked || isVerifying}
            isLoading={isVerifying}
            className="bg-violet-600 hover:bg-violet-500 font-bold"
          >
            <ShieldCheck className="w-4 h-4 mr-2" />
            Sign & Verify Milestone on Chain
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="font-mono">
      <CardHeader>
        <div className="flex items-center gap-2 text-neutral-400">
          <Lock className="w-4 h-4" />
          <h3 className="font-bold text-xs tracking-wider uppercase text-neutral-300">
            VERIFICATION PIPELINE LOCKED
          </h3>
        </div>
        <span className="text-[11px] text-neutral-500">AWAITING EVIDENCE</span>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-neutral-400 leading-relaxed">
          The Definition of Done has been committed on-chain with hash{' '}
          <span className="text-violet-400 font-mono">{truncateAddress(milestone.dodHash, 8)}</span>.
          Work is currently in flight. Once the worker submits proof artifacts, the verification audit step will unlock.
        </p>
      </CardContent>
    </Card>
  );
}
