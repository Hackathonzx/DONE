'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@/components/web3/WalletContext';
import { useTransactionExecution } from '@/hooks/useTransactionExecution';
import { formatUsdc } from '@/lib/solana';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { TxStateModal } from '@/components/web3/TxStateModal';
import { DoneLogo } from '@/components/protocol/DoneLogo';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { executeOnChainCreateAgreement } from '@/lib/protocol/anchorClient';
import { prepareAccountVerificationRecipe } from '@/lib/protocol/recipe';
import { saveOffchainMetadata } from '@/lib/protocol/metadataStore';
import { hashAgreementTerms, hashDoDCriteria } from '@/lib/protocol/hashing';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Lock,
  ShieldCheck,
  X,
} from 'lucide-react';

export default function NewAgreementPage() {
  const router = useRouter();
  const { connected, publicKey, publicKeyString, signTransaction } = useWallet();
  const { txState, execute, reset: resetTx, isOpen: isTxOpen } = useTransactionExecution();

  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [termsText, setTermsText] = useState('');
  const [workerAddress, setWorkerAddress] = useState('');
  const [targetProgramId, setTargetProgramId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [newCriteriaInputs, setNewCriteriaInputs] = useState<Record<number, string>>({});

  const [milestones, setMilestones] = useState([
    {
      title: '',
      amountUsdc: 0,
      description: '',
      dodCriteria: [] as string[],
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

  const totalAmountUsdc = milestones.reduce((sum, m) => sum + m.amountUsdc, 0);

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

  const handleRemoveMilestone = (idx: number) => {
    if (milestones.length <= 1) return;
    setMilestones(milestones.filter((_, i) => i !== idx));
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

  const handleLoadProgramTemplate = (milestoneIdx: number) => {
    const updated = [...milestones];
    updated[milestoneIdx].dodCriteria = [
      'Target program exists on Solana cluster',
      'Target account executable flag is true',
      'Program owned by Upgradeable Loader',
      'ProgramData PDA linkage is valid',
    ];
    setMilestones(updated);
  };

  const handleSubmit = async () => {
    if (!connected || !publicKey) {
      setError('Please connect your Solana wallet first.');
      return;
    }

    let workerPk: PublicKey;
    try {
      workerPk = new PublicKey(workerAddress.trim());
    } catch {
      setError('Invalid Worker Solana public key.');
      return;
    }

    let targetProgPk: PublicKey | undefined;
    if (targetProgramId.trim()) {
      try {
        targetProgPk = new PublicKey(targetProgramId.trim());
      } catch {
        setError('Invalid target program public key.');
        return;
      }
    }

    await execute(
      'createAgreement',
      `Deploying agreement escrow for ${formatUsdc(totalAmountUsdc)} USDC on Solana Devnet`,
      async () => {
        let defHashBytes: number[];
        if (targetProgPk) {
          const rec = await prepareAccountVerificationRecipe(targetProgPk);
          defHashBytes = rec.definitionHashBytes;
        } else {
          const allCriteria = milestones.flatMap((m) => m.dodCriteria);
          if (allCriteria.length > 0) {
            const h = await hashDoDCriteria(allCriteria);
            defHashBytes = Array.from(h);
          } else {
            const th = await hashAgreementTerms({
              title,
              description,
              termsText: termsText || 'Standard DONE Protocol escrow terms.',
            });
            defHashBytes = Array.from(th);
          }
        }

        const agreementIdBn = new BN(Date.now());
        const totalAmountBn = new BN(totalAmountUsdc);

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
            definitionHash32: new Uint8Array(defHashBytes),
            verifier: vPk,
          };
        });

        const { signature, agreementPda } = await executeOnChainCreateAgreement(
          publicKey,
          workerPk,
          agreementIdBn,
          totalAmountBn,
          new Uint8Array(defHashBytes),
          milestoneParams,
          { signTransaction }
        );

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

        setTimeout(() => {
          router.push(`/agreements/${agreementPda}`);
        }, 1000);

        return { signature };
      }
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-mono text-neutral-100">
      <TxStateModal state={txState} isOpen={isTxOpen} onClose={resetTx} />

      <div className="flex items-center justify-between">
        <Link
          href="/agreements"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Agreements</span>
        </Link>
        <span className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">
          Step {step} of 2
        </span>
      </div>

      <div className="flex items-center justify-between pb-2 border-b border-[#26262a]">
        <div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight">
            Create Escrow Agreement
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Non-custodial milestone-based escrow on Solana Devnet
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl text-xs text-rose-300">
          {error}
        </div>
      )}

      {step === 1 ? (
        <Card className="space-y-4">
          <Input
            label="Agreement Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Protocol Core Audit or API Integration"
          />

          <Textarea
            label="Scope & Deliverables"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe deliverables and milestones..."
          />

          <Input
            label="Target Program ID to Verify (Optional)"
            value={targetProgramId}
            onChange={(e) => setTargetProgramId(e.target.value)}
            placeholder="Enter program public key, or leave blank for custom criteria..."
            className="font-mono text-xs"
          />

          <Input
            label="Worker Solana Address *"
            value={workerAddress}
            onChange={(e) => setWorkerAddress(e.target.value)}
            placeholder="Base58 Solana PublicKey (e.g. 7XqW...)"
            className="font-mono text-xs"
          />

          {/* Milestones */}
          <div className="space-y-3 pt-2 border-t border-[#26262a]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-neutral-300">
                Milestones ({milestones.length})
              </span>
              <button
                type="button"
                onClick={handleAddMilestone}
                className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3 h-3" /> Add Milestone
              </button>
            </div>

            <div className="space-y-2">
              {milestones.map((m, idx) => (
                <div key={idx} className="p-3 bg-[#000000] border border-[#26262a] rounded-xl space-y-2.5">
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
                        className="w-24 bg-[#000000] border border-[#26262a] rounded px-1.5 py-0.5 text-right font-semibold text-white text-xs outline-none"
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

                  {/* DoD Criteria */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-neutral-400">
                        DoD Criteria ({m.dodCriteria.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleLoadProgramTemplate(idx)}
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

            <div className="flex justify-between items-center p-3 rounded-xl bg-violet-950/20 border border-violet-500/30 text-xs">
              <span className="text-neutral-300">Total Escrow Budget:</span>
              <span className="text-sm font-bold text-violet-300">
                ${formatUsdc(totalAmountUsdc)} USDC
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              variant="primary"
              onClick={() => {
                if (!title.trim()) {
                  setError('Please specify agreement title.');
                  return;
                }
                if (!workerAddress.trim()) {
                  setError('Please provide worker address.');
                  return;
                }
                if (totalAmountUsdc <= 0) {
                  setError('Total milestone amount must be greater than 0.');
                  return;
                }
                setError(null);
                setStep(2);
              }}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500"
            >
              Review Escrow <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      ) : (
        /* Step 2: Confirm */
        <Card className="space-y-5 text-xs">
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[#000000] border border-[#26262a] text-center space-y-2">
            <DoneLogo className="w-12 h-12" />
            <h3 className="text-base font-bold text-white">{title}</h3>
            <div className="text-2xl font-black text-violet-400">${formatUsdc(totalAmountUsdc)} USDC</div>
            <span className="text-[10px] text-neutral-400 uppercase tracking-widest">{milestones.length} Milestones</span>
          </div>

          <div className="space-y-2">
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

          <div className="flex items-center justify-between pt-3 border-t border-[#26262a]">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button variant="primary" onClick={handleSubmit} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 font-bold">
              <ShieldCheck className="w-4 h-4" /> Authorize & Deploy Escrow
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
