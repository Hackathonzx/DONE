'use client';

import React, { useState, useEffect } from 'react';
import { AgreementAccount, MilestoneAccount, MilestoneState, AgreementState } from '@/types/protocol';
import { formatUsdc, truncateAddress, getExplorerUrl, DEVNET_USDC_MINT } from '@/lib/solana';
import { useWallet } from '../web3/WalletContext';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { SlideDrawer } from '../ui/SlideDrawer';
import { PublicKey } from '@solana/web3.js';
import {
  executeOnChainAcceptAgreement,
  executeOnChainFundAgreement,
  executeOnChainSubmitEvidence,
  executeOnChainVerifyEvidence,
  executeOnChainRejectEvidence,
  executeOnChainReleaseMilestone,
  executeOnChainCancelAgreement,
} from '@/lib/protocol/anchorClient';
import { prepareAccountVerificationRecipe } from '@/lib/protocol/recipe';
import { updateOffchainMilestoneEvidence, updateOffchainMilestoneRejection } from '@/lib/protocol/metadataStore';
import {
  Lock,
  UploadCloud,
  ShieldCheck,
  Coins,
  ExternalLink,
  Check,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Copy,
} from 'lucide-react';
import { MilestoneStateBadge } from '../ui/Badge';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';

export type QuickActionType =
  | 'accept'
  | 'fund'
  | 'submit_evidence'
  | 'verify'
  | 'reject'
  | 'release'
  | 'cancel'
  | 'inspect';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: QuickActionType;
  agreement: AgreementAccount;
  milestone?: MilestoneAccount;
  onExecute: (
    actionName: string,
    instructionSummary: string,
    fn: () => Promise<any>
  ) => Promise<any>;
  onSwitchAction?: (type: QuickActionType, milestone?: MilestoneAccount) => void;
}

