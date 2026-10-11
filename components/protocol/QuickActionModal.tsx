'use client';

import React, { useState, useEffect } from 'react';
import { AgreementAccount, MilestoneAccount, MilestoneState, AgreementState } from '@/types/protocol';
import { formatUsdc, truncateAddress, getExplorerUrl, DEVNET_USDC_MINT } from '@/lib/solana';
import { SlideDrawer } from '@/components/ui/SlideDrawer';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { useWallet } from '@/components/web3/WalletContext';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
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
import { hashEvidencePayload, uint8ArrayToHex, hexToUint8Array } from '@/lib/protocol/hashing';
import { updateOffchainMilestoneEvidence, updateOffchainMilestoneRejection } from '@/lib/protocol/metadataStore';
import {
  ShieldCheck,
  Coins,
  Check,
  Lock,
  UploadCloud,
  FileCheck,
  AlertCircle,
  Copy,
  ExternalLink,
  XCircle,
} from 'lucide-react';

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
    fn: () => Promise<{ signature: string }>
  ) => Promise<any>;
  onSwitchAction?: (actionType: QuickActionType, milestone?: MilestoneAccount) => void;
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

  // Clean evidence state with zero hardcoded default strings
  const [metadataUri, setMetadataUri] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [deliverableLink, setDeliverableLink] = useState('');
  const [computedEvidenceHash, setComputedEvidenceHash] = useState('');
  const [evidenceBytes, setEvidenceBytes] = useState<number[]>([]);

  // Verification & Rejection state
  const [checkedCriteria, setCheckedCriteria] = useState<Record<number, boolean>>({});
  const [verificationNotes, setVerificationNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Processing & copy state
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // Dynamically compute evidence hash whenever inputs change
  useEffect(() => {
    let active = true;

    async function calculateHash() {
      try {
        if (metadataUri.trim() || evidenceNotes.trim() || deliverableLink.trim()) {
          const links = deliverableLink.trim() ? [deliverableLink.trim()] : [];
          const hashU8 = await hashEvidencePayload({
            metadataUri: metadataUri.trim(),
            notes: evidenceNotes.trim(),
            deliverableLinks: links,
          });
          if (active) {
            setComputedEvidenceHash(uint8ArrayToHex(hashU8));
            setEvidenceBytes(Array.from(hashU8));
          }
        } else {
          // Fallback: recipe hash if inputs are blank
          const recipe = await prepareAccountVerificationRecipe();
          if (active) {
            setComputedEvidenceHash(recipe.evidenceHashHex);
            setEvidenceBytes(recipe.evidenceHashBytes);
          }
        }
      } catch {
        // ignore
      }
    }

    calculateHash();
    return () => {
      active = false;
    };
  }, [metadataUri, evidenceNotes, deliverableLink]);

  // 1. WORKER ACCEPTS AGREEMENT
  const handleAcceptAgreement = async () => {
    if (!publicKey) return;
    setIsProcessing(true);
    try {
      await onExecute(
        'acceptAgreement',
        `Assigned worker accepting Agreement ${truncateAddress(agreement.publicKey, 4)} on-chain`,
        async () => {
          const sig = await executeOnChainAcceptAgreement(
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

  // 2. SPONSOR FUNDS ESCROW
  const handleFundEscrow = async () => {
    if (!publicKey) return;
    setIsProcessing(true);
    try {
      await onExecute(
        'fundAgreement',
        `Funding ${formatUsdc(agreement.totalAmountUsdc)} Devnet USDC into Non-Custodial Escrow PDA`,
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
    if (!publicKey || !milestone) return;
    setIsProcessing(true);
    try {
      let hashBytesToSubmit: Uint8Array;
      if (evidenceBytes.length === 32) {
        hashBytesToSubmit = new Uint8Array(evidenceBytes);
      } else {
        const recipe = await prepareAccountVerificationRecipe();
        hashBytesToSubmit = new Uint8Array(recipe.evidenceHashBytes);
      }

      await onExecute(
        'submitEvidence',
        `Submitting 32-byte verified evidence hash to Milestone #${milestone.index + 1}`,
        async () => {
          const sig = await executeOnChainSubmitEvidence(
            publicKey,
            new PublicKey(agreement.publicKey),
            new PublicKey(milestone.publicKey),
            hashBytesToSubmit,
            { signTransaction }
          );

          // Save offchain references
          updateOffchainMilestoneEvidence(agreement.publicKey, milestone.index, {
            notes: evidenceNotes.trim() || 'Evidence submitted to Solana Devnet',
            links: deliverableLink.trim() ? [deliverableLink.trim()] : [],
            metadataUri: metadataUri.trim() || undefined,
          });

          await refreshBalances();
          return { signature: sig };
        }
      );
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. VERIFIER ATTESTS / VERIFIES
  const handleVerifyEvidence = async () => {
    if (!publicKey || !milestone) return;
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
          await refreshBalances();
          return { signature: sig };
        }
      );
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. VERIFIER REJECTS
  const handleRejectEvidence = async () => {
    if (!publicKey || !milestone) return;
    setIsProcessing(true);
    try {
      const reasonHash = await hashEvidencePayload({
        metadataUri: '',
        notes: rejectionReason.trim() || 'Evidence rejected by designated verifier',
        deliverableLinks: [],
      });

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

          updateOffchainMilestoneRejection(
            agreement.publicKey,
            milestone.index,
            rejectionReason.trim() || 'Rejected by verifier'
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

  // 6. RELEASE FUNDS
  const handleRelease = async () => {
    if (!publicKey || !milestone) return;
    setIsProcessing(true);
    try {
      await onExecute(
        'releaseMilestone',
        `Releasing ${formatUsdc(milestone.amountUsdc)} USDC to worker token account on Devnet`,
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
          ? 'Submits canonical 32-byte evidence commitment to Solana Devnet'
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
                <span className="text-neutral-400">SPONSOR:</span>
                <span className="font-mono text-neutral-200">{truncateAddress(agreement.sponsor, 6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">MILESTONES COUNT:</span>
                <span className="font-bold text-white">{agreement.milestoneCount}</span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400">
              By accepting, you confirm the milestone allocations add up to 100% of the agreement total.
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
                <span className="text-neutral-400">ESCROW TOKEN ACCOUNT (PDA):</span>
                <span className="font-mono text-neutral-300 text-[11px]">
                  {truncateAddress(agreement.vaultPda, 6)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-neutral-950 border border-[#26262a] rounded-xl text-[11px] text-neutral-400">
              Funding executes an on-chain transfer of Devnet USDC from your token account to the program-derived escrow PDA vault.
            </div>

            <div className="pt-3 border-t border-[#26262a] flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleFundEscrow}
                disabled={isProcessing}
                isLoading={isProcessing}
                className="bg-emerald-600 hover:bg-emerald-500 font-bold"
              >
                <Lock className="w-3.5 h-3.5 mr-1" /> Deposit & Fund Escrow
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: SUBMIT EVIDENCE */}
        {actionType === 'submit_evidence' && milestone && (
          <div className="space-y-4">
            <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl text-[11px] flex items-center justify-between">
              <div>
                <span className="text-neutral-400 block text-[10px]">TARGET MILESTONE:</span>
                <span className="font-bold text-white">
                  #{milestone.index + 1}: {milestone.title}
                </span>
              </div>
              <span className="text-emerald-400 font-bold">
                ${formatUsdc(milestone.amountUsdc)} USDC
              </span>
            </div>

            <div className="space-y-3">
              <Input
                label="DELIVERABLE REPOSITORY / EXPLORER LINK"
                value={deliverableLink}
                onChange={(e) => setDeliverableLink(e.target.value)}
                placeholder="https://github.com/... or explorer link"
              />

              <Input
                label="METADATA / ARTIFACT URI"
                value={metadataUri}
                onChange={(e) => setMetadataUri(e.target.value)}
                placeholder="https://explorer.solana.com/address/... or permanent URI"
              />

              <Textarea
                label="SUBMISSION NOTES"
                rows={2}
                value={evidenceNotes}
                onChange={(e) => setEvidenceNotes(e.target.value)}
                placeholder="Describe execution, test proof, and artifact deliverables..."
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
                disabled={isProcessing}
                isLoading={isProcessing}
                className="bg-violet-600 hover:bg-violet-500 font-bold"
              >
                <UploadCloud className="w-3.5 h-3.5 mr-1" /> Submit Evidence On-Chain
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: VERIFIER AUDIT */}
        {actionType === 'verify' && milestone && (
          <div className="space-y-4">
            <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl text-[11px] flex items-center justify-between">
              <div>
                <span className="text-neutral-400 block text-[10px]">REVIEWING MILESTONE:</span>
                <span className="font-bold text-white">
                  #{milestone.index + 1}: {milestone.title}
                </span>
              </div>
              <span className="text-emerald-400 font-bold">
                ${formatUsdc(milestone.amountUsdc)} USDC
              </span>
            </div>

            {milestone.dodCriteria.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-300 font-semibold text-[11px]">
                    CHECKLIST AUDIT:
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
                    Check All ({milestone.dodCriteria.length})
                  </button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {milestone.dodCriteria.map((crit, idx) => (
                    <div
                      key={idx}
                      onClick={() =>
                        setCheckedCriteria((prev) => ({
                          ...prev,
                          [idx]: !prev[idx],
                        }))
                      }
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between select-none ${
                        checkedCriteria[idx]
                          ? 'bg-[#000000] border-violet-500/60 text-neutral-100 shadow-sm'
                          : 'bg-[#000000] border-[#26262a] text-neutral-400'
                      }`}
                    >
                      <span className="text-[11px] pr-2">
                        {idx + 1}. {crit}
                      </span>
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          checkedCriteria[idx]
                            ? 'bg-violet-600 border-violet-500 text-white'
                            : 'border-[#26262a]'
                        }`}
                      >
                        {checkedCriteria[idx] && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Textarea
              label="VERIFICATION SIGN-OFF NOTES"
              rows={2}
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              placeholder="Sign-off notes for on-chain verification..."
            />

            <div className="pt-3 border-t border-[#26262a] flex justify-between items-center">
              <button
                type="button"
                onClick={() => onSwitchAction?.('reject')}
                className="text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject Submission...
              </button>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleVerifyEvidence}
                  disabled={isProcessing}
                  isLoading={isProcessing}
                  className="bg-violet-600 hover:bg-violet-500 font-bold"
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Attest & Sign On-Chain
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5b: REJECT EVIDENCE */}
        {actionType === 'reject' && milestone && (
          <div className="space-y-4">
            <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-1">
              <span className="text-rose-400 font-bold text-xs">Reject Milestone Evidence</span>
              <p className="text-[11px] text-neutral-400">
                Returns the milestone to pending state and records a 32-byte cryptographic reason hash on Solana Devnet.
              </p>
            </div>

            <Textarea
              label="REJECTION REASON (HASHED ON-CHAIN)"
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why evidence does not satisfy the Definition of Done..."
              required
            />

            <div className="pt-3 border-t border-[#26262a] flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRejectEvidence}
                disabled={isProcessing}
                isLoading={isProcessing}
                className="bg-rose-600 hover:bg-rose-500 font-bold text-white"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" /> Confirm On-Chain Rejection
              </Button>
            </div>
          </div>
        )}

        {/* STEP 6: DISBURSE / RELEASE */}
        {actionType === 'release' && milestone && (
          <div className="space-y-4">
            <div className="p-4 bg-[#000000] border border-[#26262a] rounded-xl space-y-3">
              <div className="flex justify-between">
                <span className="text-neutral-400">MILESTONE TO RELEASE:</span>
                <span className="font-bold text-white">
                  #{milestone.index + 1}: {milestone.title}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">PAYOUT VALUE:</span>
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
                Execute Mutual Cancellation & Refund
              </Button>
            </div>
          </div>
        )}

        {/* INSPECT ON-CHAIN STATE */}
        {actionType === 'inspect' && (
          <div className="space-y-3">
            <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl space-y-2">
              <div className="text-neutral-400 text-[10px] uppercase font-bold">Agreement Account PDA</div>
              <div className="font-mono text-violet-300 text-[11px] break-all select-all">
                {agreement.publicKey}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 bg-[#000000] border border-[#26262a] rounded-lg">
                <span className="text-neutral-500 block text-[10px]">SPONSOR</span>
                <span className="font-mono text-white truncate block">{truncateAddress(agreement.sponsor, 6)}</span>
              </div>
              <div className="p-2.5 bg-[#000000] border border-[#26262a] rounded-lg">
                <span className="text-neutral-500 block text-[10px]">WORKER</span>
                <span className="font-mono text-white truncate block">{truncateAddress(agreement.worker, 6)}</span>
              </div>
              <div className="p-2.5 bg-[#000000] border border-[#26262a] rounded-lg">
                <span className="text-neutral-500 block text-[10px]">WORKER ACCEPTED</span>
                <span className={agreement.workerAccepted ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {agreement.workerAccepted ? 'Yes ✓' : 'Awaiting'}
                </span>
              </div>
              <div className="p-2.5 bg-[#000000] border border-[#26262a] rounded-lg">
                <span className="text-neutral-500 block text-[10px]">ESCROW PDA</span>
                <span className="font-mono text-emerald-400 truncate block">{truncateAddress(agreement.vaultPda, 6)}</span>
              </div>
            </div>

            {milestone && (
              <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl space-y-2">
                <div className="text-neutral-400 text-[10px] uppercase font-bold">
                  Milestone #{milestone.index + 1}: {milestone.title}
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-neutral-400">Allocated Amount:</span>
                  <span className="text-emerald-400 font-bold">${formatUsdc(milestone.amountUsdc)} USDC</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-neutral-400">Verifier:</span>
                  <span className="font-mono text-violet-300">{truncateAddress(milestone.verifier, 6)}</span>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-between items-center">
              <a
                href={getExplorerUrl(agreement.publicKey, 'address')}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 font-semibold"
              >
                View Agreement on Solana Explorer <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </SlideDrawer>
  );
}
