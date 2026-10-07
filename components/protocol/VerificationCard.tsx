'use client';

import React, { useState } from 'react';
import { MilestoneAccount, MilestoneState, VerificationType } from '@/types/protocol';
import { truncateAddress, formatUsdc, getExplorerUrl } from '@/lib/solana';
import { protocolClient } from '@/lib/protocol/client';
import { PublicKey } from '@solana/web3.js';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Input';
import { Card, CardHeader, CardContent, CardFooter } from '../ui/Card';
import {
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Coins,
  FileCheck,
  Lock,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

interface VerificationCardProps {
  agreementKey: string;
  milestone: MilestoneAccount;
  isVerifierOrSponsor: boolean;
  onExecute: (
    actionName: string,
    instructionSummary: string,
    fn: () => Promise<any>
  ) => Promise<any>;
}

export function VerificationCard({
  agreementKey,
  milestone,
  isVerifierOrSponsor,
  onExecute,
}: VerificationCardProps) {
  const [checkedCriteria, setCheckedCriteria] = useState<Record<number, boolean>>({});
  const [verificationNotes, setVerificationNotes] = useState(
    'Reviewed evidence artifacts and verified all canonical Definition of Done criteria are satisfied.'
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  const toggleCriteria = (index: number) => {
    setCheckedCriteria((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const allCriteriaChecked =
    milestone.dodCriteria.length > 0 &&
    milestone.dodCriteria.every((_, idx) => checkedCriteria[idx]);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      await onExecute(
        'verifyMilestone',
        `Verifying Milestone #${milestone.index} DoD criteria fulfillment`,
        async () => {
          return protocolClient.verifyMilestone({
            agreement: new PublicKey(agreementKey),
            milestoneIndex: milestone.index,
            notes: verificationNotes,
          });
        }
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRelease = async () => {
    setIsReleasing(true);
    try {
      await onExecute(
        'releasePayment',
        `Releasing ${formatUsdc(milestone.amountUsdc)} USDC from Escrow Vault to Worker ATA`,
        async () => {
          return protocolClient.releasePayment({
            agreement: new PublicKey(agreementKey),
            milestoneIndex: milestone.index,
          });
        }
      );
    } finally {
      setIsReleasing(false);
    }
  };

  // 1. If released, show terminal settlement card
  if (milestone.state === MilestoneState.RELEASED) {
    return (
      <Card className="border-emerald-800 bg-zinc-950 font-mono">
        <CardHeader className="bg-emerald-950/40 border-emerald-900/60">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <h3 className="font-bold text-sm tracking-wider uppercase">
              MILESTONE SETTLED & FUNDS RELEASED
            </h3>
          </div>
          <span className="text-[11px] text-emerald-300 font-bold">TERMINAL STATE</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-zinc-900 border border-zinc-800 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">SETTLED VALUE:</span>
              <span className="text-base font-bold text-emerald-400">
                ${formatUsdc(milestone.amountUsdc)} USDC
              </span>
            </div>
            {milestone.settlementTx && (
              <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                <span className="text-zinc-400">SOLANA TX SIGNATURE:</span>
                <a
                  href={getExplorerUrl(milestone.settlementTx, 'tx')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 font-mono inline-flex items-center gap-1 underline text-[11px]"
                >
                  {truncateAddress(milestone.settlementTx, 10)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            {milestone.releasedAt && (
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-400">TIMESTAMP:</span>
                <span className="text-zinc-300">
                  {new Date(milestone.releasedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 2. If verified, show settlement release trigger
  if (milestone.state === MilestoneState.VERIFIED) {
    return (
      <Card className="border-cyan-800 bg-zinc-950 font-mono">
        <CardHeader className="bg-cyan-950/40 border-cyan-900/60">
          <div className="flex items-center gap-2 text-cyan-400">
            <ShieldCheck className="w-4 h-4" />
            <h3 className="font-bold text-sm tracking-wider uppercase">
              DoD CRITERIA VERIFIED — SETTLEMENT UNLOCKED
            </h3>
          </div>
          <span className="text-[11px] text-cyan-300 font-bold">READY FOR DISBURSAL</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-zinc-300">
            Definition of Done criteria have been cryptographically verified by the authorized party. The protocol escrow vault is now unlocked for settlement release to the worker’s USDC token account.
          </p>

          <div className="p-3 bg-zinc-900 border border-zinc-800 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">CLAIMABLE VALUE:</span>
              <span className="text-base font-bold text-emerald-400">
                ${formatUsdc(milestone.amountUsdc)} USDC
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">VERIFIED BY:</span>
              <span className="text-zinc-300 font-mono text-[11px]">
                {truncateAddress(milestone.verification?.verifiedBy, 8)}
              </span>
            </div>
            {milestone.verification?.notes && (
              <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-400">
                <span className="font-semibold text-zinc-300 block mb-0.5">VERIFIER NOTES:</span>
                {milestone.verification.notes}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <span className="text-[11px] text-zinc-400">
            Any participant or sponsor may trigger deterministic release
          </span>
          <Button
            variant="primary"
            size="md"
            onClick={handleRelease}
            disabled={isReleasing}
            isLoading={isReleasing}
          >
            <Coins className="w-4 h-4 mr-1 text-black" />
            Release Payment (${formatUsdc(milestone.amountUsdc)} USDC)
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // 3. If evidence is submitted, show verification audit view
  if (milestone.state === MilestoneState.EVIDENCE_SUBMITTED) {
    return (
      <Card className="border-amber-900/60 bg-zinc-950 font-mono">
        <CardHeader className="bg-amber-950/40 border-amber-900/60">
          <div className="flex items-center gap-2 text-amber-400">
            <FileCheck className="w-4 h-4" />
            <h3 className="font-bold text-sm tracking-wider uppercase">
              VERIFICATION AUDIT IN PROGRESS
            </h3>
          </div>
          <span className="text-[11px] text-amber-300 font-bold">ACTION REQUIRED</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-zinc-400">
            As the designated verifier ({truncateAddress(milestone.verifier, 6)}), check off each Definition of Done item against the submitted artifacts before confirming block verification.
          </p>

          {/* Criteria Checklist */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300 tracking-wider uppercase block">
              CANONICAL CRITERIA AUDIT CHECKLIST:
            </label>
            <div className="space-y-2">
              {milestone.dodCriteria.map((c, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleCriteria(idx)}
                  className={`p-2.5 border cursor-pointer select-none transition-colors flex items-start gap-2.5 ${
                    checkedCriteria[idx]
                      ? 'bg-zinc-900 border-cyan-500/80 text-zinc-100'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-none mt-0.5 border flex items-center justify-center flex-shrink-0 ${
                      checkedCriteria[idx]
                        ? 'bg-cyan-500 border-cyan-400 text-black'
                        : 'border-zinc-700 bg-zinc-900'
                    }`}
                  >
                    {checkedCriteria[idx] && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                  </div>
                  <span className="text-xs leading-relaxed">{c}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Verifier Notes */}
          <Textarea
            label="VERIFICATION AUDIT SIGN-OFF NOTES"
            rows={2}
            value={verificationNotes}
            onChange={(e) => setVerificationNotes(e.target.value)}
            required
          />
        </CardContent>

        <CardFooter className="justify-between">
          <span className="text-[11px] text-zinc-400">
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
          >
            <ShieldCheck className="w-4 h-4 mr-1 text-black" />
            Sign & Verify Milestone on Solana
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // 4. Milestone is PENDING (Work in progress)
  return (
    <Card className="border-zinc-800 bg-zinc-950 font-mono">
      <CardHeader className="bg-zinc-900/60">
        <div className="flex items-center gap-2 text-zinc-400">
          <Lock className="w-4 h-4 text-zinc-500" />
          <h3 className="font-bold text-sm tracking-wider uppercase text-zinc-300">
            VERIFICATION PIPELINE LOCKED
          </h3>
        </div>
        <span className="text-[11px] text-zinc-400">AWAITING EVIDENCE</span>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-zinc-400 leading-relaxed">
          The Definition of Done has been committed on-chain with hash{' '}
          <span className="text-cyan-400 font-mono">{truncateAddress(milestone.dodHash, 8)}</span>.
          Work is currently in flight. Once the worker submits proof artifacts, the verification audit step will unlock.
        </p>
      </CardContent>
    </Card>
  );
}
