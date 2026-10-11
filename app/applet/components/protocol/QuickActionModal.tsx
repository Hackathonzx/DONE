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
  createPartialCancelAgreement,
  cosignAndBroadcastCancelAgreement,
} from '@/lib/protocol/anchorClient';
import { prepareAccountVerificationRecipe } from '@/lib/protocol/recipe';
import { hashEvidencePayload, uint8ArrayToHex } from '@/lib/protocol/hashing';
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
  Users,
  ArrowRight,
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

  // Mutual Cancellation (Two-Party Signing) state
  const [pendingCancelPayload, setPendingCancelPayload] = useState<string>('');
  const [cancelInitiator, setCancelInitiator] = useState<string>('');
  const [manualPayloadInput, setManualPayloadInput] = useState<string>('');
  const [showManualPayloadInput, setShowManualPayloadInput] = useState<boolean>(false);

  // Processing & copy state
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // Load existing partial cancellation transaction if any exists in local session
  useEffect(() => {
    if (typeof window === 'undefined' || !agreement?.publicKey) return;
    try {
      const saved = localStorage.getItem(`done_cancel_tx_${agreement.publicKey}`);
      if (saved) {
        setPendingCancelPayload(saved);
        const savedInit = localStorage.getItem(`done_cancel_init_${agreement.publicKey}`);
        if (savedInit) setCancelInitiator(savedInit);
      }
    } catch {
      // ignore
    }
  }, [agreement?.publicKey]);

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

  // 7a. MUTUAL CANCELLATION — STEP 1: PARTY 1 PARTIAL SIGN
  const handleInitiatePartialCancellation = async () => {
    if (!publicKey) return;
    setIsProcessing(true);
    try {
      const sponsorAta = await getAssociatedTokenAddress(
        DEVNET_USDC_MINT,
        new PublicKey(agreement.sponsor),
        false,
        TOKEN_PROGRAM_ID
      );

      const result = await createPartialCancelAgreement(
        new PublicKey(agreement.sponsor),
        new PublicKey(agreement.worker),
        new PublicKey(agreement.publicKey),
        sponsorAta,
        signTransaction
      );

      setPendingCancelPayload(result.partialTxBase64);
      setCancelInitiator(publicKeyString);

      if (typeof window !== 'undefined') {
        localStorage.setItem(`done_cancel_tx_${agreement.publicKey}`, result.partialTxBase64);
        localStorage.setItem(`done_cancel_init_${agreement.publicKey}`, publicKeyString);
      }
    } catch (err: unknown) {
      console.error('Failed to initiate partial cancellation:', err);
      const msg = err instanceof Error ? err.message : 'Wallet rejected transaction signature';
      alert(`Partial signing failed: ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 7b. MUTUAL CANCELLATION — STEP 2: PARTY 2 CO-SIGN & BROADCAST
  const handleCosignAndBroadcast = async (payloadToUse?: string) => {
    if (!publicKey) return;
    const payload = payloadToUse || pendingCancelPayload || manualPayloadInput.trim();
    if (!payload) return;

    setIsProcessing(true);
    try {
      await onExecute(
        'cancelAgreement',
        'Co-signing mutual cancellation and broadcasting refund transaction to Solana Devnet',
        async () => {
          const sig = await cosignAndBroadcastCancelAgreement(payload, signTransaction);
          if (typeof window !== 'undefined') {
            localStorage.removeItem(`done_cancel_tx_${agreement.publicKey}`);
            localStorage.removeItem(`done_cancel_init_${agreement.publicKey}`);
          }
          setPendingCancelPayload('');
          setCancelInitiator('');
          await refreshBalances();
          return { signature: sig };
        }
      );
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  // Compute remaining refundable escrow balance
  const settledAmount = agreement.milestones
    .filter((m) => m.state === MilestoneState.RELEASED)
    .reduce((s, m) => s + m.amountUsdc, 0);
  const remainingEscrow = agreement.totalAmountUsdc - settledAmount;

  // Party checks
  const isSponsorConnected = publicKeyString === agreement.sponsor;
  const isWorkerConnected = publicKeyString === agreement.worker;
  const isFirstSigner = cancelInitiator === publicKeyString;
  const isMissingCosigner =
    pendingCancelPayload &&
    ((cancelInitiator === agreement.sponsor && isWorkerConnected) ||
      (cancelInitiator === agreement.worker && isSponsorConnected));

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
          ? 'TWO-PARTY MUTUAL CANCELLATION'
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
          ? 'Requires both Sponsor and Worker signatures on the same transaction'
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
                onClick={() => onSwitchAction?.('reject', milestone)}
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

        {/* STEP 7: TWO-PARTY MUTUAL CANCELLATION */}
        {actionType === 'cancel' && (
          <div className="space-y-4">
            <div className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                <Users className="w-4 h-4" /> Two-Party Mutual Escrow Cancellation
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                The smart contract enforces that cancellation cannot be performed unilaterally. Both
                Sponsor and Worker must cryptographically sign the exact same transaction before remaining
                escrow funds can be refunded.
              </p>
            </div>

            <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400">SPONSOR (Refund Recipient):</span>
                <span className="font-mono text-white">{truncateAddress(agreement.sponsor, 6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">ASSIGNED WORKER (Co-Signer):</span>
                <span className="font-mono text-white">{truncateAddress(agreement.worker, 6)}</span>
              </div>
              <div className="flex justify-between border-t border-[#26262a] pt-1.5">
                <span className="text-neutral-400">REMAINING REFUND AMOUNT:</span>
                <span className="font-bold text-emerald-400">${formatUsdc(remainingEscrow)} USDC</span>
              </div>
            </div>

            {/* If NO partial signature exists yet: Step 1 (Sign as current party) */}
            {!pendingCancelPayload ? (
              <div className="space-y-3">
                <div className="p-3 bg-neutral-950 border border-[#26262a] rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-violet-400 text-xs font-semibold">
                    <span className="w-5 h-5 rounded-full bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-[10px]">
                      1
                    </span>
                    <span>Step 1: First Party Signature</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Connect as either Sponsor or Worker to initiate and sign the partial cancellation transaction.
                  </p>

                  <div className="pt-2">
                    {isSponsorConnected ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleInitiatePartialCancellation}
                        disabled={isProcessing}
                        isLoading={isProcessing}
                        className="w-full bg-rose-600 hover:bg-rose-500 font-bold text-white"
                      >
                        Sign Cancellation as Sponsor
                      </Button>
                    ) : isWorkerConnected ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleInitiatePartialCancellation}
                        disabled={isProcessing}
                        isLoading={isProcessing}
                        className="w-full bg-rose-600 hover:bg-rose-500 font-bold text-white"
                      >
                        Sign Cancellation as Worker
                      </Button>
                    ) : (
                      <div className="text-[11px] text-amber-400 p-2 rounded bg-amber-950/20 border border-amber-500/30">
                        Please connect as Sponsor ({truncateAddress(agreement.sponsor, 4)}) or Worker ({truncateAddress(agreement.worker, 4)}) to sign.
                      </div>
                    )}
                  </div>
                </div>

                {/* Option to paste counterparty's partial transaction */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowManualPayloadInput(!showManualPayloadInput)}
                    className="text-[11px] text-violet-400 hover:underline flex items-center gap-1"
                  >
                    <span>Have a co-signing payload from counterparty?</span>
                  </button>

                  {showManualPayloadInput && (
                    <div className="mt-2 space-y-2 p-3 bg-[#000000] border border-[#26262a] rounded-xl">
                      <label className="text-[10px] text-neutral-400 block uppercase font-bold">
                        Paste Partially Signed Transaction (Base64)
                      </label>
                      <textarea
                        value={manualPayloadInput}
                        onChange={(e) => setManualPayloadInput(e.target.value)}
                        rows={3}
                        placeholder="Paste base64 payload here..."
                        className="w-full bg-neutral-950 border border-[#26262a] rounded-lg p-2 font-mono text-[10px] text-neutral-200 outline-none focus:border-violet-500"
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleCosignAndBroadcast(manualPayloadInput)}
                        disabled={isProcessing || !manualPayloadInput.trim()}
                        isLoading={isProcessing}
                        className="bg-emerald-600 hover:bg-emerald-500 font-bold text-white w-full"
                      >
                        Co-Sign & Broadcast On-Chain
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* If partial signature DOES exist: Step 2 (Co-Sign & Broadcast) */
              <div className="space-y-3">
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/40 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Signature 1 Recorded ({cancelInitiator === agreement.sponsor ? 'Sponsor' : 'Worker'})</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Awaiting Signature 2 from{' '}
                    <span className="text-white font-mono">
                      {cancelInitiator === agreement.sponsor
                        ? `Worker (${truncateAddress(agreement.worker, 4)})`
                        : `Sponsor (${truncateAddress(agreement.sponsor, 4)})`}
                    </span>
                    .
                  </p>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => copyText(pendingCancelPayload, 'payload')}
                      className="px-3 py-1.5 bg-[#000000] hover:bg-neutral-900 border border-[#26262a] rounded-lg text-[11px] text-violet-300 inline-flex items-center gap-1.5 font-semibold"
                    >
                      {copiedKey === 'payload' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy Co-Signing Payload</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingCancelPayload('');
                        setCancelInitiator('');
                        if (typeof window !== 'undefined') {
                          localStorage.removeItem(`done_cancel_tx_${agreement.publicKey}`);
                          localStorage.removeItem(`done_cancel_init_${agreement.publicKey}`);
                        }
                      }}
                      className="px-3 py-1.5 text-neutral-400 hover:text-rose-400 text-[11px]"
                    >
                      Reset / Cancel Flow
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-neutral-950 border border-[#26262a] rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-violet-400 text-xs font-semibold">
                    <span className="w-5 h-5 rounded-full bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-[10px]">
                      2
                    </span>
                    <span>Step 2: Second Party Co-Signature</span>
                  </div>

                  {isMissingCosigner ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleCosignAndBroadcast()}
                      disabled={isProcessing}
                      isLoading={isProcessing}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold text-white flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Co-Sign & Broadcast Cancellation On-Chain
                    </Button>
                  ) : (
                    <div className="text-[11px] text-neutral-400 p-2.5 rounded bg-[#000000] border border-[#26262a]">
                      Switch your wallet to{' '}
                      <span className="text-violet-300 font-bold">
                        {cancelInitiator === agreement.sponsor ? 'Worker' : 'Sponsor'} (
                        {truncateAddress(
                          cancelInitiator === agreement.sponsor ? agreement.worker : agreement.sponsor,
                          4
                        )}
                        )
                      </span>{' '}
                      in your extension to complete the second signature.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-[#26262a] flex justify-end">
              <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
                Close
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