export function QuickActionModal({
  isOpen,
  onClose,
  actionType,
  agreement,
  milestone,
  onExecute,
  onSwitchAction,
}: QuickActionModalProps) {
  const { connected, publicKey, publicKeyString, signTransaction, usdcBalance, refreshBalances } = useWallet();

  // Evidence state
  const [metadataUri, setMetadataUri] = useState(
    'https://explorer.solana.com/address/82MCkYR3RkcqBcYWDDixbaoi4bWL8w5ohu7UkJTiZXYM?cluster=devnet'
  );
  const [evidenceNotes, setEvidenceNotes] = useState(
    'Program deployed, executable, and linked to valid ProgramData PDA on Solana Devnet.'
  );
  const [deliverableLink, setDeliverableLink] = useState('https://github.com/Hackathonzx/DONE/tree/smart-contract');
  const [computedEvidenceHash, setComputedEvidenceHash] = useState('');
  const [evidenceBytes, setEvidenceBytes] = useState<number[]>([]);

  // Verification & Rejection state
  const [checkedCriteria, setCheckedCriteria] = useState<Record<number, boolean>>({});
  const [verificationNotes, setVerificationNotes] = useState(
    'Audited program existence, upgradeable loader ownership, and ProgramData PDA linkage on Devnet.'
  );
  const [rejectionReason, setRejectionReason] = useState('Evidence hash did not match independent account checks.');

  // Processing & copy state
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // Compute canonical recipe evidence hash for submission
  useEffect(() => {
    let active = true;
    if (actionType === 'submit_evidence') {
      prepareAccountVerificationRecipe()
        .then((rec) => {
          if (active) {
            setComputedEvidenceHash(rec.evidenceHashHex);
            setEvidenceBytes(rec.evidenceHashBytes);
          }
        })
        .catch(console.error);
    }
    return () => {
      active = false;
    };
  }, [actionType]);

  if (!isOpen) return null;

  // 1. WORKER ACCEPTS AGREEMENT
  const handleAcceptAgreement = async () => {
    if (!publicKey) return;
    setIsProcessing(true);
    try {
      await onExecute(
        'acceptAgreement',
        `Assigned worker accepting finalized allocation of $${formatUsdc(agreement.totalAmountUsdc)} USDC on-chain`,
        async () => {
          const sig = await executeOnChainAcceptAgreement(
            publicKey,
            new PublicKey(agreement.publicKey),
            { signTransaction }
          );
          return { signature: sig };
        }
      );
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. SPONSOR FUNDS ESCROW
  const handleFund = async () => {
    if (!publicKey) return;
    setIsProcessing(true);
    try {
      await onExecute(
        'fundAgreement',
        `Transferring $${formatUsdc(agreement.totalAmountUsdc)} Devnet USDC from sponsor into Escrow Token PDA`,
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
      setIsProcessing(false);
    }
  };

  // 3. WORKER SUBMITS EVIDENCE
  const handleSubmitEvidence = async () => {
    if (!milestone || !publicKey) return;
    setIsProcessing(true);
    try {
      const rec = await prepareAccountVerificationRecipe();
      await onExecute(
        'submitEvidence',
        `Submitting 32-byte verified account-check evidence hash to Milestone #${milestone.index + 1}`,
        async () => {
          const sig = await executeOnChainSubmitEvidence(
            publicKey,
            new PublicKey(agreement.publicKey),
            new PublicKey(milestone.publicKey),
            new Uint8Array(rec.evidenceHashBytes),
            { signTransaction }
          );

          // Update offchain metadata
          updateOffchainMilestoneEvidence(agreement.publicKey, milestone.index, {
            notes: evidenceNotes,
            links: [deliverableLink],
            metadataUri,
          });

          return { signature: sig };
        }
      );
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. VERIFIER ATTESTS / APPROVES EVIDENCE
  const handleVerify = async () => {
    if (!milestone || !publicKey) return;
    setIsProcessing(true);
    try {
      await onExecute(
        'verifyEvidence',
        `Attesting account-level verification for Milestone #${milestone.index + 1} on-chain`,
        async () => {
          const sig = await executeOnChainVerifyEvidence(
            publicKey,
            new PublicKey(agreement.publicKey),
            new PublicKey(milestone.publicKey),
            { signTransaction }
          );
          return { signature: sig };
        }
      );
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. VERIFIER REJECTS EVIDENCE
  const handleReject = async () => {
    if (!milestone || !publicKey) return;
    setIsProcessing(true);
    try {
      const reasonEncoder = new TextEncoder().encode(rejectionReason);
      const hashBuf = await crypto.subtle.digest('SHA-256', reasonEncoder);
      const reasonHash = new Uint8Array(hashBuf);

      await onExecute(
        'rejectEvidence',
        `Rejecting Milestone #${milestone.index + 1} evidence with reason hash on-chain`,
        async () => {
          const sig = await executeOnChainRejectEvidence(
            publicKey,
            new PublicKey(agreement.publicKey),
            new PublicKey(milestone.publicKey),
            reasonHash,
            { signTransaction }
          );
          updateOffchainMilestoneRejection(agreement.publicKey, milestone.index, rejectionReason);
          return { signature: sig };
        }
      );
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  // 6. RELEASE FUNDS TO WORKER
  const handleRelease = async () => {
    if (!milestone || !publicKey) return;
    setIsProcessing(true);
    try {
      await onExecute(
        'releaseMilestone',
        `Releasing verified $${formatUsdc(milestone.amountUsdc)} USDC from Escrow PDA to Worker ATA`,
        async () => {
          const sig = await executeOnChainReleaseMilestone(
            publicKey,
            new PublicKey(agreement.publicKey),
            new PublicKey(milestone.publicKey),
            new PublicKey(agreement.worker),
            { signTransaction }
          );
          await refreshBalances();
          return { signature: sig };
        }
      );
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  // 7. MUTUAL CANCELLATION
  const handleCancelAgreement = async () => {
    if (!publicKey) return;
    setIsProcessing(true);
    try {
      const sponsorAta = await getAssociatedTokenAddress(
        DEVNET_USDC_MINT,
        new PublicKey(agreement.sponsor),
        false,
        TOKEN_PROGRAM_ID
      );

      await onExecute(
        'cancelAgreement',
        `Cancelling agreement and refunding remaining escrow balance to Sponsor USDC account`,
        async () => {
          const sig = await executeOnChainCancelAgreement(
            new PublicKey(agreement.sponsor),
            new PublicKey(agreement.worker),
            new PublicKey(agreement.publicKey),
            sponsorAta,
            signTransaction
          );
          await refreshBalances();
          return { signature: sig };
        }
      );
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SlideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        actionType === 'accept'
          ? 'ACCEPT AGREEMENT ALLOCATION'
          : actionType === 'fund'
          ? 'FUND ESCROW WITH DEVNET USDC'
          : actionType === 'submit_evidence'
          ? 'SUBMIT VERIFIABLE WORK EVIDENCE'
          : actionType === 'verify'
          ? 'ATTEST MILESTONE ON-CHAIN'
          : actionType === 'reject'
          ? 'REJECT MILESTONE SUBMISSION'
          : actionType === 'release'
          ? 'RELEASE VERIFIED MILESTONE'
          : actionType === 'cancel'
          ? 'MUTUAL CANCELLATION & REFUND'
          : 'INSPECT PROTOCOL STATE'
      }
      subtitle={
        actionType === 'accept'
          ? 'Assigned worker signature freezes allocations and enables escrow funding'
          : actionType === 'fund'
          ? 'Locks real Devnet USDC into program-controlled escrow account'
          : actionType === 'submit_evidence'
          ? 'Submits canonical 32-byte account-check commitment to Solana Devnet'
          : actionType === 'verify'
          ? 'Designated verifier attests the evidence against Definition of Done'
          : actionType === 'reject'
          ? 'Records reason hash on-chain and returns milestone to pending for revision'
          : actionType === 'release'
          ? 'Transfers locked USDC directly to worker token account'
          : actionType === 'cancel'
          ? 'Requires sponsor and worker signatures; refunds remaining escrow'
          : 'Live on-chain state fetched directly from Solana Devnet'
      }
    >
      <div className="space-y-4 font-mono text-xs text-neutral-200">
        {/* STEP 2: WORKER ACCEPTANCE */}
        {actionType === 'accept' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#000000] border border-[#26262a] rounded-xl space-y-3">
              <div className="flex justify-between">
                <span className="text-neutral-400">TOTAL ESCROW ALLOCATION:</span>
                <span className="font-bold text-violet-400 text-sm">
                  ${formatUsdc(agreement.totalAmountUsdc)} USDC
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">ASSIGNED WORKER:</span>
                <span className="font-mono text-neutral-200">{truncateAddress(agreement.worker, 6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">MILESTONES DEFINED:</span>
                <span className="text-white font-bold">{agreement.milestones.length} Milestones</span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400">
              By accepting, you confirm the milestone allocations add up to 100% of the agreement total.
              Milestones are frozen on-chain once accepted.
            </p>

            <div className="pt-3 border-t border-[#26262a] flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAcceptAgreement}
                disabled={isProcessing}
                isLoading={isProcessing}
                className="bg-violet-600 hover:bg-violet-500 font-bold"
              >
                <Check className="w-3.5 h-3.5 mr-1" /> Accept Agreement On-Chain
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: SPONSOR FUNDING */}
        {actionType === 'fund' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#000000] border border-[#26262a] rounded-xl space-y-3">
              <div className="flex justify-between">
                <span className="text-neutral-400">REQUIRED ESCROW DEPOSIT:</span>
                <span className="font-bold text-emerald-400 text-base">
                  ${formatUsdc(agreement.totalAmountUsdc)} USDC
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">YOUR WALLET DEVNET USDC:</span>
                <span className="font-bold text-white">
                  ${formatUsdc(usdcBalance)} USDC
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">PROGRAM ESCROW PDA:</span>
                <span className="font-mono text-violet-300">{truncateAddress(agreement.vaultPda, 6)}</span>
              </div>
            </div>

            <div className="p-3 bg-neutral-950 border border-[#26262a] rounded-xl text-[11px] text-neutral-400">
              Transfers Devnet USDC using the SPL Token Program from your associated token account into the DONE Protocol escrow vault PDA.
            </div>

            <div className="pt-3 border-t border-[#26262a] flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleFund}
                disabled={isProcessing}
                isLoading={isProcessing}
                className="bg-emerald-600 hover:bg-emerald-500 font-bold"
              >
                <Lock className="w-3.5 h-3.5 mr-1" /> Deposit & Fund Escrow
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: WORKER SUBMITS EVIDENCE */}
        {actionType === 'submit_evidence' && milestone && (
          <div className="space-y-4">
            <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl text-[11px] flex items-center justify-between">
              <div>
                <span className="text-neutral-400 block text-[10px]">TARGET MILESTONE:</span>
                <span className="font-semibold text-neutral-200">
                  #{milestone.index + 1}: {milestone.title}
                </span>
              </div>
              <span className="text-emerald-400 font-bold">
                ${formatUsdc(milestone.amountUsdc)} USDC
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                  Verified Recipe Check
                </label>
                <div className="p-2.5 bg-neutral-950 border border-violet-500/30 rounded-xl text-[11px] space-y-1">
                  <div className="text-violet-300 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Automated Program-Account Check
                  </div>
                  <div className="text-neutral-400 text-[10px]">
                    Validates existence, executable flag, and ProgramData PDA linkage on Devnet.
                  </div>
                </div>
              </div>

              <Input
                label="DELIVERABLE REPOSITORY / EXPLORER LINK"
                value={deliverableLink}
                onChange={(e) => setDeliverableLink(e.target.value)}
                placeholder="https://github.com/Hackathonzx/DONE"
              />

              <Input
                label="METADATA / ARTIFACT URI"
                value={metadataUri}
                onChange={(e) => setMetadataUri(e.target.value)}
                placeholder="https://explorer.solana.com/address/82MCk..."
              />

              <Textarea
                label="SUBMISSION NOTES"
                rows={2}
                value={evidenceNotes}
                onChange={(e) => setEvidenceNotes(e.target.value)}
              />

              {computedEvidenceHash && (
                <div className="p-2.5 bg-[#000000] border border-[#26262a] rounded-xl flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400">Canonical SHA-256 Hash:</span>
                  <span className="font-mono text-violet-300">
                    {truncateAddress(computedEvidenceHash, 6)}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#26262a] flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmitEvidence}
                disabled={isProcessing || !computedEvidenceHash}
                isLoading={isProcessing}
                className="bg-violet-600 hover:bg-violet-500 font-bold"
              >
                <UploadCloud className="w-3.5 h-3.5 mr-1" /> Submit Evidence On-Chain
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: VERIFIER APPROVAL */}
        {actionType === 'verify' && milestone && (
          <div className="space-y-4">
            <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl text-[11px] flex items-center justify-between">
              <div>
                <span className="text-neutral-400 block text-[10px]">REVIEWING MILESTONE:</span>
                <span className="font-semibold text-neutral-200">
                  #{milestone.index + 1}: {milestone.title}
                </span>
              </div>
              <span className="text-emerald-400 font-bold">
                ${formatUsdc(milestone.amountUsdc)} USDC
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-neutral-300 font-semibold text-[11px]">
                  CRITERIA AUDIT CHECKLIST:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const all: Record<number, boolean> = {};
                    milestone.dodCriteria.forEach((_, i) => {
                      all[i] = true;
                    });
                    setCheckedCriteria(all);
                  }}
                  className="text-[10px] text-violet-300 bg-[#000000] hover:bg-violet-900/40 px-2 py-0.5 rounded-lg border border-violet-500/30 font-bold"
                >
                  ⚡ Check All
                </button>
              </div>

              {milestone.dodCriteria.map((crit, idx) => (
                <div
                  key={idx}
                  onClick={() =>
                    setCheckedCriteria((prev) => ({ ...prev, [idx]: !prev[idx] }))
                  }
                  className={`p-2.5 border rounded-xl cursor-pointer flex items-center gap-2.5 transition-all ${
                    checkedCriteria[idx]
                      ? 'bg-[#000000] border-violet-500/60 text-neutral-100 shadow-sm'
                      : 'bg-[#000000] border-[#26262a] text-neutral-400 hover:border-[#383840]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      checkedCriteria[idx]
                        ? 'bg-violet-600 text-white'
                        : 'border border-[#26262a]'
                    }`}
                  >
                    {checkedCriteria[idx] && '✓'}
                  </div>
                  <span className="text-xs">{crit}</span>
                </div>
              ))}
            </div>

            <Textarea
              label="VERIFICATION SIGN-OFF NOTES"
              rows={2}
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
            />

            <div className="pt-3 border-t border-[#26262a] flex items-center justify-between">
              {onSwitchAction && (
                <button
                  type="button"
                  onClick={() => onSwitchAction('reject', milestone)}
                  className="text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject Submission...
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleVerify}
                  disabled={isProcessing || !milestone.dodCriteria.every((_, i) => checkedCriteria[i])}
                  isLoading={isProcessing}
                  className="bg-emerald-600 hover:bg-emerald-500 font-bold"
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Attest & Sign On-Chain
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5b: REJECT SUBMISSION */}
        {actionType === 'reject' && milestone && (
          <div className="space-y-4">
            <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                <AlertCircle className="w-4 h-4" /> Reject Milestone Evidence
              </div>
              <p className="text-[11px] text-neutral-400">
                On-chain rejection clears the current evidence submission and resets the milestone status back to Pending, allowing the worker to revise deliverables.
              </p>
            </div>

            <Textarea
              label="REJECTION REASON (COMMITTED AS SHA-256 HASH ON-CHAIN)"
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. ProgramData account mismatch with declared target."
            />

            <div className="pt-3 border-t border-[#26262a] flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
                isLoading={isProcessing}
                className="bg-rose-600 hover:bg-rose-500 font-bold text-white"
              >
                Sign Rejection On-Chain
              </Button>
            </div>
          </div>
        )}

        {/* STEP 6: RELEASE MILESTONE FUNDS */}
        {actionType === 'release' && milestone && (
          <div className="space-y-4">
            <div className="p-4 bg-[#000000] border border-[#26262a] rounded-xl space-y-2.5">
              <div className="flex justify-between">
                <span className="text-neutral-400">DISBURSAL AMOUNT:</span>
                <span className="font-bold text-emerald-400 text-base">
                  ${formatUsdc(milestone.amountUsdc)} USDC
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">BENEFICIARY WORKER:</span>
                <span className="font-mono text-neutral-300">{truncateAddress(agreement.worker, 6)}</span>
              </div>
              <div className="flex justify-between border-t border-[#26262a] pt-2">
                <span className="text-neutral-400">STATUS:</span>
                <span className="text-emerald-400 font-bold uppercase">Attested & Verified ✓</span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400">
              The on-chain release instruction automatically transfers funds directly from the Escrow PDA into the worker&apos;s USDC token account.
            </p>

            <div className="pt-3 border-t border-[#26262a] flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRelease}
                disabled={isProcessing}
                isLoading={isProcessing}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
              >
                <Coins className="w-3.5 h-3.5 mr-1" /> Disburse ${formatUsdc(milestone.amountUsdc)} USDC
              </Button>
            </div>
          </div>
        )}

        {/* STEP 7: MUTUAL CANCELLATION */}
        {actionType === 'cancel' && (
          <div className="space-y-4">
            <div className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                <AlertCircle className="w-4 h-4" /> Mutual Escrow Cancellation
              </div>
              <p className="text-[11px] text-neutral-400">
                Requires signatures from both Sponsor and Worker in the same transaction.
                Only remaining escrow balance is refunded to the Sponsor; previously released milestone payments are not reversed.
              </p>
            </div>

            <div className="pt-3 border-t border-[#26262a] flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCancelAgreement}
                disabled={isProcessing}
                isLoading={isProcessing}
                className="bg-rose-600 hover:bg-rose-500 font-bold text-white"
              >
                Sign Cancellation Transaction
              </Button>
            </div>
          </div>
        )}

        {/* INSPECT ON-CHAIN STATE */}
        {actionType === 'inspect' && (
          <div className="space-y-4">
            <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl space-y-2">
              <div className="text-neutral-400 text-[10px] uppercase font-bold">Agreement Account PDA</div>
              <div className="font-mono text-violet-300 break-all select-all">{agreement.publicKey}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 bg-[#000000] border border-[#26262a] rounded-xl">
                <span className="text-neutral-500 block text-[10px]">SPONSOR</span>
                <span className="font-mono text-neutral-200">{truncateAddress(agreement.sponsor, 4)}</span>
              </div>
              <div className="p-2.5 bg-[#000000] border border-[#26262a] rounded-xl">
                <span className="text-neutral-500 block text-[10px]">WORKER</span>
                <span className="font-mono text-neutral-200">{truncateAddress(agreement.worker, 4)}</span>
              </div>
              <div className="p-2.5 bg-[#000000] border border-[#26262a] rounded-xl">
                <span className="text-neutral-500 block text-[10px]">WORKER ACCEPTED</span>
                <span className={agreement.workerAccepted ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                  {agreement.workerAccepted ? 'YES (Accepted)' : 'NO (Pending)'}
                </span>
              </div>
              <div className="p-2.5 bg-[#000000] border border-[#26262a] rounded-xl">
                <span className="text-neutral-500 block text-[10px]">ESCROW PDA</span>
                <span className="font-mono text-violet-300">{truncateAddress(agreement.vaultPda, 4)}</span>
              </div>
            </div>

            {milestone && (
              <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl space-y-2">
                <div className="text-neutral-400 text-[10px] uppercase font-bold">
                  Milestone #{milestone.index + 1}: {milestone.title}
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span>Status:</span>
                  <MilestoneStateBadge state={milestone.state} />
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span>Verifier:</span>
                  <span className="font-mono text-neutral-300">{truncateAddress(milestone.verifier, 6)}</span>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <a
                href={getExplorerUrl(agreement.publicKey, 'address')}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 font-semibold"
              >
                View on Solana Explorer <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}
      </div>
    </SlideDrawer>
  );
}
