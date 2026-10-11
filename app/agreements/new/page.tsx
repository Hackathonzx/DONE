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
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Lock,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export default function NewAgreementPage() {
  const router = useRouter();
  const { connected, publicKey, publicKeyString, signTransaction } = useWallet();
  const { txState, execute, reset: resetTx, isOpen: isTxOpen } = useTransactionExecution();

  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState('Devnet Smart Contract Audit & Delivery');
  const [description, setDescription] = useState(
    'Audit Solana program deployment against canonical Definition of Done checks on Devnet.'
  );
  const [termsText, setTermsText] = useState(
    'Payment released strictly upon on-chain attestation of verifiable Definition of Done criteria.'
  );
  const [workerAddress, setWorkerAddress] = useState('8mxRTwLkh6pPDJKiRViYJfnywUNcTToGsQhHoGkQYz7b');
  const [error, setError] = useState<string | null>(null);

  const [milestones, setMilestones] = useState([
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

  const handleSubmit = async () => {
    setError(null);
    if (!connected || !publicKey) {
      setError('Please connect your Solana wallet (Phantom or Solflare).');
      return;
    }

    let workerPk: PublicKey;
    try {
      workerPk = new PublicKey(workerAddress.trim());
    } catch {
      setError('Invalid worker Solana public key. Please enter a valid base58 address.');
      return;
    }

    if (workerPk.equals(publicKey)) {
      setError('Worker address must be different from the Sponsor address.');
      return;
    }

    try {
      const recipe = await prepareAccountVerificationRecipe();
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
          definitionHash32: new Uint8Array(recipe.definitionHashBytes),
          verifier: vPk,
        };
      });

      await execute(
        'createAgreement',
        `Initializing on-chain agreement with Worker ${workerPk.toBase58().slice(0, 8)}... ($${formatUsdc(totalAmountUsdc)} USDC)`,
        async () => {
          const { signature, agreementPda } = await executeOnChainCreateAgreement(
            publicKey,
            workerPk,
            agreementIdBn,
            totalAmountBn,
            new Uint8Array(recipe.definitionHashBytes),
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
              verificationMethodLabel: 'Solana Program-Account Verification',
            })),
          });

          setTimeout(() => {
            router.push(`/agreements/${agreementPda}`);
          }, 1000);

          return { signature };
        }
      );
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Transaction rejected by wallet or failed on Devnet.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 font-mono text-neutral-100">
      <TxStateModal isOpen={isTxOpen} state={txState} onClose={resetTx} />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#26262a] pb-4">
        <div className="flex items-center gap-3">
          <DoneLogo className="w-8 h-8" />
          <div>
            <h1 className="text-xl font-bold text-white">Create Escrow Agreement</h1>
            <p className="text-xs text-neutral-400">Step {step} of 2 • Live Solana Devnet</p>
          </div>
        </div>
        <Link
          href="/agreements"
          className="text-xs text-neutral-400 hover:text-white flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Cancel
        </Link>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
          {error}
        </div>
      )}

      {step === 1 ? (
        <Card className="space-y-5">
          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1.5 uppercase">
              Agreement Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Audit Assessment"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1.5 uppercase">
              Scope & Deliverable Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-neutral-300 uppercase">
                Worker Solana Address
              </label>
              <button
                type="button"
                onClick={() => setWorkerAddress('8mxRTwLkh6pPDJKiRViYJfnywUNcTToGsQhHoGkQYz7b')}
                className="text-[11px] text-violet-400 hover:underline"
              >
                Use Smoke-Test Worker
              </button>
            </div>
            <Input
              value={workerAddress}
              onChange={(e) => setWorkerAddress(e.target.value)}
              placeholder="Base58 Solana PublicKey"
              className="font-mono text-xs"
            />
          </div>

          {/* Milestones */}
          <div className="space-y-3 pt-2 border-t border-[#26262a]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-neutral-300">
                Milestones ({milestones.length})
              </span>
              <span className="text-[10px] text-neutral-400">
                Solana Program-Account Verification
              </span>
            </div>

            <div className="space-y-2">
              {milestones.map((m, idx) => (
                <div key={idx} className="p-3 bg-[#000000] border border-[#26262a] rounded-xl space-y-2">
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
                        className="w-16 bg-[#000000] border border-[#26262a] rounded px-1.5 py-0.5 text-right font-semibold text-white text-xs outline-none"
                      />
                      <span className="text-neutral-500 text-[10px]">USDC</span>
                    </div>
                  </div>

                  <div className="pt-1">
                    <label className="text-[10px] text-neutral-400 block mb-1">
                      Assigned Verifier:
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
                if (!workerAddress.trim()) {
                  setError('Please provide worker address.');
                  return;
                }
                setError(null);
                setStep(2);
              }}
              className="flex items-center gap-2"
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
