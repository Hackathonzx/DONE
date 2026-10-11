'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@/components/web3/WalletContext';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { formatUsdc } from '@/lib/solana';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { executeOnChainCreateAgreement } from '@/lib/protocol/anchorClient';
import { prepareAccountVerificationRecipe } from '@/lib/protocol/recipe';
import { saveOffchainMetadata } from '@/lib/protocol/metadataStore';
import { hashAgreementTerms, hashDoDCriteria } from '@/lib/protocol/hashing';
import {
  X,
  Plus,
  Trash2,
  Lock,
  ArrowRight,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { DoneLogo } from '@/components/protocol/DoneLogo';

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

  // Clean form state with zero hardcoded dummy values
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [termsText, setTermsText] = useState('');
  const [workerAddress, setWorkerAddress] = useState('');
  const [targetProgramId, setTargetProgramId] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New criterion input buffer per milestone
  const [newCriteriaInputs, setNewCriteriaInputs] = useState<Record<number, string>>({});

  const [milestones, setMilestones] = useState<MilestoneDraft[]>([
    {
      title: '',
      amountUsdc: 0,
      description: '',
      dodCriteria: [],
      verifier: '',
    },
  ]);

  useEffect(() => {
    if (publicKeyString) {
      setMilestones((prev) =>
        prev.map((m) => ({
          ...m,
          verifier: m.verifier || publicKeyString,
        }))
      );
    }
  }, [publicKeyString]);

  if (!isOpen) return null;

  const totalBudget = milestones.reduce((sum, m) => sum + m.amountUsdc, 0);

  const handleAddMilestone = () => {
    setMilestones([
      ...milestones,
      {
        title: '',
        amountUsdc: 0,
        description: '',
        dodCriteria: [],
        verifier: publicKeyString || '',
      },
    ]);
  };

  const handleRemoveMilestone = (index: number) => {
    if (milestones.length <= 1) return;
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const handleAddCriterion = (milestoneIdx: number) => {
    const text = (newCriteriaInputs[milestoneIdx] || '').trim();
    if (!text) return;
    const updated = [...milestones];
    updated[milestoneIdx].dodCriteria.push(text);
    setMilestones(updated);
    setNewCriteriaInputs((prev) => ({ ...prev, [milestoneIdx]: '' }));
  };

  const handleRemoveCriterion = (milestoneIdx: number, critIdx: number) => {
    const updated = [...milestones];
    updated[milestoneIdx].dodCriteria = updated[milestoneIdx].dodCriteria.filter(
      (_, i) => i !== critIdx
    );
    setMilestones(updated);
  };

  const handleLoadStandardProgramCheckTemplate = (milestoneIdx: number) => {
    const updated = [...milestones];
    updated[milestoneIdx].dodCriteria = [
      'Target program exists on Solana cluster',
      'Target account executable flag is true',
      'Program owned by Upgradeable Loader',
      'ProgramData PDA linkage is valid',
    ];
    setMilestones(updated);
  };

  const handleCreate = async () => {
    setErrorMsg(null);
    if (!connected || !publicKey) {
      setErrorMsg('Please connect your Solana wallet (Phantom or Solflare).');
      return;
    }

    if (!title.trim()) {
      setErrorMsg('Please enter an agreement title.');
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

    const invalidMilestone = milestones.find((m) => !m.title.trim() || m.amountUsdc <= 0);
    if (invalidMilestone) {
      setErrorMsg('Each milestone must have a title and an allocation amount greater than 0.');
      return;
    }

    let targetProgPk: PublicKey | undefined;
    if (targetProgramId.trim()) {
      try {
        targetProgPk = new PublicKey(targetProgramId.trim());
      } catch {
        setErrorMsg('Invalid target program public key to verify.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Compute definition hashes
      let definitionHashBytes: number[];
      if (targetProgPk) {
        const recipe = await prepareAccountVerificationRecipe(targetProgPk);
        definitionHashBytes = recipe.definitionHashBytes;
      } else {
        // Hash custom criteria or terms
        const allCriteria = milestones.flatMap((m) => m.dodCriteria);
        if (allCriteria.length > 0) {
          const hashU8 = await hashDoDCriteria(allCriteria);
          definitionHashBytes = Array.from(hashU8);
        } else {
          const termsHashU8 = await hashAgreementTerms({
            title,
            description,
            termsText: termsText || 'Standard DONE Protocol Escrow terms.',
          });
          definitionHashBytes = Array.from(termsHashU8);
        }
      }

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
          definitionHash32: new Uint8Array(definitionHashBytes),
          verifier: vPk,
        };
      });

      // Dispatch real on-chain transaction
      const { signature, agreementPda } = await executeOnChainCreateAgreement(
        publicKey,
        workerPk,
        agreementIdBn,
        totalAmountBn,
        new Uint8Array(definitionHashBytes),
        milestoneParams,
        { signTransaction }
      );

      // Store offchain metadata linked by agreementPda
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
          verificationMethodLabel: targetProgPk ? 'Program Account Check' : 'Criteria Verification',
        })),
      });

      onSuccess(agreementPda);
      onClose();
    } catch (err: unknown) {
      console.error('Failed to create on-chain agreement:', err);
      const msg = err instanceof Error ? err.message : 'Transaction failed or rejected by wallet.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end font-mono">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[#000000] border-l border-[#26262a] h-full shadow-2xl flex flex-col text-neutral-100 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-[#26262a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DoneLogo className="w-6 h-6" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                CREATE ESCROW AGREEMENT
              </h2>
              <span className="text-[11px] text-neutral-400">
                Solana Devnet Program Deployment
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-4">
              {/* Step 1 Form */}
              <Input
                label="AGREEMENT TITLE *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Protocol Core Audit or API Integration"
              />

              <Textarea
                label="DELIVERABLE SCOPE & DESCRIPTION"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Scope of work, deliverables, and requirements..."
              />

              <Input
                label="ASSIGNED WORKER SOLANA ADDRESS *"
                value={workerAddress}
                onChange={(e) => setWorkerAddress(e.target.value)}
                placeholder="Base58 Solana PublicKey (e.g. 7XqW...)"
                className="font-mono text-xs"
              />

              <Input
                label="TARGET SOLANA PROGRAM ID TO VERIFY (OPTIONAL)"
                value={targetProgramId}
                onChange={(e) => setTargetProgramId(e.target.value)}
                placeholder="Enter program public key, or leave blank for custom criteria..."
                className="font-mono text-xs"
              />

              {/* Milestones List */}
              <div className="space-y-3 pt-3 border-t border-[#26262a]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-violet-400" />
                    <span className="text-xs font-bold uppercase text-neutral-200">
                      MILESTONES ({milestones.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMilestone}
                    className="text-xs text-violet-400 hover:text-violet-300 inline-flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Milestone
                  </button>
                </div>

                <div className="space-y-3">
                  {milestones.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-[#000000] border border-[#26262a] rounded-xl space-y-3"
                    >
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
                          placeholder="Milestone title..."
                          className="flex-1 bg-transparent border-b border-[#26262a] focus:border-violet-500 text-xs text-white pb-0.5 outline-none"
                        />
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-neutral-500">$</span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={m.amountUsdc ? m.amountUsdc / 1e6 : ''}
                            onChange={(e) => {
                              const updated = [...milestones];
                              const val = parseFloat(e.target.value) || 0;
                              updated[idx].amountUsdc = Math.round(val * 1e6);
                              setMilestones(updated);
                            }}
                            placeholder="0.00"
                            className="w-24 bg-[#000000] border border-[#26262a] rounded px-1.5 py-0.5 text-right font-semibold text-white text-xs outline-none focus:border-violet-500"
                          />
                          <span className="text-neutral-500 text-[10px]">USDC</span>
                        </div>
                        {milestones.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMilestone(idx)}
                            className="p-1 text-neutral-500 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Verifier */}
                      <div className="pt-1">
                        <label className="text-[10px] text-neutral-400 block mb-1">
                          Assigned Verifier Public Key:
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

                      {/* DoD Criteria for this milestone */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-neutral-400">
                            Definition of Done Criteria ({m.dodCriteria.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleLoadStandardProgramCheckTemplate(idx)}
                            className="text-[10px] text-violet-400 hover:text-violet-300"
                          >
                            + Load Program Template
                          </button>
                        </div>

                        {m.dodCriteria.length > 0 && (
                          <div className="space-y-1">
                            {m.dodCriteria.map((c, cIdx) => (
                              <div
                                key={cIdx}
                                className="flex items-center justify-between p-1.5 bg-neutral-950 border border-[#26262a] rounded text-[11px]"
                              >
                                <span className="text-neutral-300 truncate">
                                  {cIdx + 1}. {c}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCriterion(idx, cIdx)}
                                  className="text-neutral-500 hover:text-rose-400 p-0.5"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-1.5 pt-0.5">
                          <input
                            type="text"
                            value={newCriteriaInputs[idx] || ''}
                            onChange={(e) =>
                              setNewCriteriaInputs((prev) => ({
                                ...prev,
                                [idx]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCriterion(idx);
                              }
                            }}
                            placeholder="Add specific criterion..."
                            className="flex-1 bg-[#000000] border border-[#26262a] rounded px-2 py-1 text-[11px] text-white outline-none focus:border-violet-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddCriterion(idx)}
                            className="px-2.5 py-1 bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 border border-violet-500/40 rounded text-[11px]"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Escrow Budget display */}
                <div className="flex justify-between items-center p-3 rounded-xl bg-violet-950/20 border border-violet-500/30">
                  <span className="text-neutral-300">Total Escrow Budget:</span>
                  <span className="text-sm font-bold text-violet-300">
                    ${formatUsdc(totalBudget)} USDC
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Review Step */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#000000] border border-[#26262a] text-center space-y-2">
                <DoneLogo className="w-10 h-10 mx-auto" />
                <h3 className="text-base font-bold text-white">{title}</h3>
                <div className="text-2xl font-black text-violet-400">
                  ${formatUsdc(totalBudget)} USDC
                </div>
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest">
                  {milestones.length} Milestones
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-3 rounded-xl bg-[#000000] border border-[#26262a]">
                  <span className="text-neutral-400">Sponsor:</span>
                  <span className="text-violet-300 font-mono text-[11px]">
                    {publicKeyString ? `${publicKeyString.slice(0, 10)}...` : 'Connected Wallet'}
                  </span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-[#000000] border border-[#26262a]">
                  <span className="text-neutral-400">Worker:</span>
                  <span className="text-violet-300 font-mono text-[11px]">
                    {workerAddress ? `${workerAddress.slice(0, 10)}...` : ''}
                  </span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-[#000000] border border-[#26262a]">
                  <span className="text-neutral-400">Security:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Non-Custodial Vault PDA
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-[#26262a] flex items-center justify-between">
          {step === 1 ? (
            <>
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (!title.trim()) {
                    setErrorMsg('Please specify agreement title.');
                    return;
                  }
                  if (!workerAddress.trim()) {
                    setErrorMsg('Please provide worker address.');
                    return;
                  }
                  if (totalBudget <= 0) {
                    setErrorMsg('Total milestone amount must be greater than 0.');
                    return;
                  }
                  setErrorMsg(null);
                  setStep(2);
                }}
                className="bg-violet-600 hover:bg-violet-500 font-bold flex items-center gap-1"
              >
                Review Escrow <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setStep(1)} disabled={isSubmitting}>
                Back
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreate}
                disabled={isSubmitting}
                isLoading={isSubmitting}
                className="bg-violet-600 hover:bg-violet-500 font-bold flex items-center gap-1"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Authorize & Deploy Escrow
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
