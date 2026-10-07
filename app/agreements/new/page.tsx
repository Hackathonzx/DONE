'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PublicKey } from '@solana/web3.js';
import { VerificationType } from '@/types/protocol';
import {
  hashAgreementTerms,
  hashDefinitionOfDone,
  uint8ArrayToHex,
} from '@/lib/protocol/hashing';
import { parseUsdc, formatUsdc, truncateAddress } from '@/lib/solana';
import { protocolClient, DEMO_KEYS } from '@/lib/protocol/client';
import { useTransactionExecution } from '@/hooks/useTransactionExecution';
import { TxStateModal } from '@/components/web3/TxStateModal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import {
  PlusCircle,
  Trash2,
  ShieldCheck,
  Hash,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Coins,
} from 'lucide-react';

interface MilestoneDraft {
  title: string;
  description: string;
  amountUsdcString: string;
  verificationType: VerificationType;
  criteria: string[];
  computedDodHash: string;
}

export default function NewAgreementPage() {
  const router = useRouter();
  const { txState, execute, reset, isOpen } = useTransactionExecution();

  // Step 1: Agreement Terms
  const [workerPubkey, setWorkerPubkey] = useState(DEMO_KEYS.WORKER);
  const [title, setTitle] = useState('Full-Stack Web3 Integration & Audit');
  const [description, setDescription] = useState(
    'Implementation of Solana Anchor client adapter with comprehensive DoD verification pipeline.'
  );
  const [termsText, setTermsText] = useState(
    '1. All milestones must strictly satisfy committed Definition of Done criteria.\n2. Work artifacts must be permanently stored on Arweave or IPFS.\n3. Disbursals are final upon block confirmation.'
  );
  const [computedTermsHash, setComputedTermsHash] = useState('');

  // Step 2: Milestones
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([
    {
      title: 'Milestone 0: Protocol Client Architecture & Anchor IDL',
      description: 'Implement typed client interface with PDA derivation and deterministic error handling.',
      amountUsdcString: '5000',
      verificationType: VerificationType.SPONSOR,
      criteria: [
        'Complete TypeScript client matching Anchor IDL instructions',
        'Unit tests for canonical DoD and Terms SHA-256 hashing',
        'Passing lint check with zero compiler warnings',
      ],
      computedDodHash: '',
    },
    {
      title: 'Milestone 1: Web3 Verification & Settlement UI',
      description: 'Complete UI pipeline from evidence submission to on-chain settlement.',
      amountUsdcString: '7500',
      verificationType: VerificationType.SPONSOR,
      criteria: [
        'Deterministic status transitions driven by block confirmation',
        'Solana Explorer signature links on all mutations',
        'End-to-end integration verified on Devnet',
      ],
      computedDodHash: '',
    },
  ]);

  // Compute terms hash whenever terms change
  useEffect(() => {
    let active = true;
    const compute = async () => {
      const buffer = await hashAgreementTerms({ title, description, termsText });
      if (active) setComputedTermsHash(uint8ArrayToHex(buffer));
    };
    compute();
    return () => {
      active = false;
    };
  }, [title, description, termsText]);

  const criteriaSignature = JSON.stringify(milestones.map((m) => m.criteria));

  // Compute DoD hashes for milestones
  useEffect(() => {
    let active = true;
    const computeAll = async () => {
      const parsed = JSON.parse(criteriaSignature) as string[][];
      const hashes = await Promise.all(
        parsed.map(async (crits) => {
          const buffer = await hashDefinitionOfDone(crits.filter(Boolean));
          return uint8ArrayToHex(buffer);
        })
      );
      if (active) {
        setMilestones((prev) =>
          prev.map((m, idx) => ({
            ...m,
            computedDodHash: hashes[idx] || '',
          }))
        );
      }
    };
    computeAll();
    return () => {
      active = false;
    };
  }, [criteriaSignature]);

  const addMilestone = () => {
    setMilestones([
      ...milestones,
      {
        title: `Milestone ${milestones.length}: New Deliverable`,
        description: 'Provide deliverable description...',
        amountUsdcString: '2500',
        verificationType: VerificationType.SPONSOR,
        criteria: ['Criterion 1 requirement', 'Criterion 2 validation'],
        computedDodHash: '',
      },
    ]);
  };

  const removeMilestone = (index: number) => {
    if (milestones.length <= 1) return;
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (index: number, patch: Partial<MilestoneDraft>) => {
    const next = [...milestones];
    next[index] = { ...next[index], ...patch };
    setMilestones(next);
  };

  const addCriterion = (mIdx: number) => {
    const next = [...milestones];
    next[mIdx].criteria.push('');
    setMilestones(next);
  };

  const updateCriterion = (mIdx: number, cIdx: number, val: string) => {
    const next = [...milestones];
    next[mIdx].criteria[cIdx] = val;
    setMilestones(next);
  };

  const removeCriterion = (mIdx: number, cIdx: number) => {
    const next = [...milestones];
    next[mIdx].criteria = next[mIdx].criteria.filter((_, i) => i !== cIdx);
    setMilestones(next);
  };

  const totalBudgetUsdc = milestones.reduce((sum, m) => sum + (parseFloat(m.amountUsdcString) || 0), 0);

  const handleCreateAgreement = async () => {
    // Validate worker address
    try {
      new PublicKey(workerPubkey);
    } catch {
      alert('Invalid Solana Worker Public Key format');
      return;
    }

    const termsBuffer = await hashAgreementTerms({ title, description, termsText });

    // Step 1: Create Agreement Account on-chain
    const result = await execute(
      'createAgreement',
      `Initializing Agreement PDA with worker ${truncateAddress(workerPubkey, 4)} and ${milestones.length} milestones`,
      async () => {
        const agRes = await protocolClient.createAgreement({
          worker: new PublicKey(workerPubkey),
          termsHash: termsBuffer,
          milestoneCount: milestones.length,
          title,
          description,
          termsText,
        });

        // Initialize each milestone account
        for (let i = 0; i < milestones.length; i++) {
          const m = milestones[i];
          const dodBuffer = await hashDefinitionOfDone(m.criteria.filter(Boolean));
          const rawAmount = parseUsdc(m.amountUsdcString);

          await protocolClient.createMilestone({
            agreement: agRes.agreementPda,
            index: i,
            amount: rawAmount,
            dodHash: dodBuffer,
            verificationType: m.verificationType,
            title: m.title,
            description: m.description,
            dodCriteria: m.criteria.filter(Boolean),
          });
        }

        return agRes;
      }
    );

    if (result) {
      setTimeout(() => {
        router.push(`/agreements/${result.agreementPda.toBase58()}`);
      }, 1200);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 font-mono">
      <TxStateModal state={txState} isOpen={isOpen} onClose={reset} />

      {/* Page Header */}
      <div className="border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>INITIALIZE ANCHOR AGREEMENT ACCOUNT</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">
          Agreement & Milestone Creation Wizard
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Establish deterministic terms and commit canonical SHA-256 Definition of Done requirements.
        </p>
      </div>

      {/* Section 1: Agreement Terms & Parties */}
      <Card>
        <CardHeader className="bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 bg-cyan-950 border border-cyan-800 text-cyan-300 flex items-center justify-center text-xs font-bold">
              1
            </span>
            <h3 className="font-bold text-sm text-zinc-100">Parties & Agreement Terms</h3>
          </div>
          <span className="text-[11px] text-zinc-400">STAGE 1</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="WORKER SOLANA PUBLIC KEY"
            helperText="The worker keypair authorized to submit evidence and receive settled USDC."
            value={workerPubkey}
            onChange={(e) => setWorkerPubkey(e.target.value)}
            required
          />

          <Input
            label="AGREEMENT TITLE"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <Textarea
            label="PROJECT SCOPE OVERVIEW"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          <Textarea
            label="TERMS & CONDITIONS (COMMITMENT SOURCE)"
            rows={3}
            value={termsText}
            onChange={(e) => setTermsText(e.target.value)}
            required
          />

          {/* Canonical Terms Hash */}
          <div className="p-3 bg-zinc-900 border border-zinc-800">
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 uppercase font-bold mb-1">
              <Hash className="w-3 h-3 text-cyan-400" />
              CANONICAL SHA-256 TERMS COMMITMENT:
            </div>
            <div className="text-xs text-cyan-300 font-mono break-all">{computedTermsHash}</div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Milestones & Definition of Done */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 bg-cyan-950 border border-cyan-800 text-cyan-300 flex items-center justify-center text-xs font-bold">
              2
            </span>
            <h3 className="font-bold text-sm text-zinc-100">
              Definition of Done Milestones ({milestones.length})
            </h3>
          </div>
          <Button variant="outline" size="sm" onClick={addMilestone}>
            <PlusCircle className="w-3.5 h-3.5 mr-1 text-cyan-400" />
            Add Milestone
          </Button>
        </div>

        {milestones.map((m, mIdx) => (
          <Card key={mIdx} className="border-zinc-800/80">
            <CardHeader className="bg-zinc-900/40">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-cyan-400 px-2 py-0.5 bg-cyan-950 border border-cyan-800">
                  MILESTONE #{mIdx}
                </span>
                <span className="text-xs font-semibold text-zinc-200 truncate">{m.title}</span>
              </div>
              {milestones.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeMilestone(mIdx)}
                  className="text-zinc-500 hover:text-rose-400 text-xs inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <Input
                    label="MILESTONE TITLE"
                    value={m.title}
                    onChange={(e) => updateMilestone(mIdx, { title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Input
                    label="ALLOCATION (USDC)"
                    type="number"
                    min="1"
                    step="1"
                    value={m.amountUsdcString}
                    onChange={(e) => updateMilestone(mIdx, { amountUsdcString: e.target.value })}
                    required
                  />
                </div>
              </div>

              <Textarea
                label="MILESTONE OBJECTIVE"
                rows={2}
                value={m.description}
                onChange={(e) => updateMilestone(mIdx, { description: e.target.value })}
                required
              />

              {/* Verification Type Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 uppercase tracking-wide">
                  VERIFICATION METHOD
                </label>
                <select
                  value={m.verificationType}
                  onChange={(e) =>
                    updateMilestone(mIdx, { verificationType: Number(e.target.value) })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 rounded-none focus:outline-none focus:border-cyan-400"
                >
                  <option value={VerificationType.SPONSOR}>Sponsor Direct Sign-off</option>
                  <option value={VerificationType.ON_CHAIN_ORACLE}>
                    On-Chain Oracle / Keeper
                  </option>
                  <option value={VerificationType.ATTESTATION}>
                    Cryptographic Attestation (EAS / Solana precompile)
                  </option>
                </select>
              </div>

              {/* Definition of Done Criteria */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
                    DEFINITION OF DONE (DoD) CRITERIA ({m.criteria.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => addCriterion(mIdx)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                  >
                    <PlusCircle className="w-3 h-3" /> Add Criterion
                  </button>
                </div>

                <div className="space-y-2">
                  {m.criteria.map((crit, cIdx) => (
                    <div key={cIdx} className="flex gap-2 items-center">
                      <span className="text-xs font-bold text-zinc-500 w-5">[{cIdx + 1}]</span>
                      <Input
                        value={crit}
                        onChange={(e) => updateCriterion(mIdx, cIdx, e.target.value)}
                        placeholder="Specific, testable completion requirement..."
                      />
                      {m.criteria.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCriterion(mIdx, cIdx)}
                          className="p-1.5 text-zinc-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Computed DoD Hash */}
              <div className="p-3 bg-zinc-900 border border-zinc-800 text-xs">
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 uppercase font-bold mb-0.5">
                  <Hash className="w-3 h-3 text-cyan-400" />
                  CANONICAL DoD SHA-256 HASH (NORMALIZED & SORTED):
                </div>
                <div className="text-[11px] text-amber-300 font-mono break-all">
                  {m.computedDodHash || 'Hashing...'}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary and Submit Bar */}
      <div className="p-5 bg-zinc-950 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.1)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-zinc-400 text-xs uppercase block">TOTAL ESCROW BUDGET</span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400">
            ${totalBudgetUsdc.toLocaleString()} USDC
          </div>
          <span className="text-[11px] text-zinc-400">
            {milestones.length} Milestones committed to Solana Devnet
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="md" onClick={() => router.push('/')}>
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={handleCreateAgreement}>
            <Coins className="w-4 h-4 mr-1.5 text-black" />
            Initialize On-Chain Agreement
            <ArrowRight className="w-4 h-4 ml-1.5 text-black" />
          </Button>
        </div>
      </div>
    </div>
  );
}
