'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '../web3/WalletContext';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { formatUsdc } from '@/lib/solana';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import {
  executeOnChainCreateAgreement,
} from '@/lib/protocol/anchorClient';
import { prepareAccountVerificationRecipe } from '@/lib/protocol/recipe';
import { saveOffchainMetadata } from '@/lib/protocol/metadataStore';
import { hashAgreementTerms } from '@/lib/protocol/hashing';
import {
  X,
  Plus,
  Trash2,
  Lock,
  ArrowRight,
  ShieldCheck,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { DoneLogo } from './DoneLogo';

interface MilestoneDraft {
  title: string;
  amountUsdc: number; // in micro-USDC (6 decimals)
  description: string;
  dodCriteria: string[];
  verifier: string;
}

interface CreateAgreementDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (agreementPda: string) => void;
}

export function CreateAgreementDrawer({
  isOpen,
  onClose,
  onSuccess,
}: CreateAgreementDrawerProps) {
  const { connected, publicKey, publicKeyString, signTransaction } = useWallet();

  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState('Devnet Smart Contract Audit & Delivery');
  const [description, setDescription] = useState(
    'Audit Solana program deployment against canonical Definition of Done checks on Devnet.'
  );
  const [termsText, setTermsText] = useState(
    'Payment released strictly upon on-chain attestation of verifiable Definition of Done criteria.'
  );
  const [workerAddress, setWorkerAddress] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prepared recipe cache
  const [preparedRecipe, setPreparedRecipe] = useState<{
    definitionHashHex: string;
    definitionHashBytes: number[];
  } | null>(null);

  // Initialize milestone drafts
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([
    {
      title: 'Milestone 1: Automated Program-Account Verification',
      amountUsdc: 1_000_000, // 1 USDC
      description: 'Account existence, executable flag, upgradeable loader owner, and ProgramData linkage.',
      dodCriteria: [
        'Program account exists on Solana Devnet cluster',
        'Target account is executable',
        'Owner is BPFLoaderUpgradeab1e11111111111111111111111',
        'ProgramData PDA matches and points to valid state',
      ],
      verifier: '',
    },
  ]);

  // Load the canonical recipe hashes on open
  useEffect(() => {
    let active = true;
    if (isOpen) {
      prepareAccountVerificationRecipe()
        .then((recipe) => {
          if (active) {
            setPreparedRecipe({
              definitionHashHex: recipe.definitionHashHex,
              definitionHashBytes: recipe.definitionHashBytes,
            });
            // Default verifier to current connected wallet
            if (publicKeyString) {
              setMilestones((prev) =>
                prev.map((m) => ({
                  ...m,
                  verifier: m.verifier || publicKeyString,
                }))
              );
            }
          }
        })
        .catch(console.error);
    }
    return () => {
      active = false;
    };
  }, [isOpen, publicKeyString]);

  if (!isOpen) return null;

  const totalBudget = milestones.reduce((sum, m) => sum + m.amountUsdc, 0);

  const handleCreate = async () => {
    setErrorMsg(null);
    if (!connected || !publicKey) {
      setErrorMsg('Please connect your Solana wallet (Phantom or Solflare).');
      return;
    }

    let workerPk: PublicKey;
    try {
      workerPk = new PublicKey(workerAddress.trim());
    } catch {
      setErrorMsg('Invalid worker Solana public key. Please enter a valid base58 address.');
      return;
    }

    if (workerPk.equals(publicKey)) {
      setErrorMsg('Worker address must be different from the Sponsor address.');
      return;
    }

    if (milestones.length === 0) {
      setErrorMsg('Please add at least one milestone.');
      return;
    }

    if (totalBudget <= 0) {
      setErrorMsg('Total escrow amount must be greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Compute definition hashes
      const recipe = preparedRecipe || (await prepareAccountVerificationRecipe());
      const termsHash = await hashAgreementTerms({
        title,
        description,
        termsText,
      });

      const agreementIdBn = new BN(Date.now());
      const totalAmountBn = new BN(totalBudget);

      const milestoneParams = milestones.map((m, idx) => {
        let vPk: PublicKey;
        try {
          vPk = new PublicKey(m.verifier.trim() || publicKeyString);
        } catch {
          vPk = publicKey;
        }
        return {
          index: idx,
          amountRaw: new BN(m.amountUsdc),
          definitionHash32: new Uint8Array(recipe.definitionHashBytes),
          verifier: vPk,
        };
      });

      // 2. Dispatch real on-chain transaction
      const { signature, agreementPda } = await executeOnChainCreateAgreement(
        publicKey,
        workerPk,
        agreementIdBn,
        totalAmountBn,
        new Uint8Array(recipe.definitionHashBytes),
        milestoneParams,
        { signTransaction }
      );

      // 3. Store offchain metadata (human titles, descriptions, criteria) linked by agreementPda
      saveOffchainMetadata({
        agreementPda,
        title,
        description,
        termsText,
        createdAt: Date.now(),
        milestones: milestones.map((m, idx) => ({
          index: idx,
          title: m.title,
          description: m.description,
          dodCriteria: m.dodCriteria,
          verificationMethodLabel: 'Solana Program-Account Verification',
        })),
      });

      onSuccess(agreementPda);
      onClose();
    } catch (err: any) {
      console.error('Create agreement error:', err);
      setErrorMsg(err?.message || 'Transaction rejected by wallet or failed on Devnet.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 font-mono text-neutral-100">
      <div className="w-full max-w-xl bg-[#000000] border-l border-[#26262a] h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#26262a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DoneLogo className="w-7 h-7" />
            <div>
              <h2 className="text-sm font-bold text-white tracking-wider">
                NEW ESCROW AGREEMENT
              </h2>
              <span className="text-[10px] text-violet-400 font-medium">
                Live Solana Devnet Program
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          {step === 1 ? (
            <>
              {/* Title & Description */}
              <div>
                <label className="text-[11px] uppercase tracking-wider text-neutral-300 font-semibold block mb-1.5">
                  Agreement Title
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Smart Contract Security Audit"
                  className="bg-[#000000] border-[#26262a] text-sm"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-neutral-300 font-semibold block mb-1.5">
                  Scope & Deliverable Description
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="bg-[#000000] border-[#26262a] text-xs"
                />
              </div>

              {/* Worker Address */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] uppercase tracking-wider text-neutral-300 font-semibold">
                    Assigned Worker Address
                  </label>
                  <button
                    type="button"
                    onClick={() => setWorkerAddress('8mxRTwLkh6pPDJKiRViYJfnywUNcTToGsQhHoGkQYz7b')}
                    className="text-[10px] text-violet-400 hover:text-violet-300 underline"
                  >
                    Use Smoke-Test Worker
                  </button>
                </div>
                <Input
                  value={workerAddress}
                  onChange={(e) => setWorkerAddress(e.target.value)}
                  placeholder="Recipient Solana PublicKey (base58, e.g. 8mxR...Yz7b)"
                  className="bg-[#000000] border-[#26262a] text-xs font-mono"
                />
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  Must be a distinct Solana address from the Sponsor.
                </span>
              </div>

              {/* Milestones & Verification Method */}
              <div className="space-y-3 pt-3 border-t border-[#26262a]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-neutral-300 font-semibold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-violet-400" />
                    Milestones ({milestones.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-400">
                      Recipe: Account Check DoD
                    </span>
                  </div>
                </div>

                {milestones.map((m, idx) => (
                  <div key={idx} className="p-3 bg-[#000000] rounded-xl border border-[#26262a] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-violet-400">#{idx + 1}</span>
                      <input
                        type="text"
                        value={m.title}
                        onChange={(e) => {
                          const updated = [...milestones];
                          updated[idx].title = e.target.value;
                          setMilestones(updated);
                        }}
                        className="flex-1 bg-transparent border-b border-[#26262a] focus:border-violet-500 text-xs text-white pb-0.5 outline-none"
                      />
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-neutral-500">$</span>
                        <input
                          type="number"
                          step="0.1"
                          value={m.amountUsdc / 1e6}
                          onChange={(e) => {
                            const updated = [...milestones];
                            const val = parseFloat(e.target.value) || 0;
                            updated[idx].amountUsdc = Math.round(val * 1e6);
                            setMilestones(updated);
                          }}
                          className="w-20 bg-[#000000] border border-[#26262a] rounded px-1.5 py-0.5 text-right font-semibold text-white text-xs outline-none focus:border-violet-500"
                        />
                        <span className="text-neutral-500 text-[10px]">USDC</span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <label className="text-[10px] text-neutral-400 block mb-1">
                        Assigned Verifier (audits & attests evidence):
                      </label>
                      <input
                        type="text"
                        value={m.verifier}
                        onChange={(e) => {
                          const updated = [...milestones];
                          updated[idx].verifier = e.target.value;
                          setMilestones(updated);
                        }}
                        placeholder={publicKeyString || 'Verifier Solana PublicKey'}
                        className="w-full bg-[#000000] border border-[#26262a] rounded px-2 py-1 text-[11px] font-mono text-neutral-200 outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                ))}

                {/* On-chain DoD commitment info */}
                <div className="p-3 rounded-xl bg-violet-950/20 border border-violet-500/30 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-300">Total Escrow Allocation:</span>
                    <span className="text-base font-bold text-violet-300">
                      ${formatUsdc(totalBudget)} USDC
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-400 flex items-center justify-between border-t border-violet-500/20 pt-1">
                    <span>Supported Verification:</span>
                    <span className="text-violet-300">Solana Account-Check Recipe</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Step 2: Confirmation */
            <div className="space-y-4 py-2">
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[#000000] border border-[#26262a] text-center">
                <DoneLogo className="w-14 h-14 mb-3" />
                <h3 className="text-base font-bold text-white mb-1">{title}</h3>
                <p className="text-xs text-neutral-400 mb-3">
                  {milestones.length} Milestone(s) • Live Devnet Escrow
                </p>
                <div className="text-2xl font-black text-violet-400 mb-1">
                  ${formatUsdc(totalBudget)} USDC
                </div>
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest">
                  Transferred into escrow upon Sponsor funding
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#000000] border border-[#26262a]">
                  <span className="text-neutral-400">Sponsor:</span>
                  <span className="text-violet-300 font-mono text-[11px]">
                    {publicKeyString ? `${publicKeyString.slice(0, 8)}...${publicKeyString.slice(-6)}` : 'Connected'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#000000] border border-[#26262a]">
                  <span className="text-neutral-400">Assigned Worker:</span>
                  <span className="text-violet-300 font-mono text-[11px]">
                    {workerAddress ? `${workerAddress.slice(0, 8)}...${workerAddress.slice(-6)}` : ''}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#000000] border border-[#26262a]">
                  <span className="text-neutral-400">DoD Commitment:</span>
                  <span className="text-emerald-400 font-mono text-[10px] truncate max-w-[200px]">
                    {preparedRecipe?.definitionHashHex ? `${preparedRecipe.definitionHashHex.slice(0, 16)}...` : 'SHA-256'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#26262a] bg-[#000000] flex items-center justify-between gap-3">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-neutral-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <Button
                variant="primary"
                onClick={() => {
                  if (!workerAddress.trim()) {
                    setErrorMsg('Please specify the worker Solana address.');
                    return;
                  }
                  setErrorMsg(null);
                  setStep(2);
                }}
                className="flex items-center gap-2"
              >
                Review & Confirm <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl text-neutral-400 hover:text-white text-xs font-semibold"
              >
                Back
              </button>
              <Button
                variant="primary"
                isLoading={isSubmitting}
                onClick={handleCreate}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500"
              >
                <ShieldCheck className="w-4 h-4" /> Authorize & Deploy to Devnet
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
