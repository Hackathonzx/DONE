'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAgreements } from '@/hooks/useAgreement';
import { AgreementState, MilestoneState } from '@/types/protocol';
import { formatUsdc, truncateAddress } from '@/lib/solana';
import { AgreementStateBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { protocolClient } from '@/lib/protocol/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  PlusCircle,
  ArrowRight,
  Lock,
  FileCheck,
  Coins,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Database,
  Terminal,
} from 'lucide-react';

export default function HomePage() {
  const { data: agreements = [], isLoading } = useAgreements();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('ALL');
  const [isResetting, setIsResetting] = useState(false);

  const filtered = agreements.filter((a) => {
    if (filter === 'ALL') return true;
    return a.state === filter;
  });

  // Calculate Protocol Metrics
  const totalCommittedUsdc = agreements.reduce((acc, a) => acc + a.totalAmountUsdc, 0);
  const totalSettledUsdc = agreements.reduce((acc, a) => {
    return (
      acc +
      a.milestones
        .filter((m) => m.state === MilestoneState.RELEASED)
        .reduce((sum, m) => sum + m.amountUsdc, 0)
    );
  }, 0);
  const activeCount = agreements.filter(
    (a) => a.state === AgreementState.ACTIVE || a.state === AgreementState.FUNDED
  ).length;

  const handleResetSeed = async () => {
    setIsResetting(true);
    protocolClient.resetToDefaultSeed();
    await queryClient.invalidateQueries();
    setTimeout(() => setIsResetting(false), 500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Hero Section */}
      <div className="border border-zinc-800 bg-zinc-950/80 p-6 sm:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-cyan-950/70 border border-cyan-800 text-[11px] text-cyan-300 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            SOLANA ANCHOR DEVNET RUNTIME
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-100 font-mono">
            Programmable Settlement for Verifiable Work
          </h1>

          <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-mono">
            DONE Protocol eliminates subjective escrow releases on Solana. Work is bound to a canonical Definition of Done (DoD) hash, verified against cryptographic evidence, and settled via deterministic SPL USDC transfers.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link href="/agreements/new">
              <Button variant="primary" size="md">
                <PlusCircle className="w-4 h-4 mr-1.5 text-black" />
                Initialize Agreement
              </Button>
            </Link>
            <Link href="/sponsor">
              <Button variant="outline" size="md">
                Sponsor Dashboard
              </Button>
            </Link>
            <Link href="/worker">
              <Button variant="secondary" size="md">
                Worker Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* 4-Stage Protocol Pipeline Banner */}
        <div className="mt-8 pt-6 border-t border-zinc-800/80">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest block mb-3">
            DETERMINISTIC EXECUTION PIPELINE
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 bg-zinc-900/60 border border-zinc-800 flex items-start gap-3">
              <div className="w-6 h-6 rounded-none bg-zinc-800 flex items-center justify-center font-bold text-zinc-300 flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-bold text-zinc-200">Definition of Done (DoD)</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Canonical SHA-256 criteria committed to Agreement PDA.
                </p>
              </div>
            </div>

            <div className="p-3 bg-zinc-900/60 border border-zinc-800 flex items-start gap-3">
              <div className="w-6 h-6 rounded-none bg-zinc-800 flex items-center justify-center font-bold text-zinc-300 flex-shrink-0">
                2
              </div>
              <div>
                <p className="font-bold text-zinc-200">Evidence Submission</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Worker logs pre-image hashes and permanent Arweave URIs.
                </p>
              </div>
            </div>

            <div className="p-3 bg-zinc-900/60 border border-zinc-800 flex items-start gap-3">
              <div className="w-6 h-6 rounded-none bg-zinc-800 flex items-center justify-center font-bold text-zinc-300 flex-shrink-0">
                3
              </div>
              <div>
                <p className="font-bold text-zinc-200">Verification Audit</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Sponsor or Oracle validates artifacts against criteria.
                </p>
              </div>
            </div>

            <div className="p-3 bg-zinc-900/60 border border-zinc-800 flex items-start gap-3">
              <div className="w-6 h-6 rounded-none bg-cyan-950 border border-cyan-800 flex items-center justify-center font-bold text-cyan-300 flex-shrink-0">
                4
              </div>
              <div>
                <p className="font-bold text-cyan-300">Deterministic Settlement</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Vault PDA executes USDC transfer to Worker ATA.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Protocol Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="p-4 bg-zinc-950 border border-zinc-800">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
            TOTAL COMMITTED (ESCROW)
          </span>
          <div className="text-lg sm:text-2xl font-bold text-zinc-100 mt-1">
            ${formatUsdc(totalCommittedUsdc)} <span className="text-xs text-zinc-400">USDC</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">Locked across program vaults</span>
        </div>

        <div className="p-4 bg-zinc-950 border border-zinc-800">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
            TOTAL SETTLED (PAID)
          </span>
          <div className="text-lg sm:text-2xl font-bold text-emerald-400 mt-1">
            ${formatUsdc(totalSettledUsdc)} <span className="text-xs text-zinc-400">USDC</span>
          </div>
          <span className="text-[10px] text-emerald-400/80 mt-1 block">Disbursed to worker ATAs</span>
        </div>

        <div className="p-4 bg-zinc-950 border border-zinc-800">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
            ACTIVE PIPELINES
          </span>
          <div className="text-lg sm:text-2xl font-bold text-cyan-400 mt-1">
            {activeCount}{' '}
            <span className="text-xs text-zinc-400 font-normal">Agreements</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">Work in execution</span>
        </div>

        <div className="p-4 bg-zinc-950 border border-zinc-800">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
            ON-CHAIN SETTLEMENT TOKEN
          </span>
          <div className="text-lg sm:text-2xl font-bold text-zinc-200 mt-1">
            USDC <span className="text-xs text-zinc-400 font-mono">(Devnet SPL)</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block truncate">Mint: 4zMMC9...ncDU</span>
        </div>
      </div>

      {/* Agreements Directory Section */}
      <div className="space-y-4 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              On-Chain Agreements & Milestones
            </h2>
            <p className="text-xs text-zinc-400">
              Deterministic Anchor accounts populated from Solana Devnet storage driver
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetSeed}
              disabled={isResetting}
              className="text-xs text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700"
              title="Reset sample agreements to initial state"
            >
              <RefreshCw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
              Reset Demo Data
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {['ALL', 'ACTIVE', 'FUNDED', 'COMPLETED', 'DRAFT'].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1 border transition-colors ${
                filter === st
                  ? 'bg-zinc-800 border-cyan-400 text-cyan-300 font-bold'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              {st} {st === 'ALL' ? `(${agreements.length})` : ''}
            </button>
          ))}
        </div>

        {/* Agreements List */}
        {isLoading ? (
          <div className="p-8 text-center border border-zinc-800 bg-zinc-950 text-zinc-400">
            <div className="animate-spin w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-2" />
            Loading on-chain account states...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center border border-zinc-800 bg-zinc-950 space-y-3">
            <p className="text-zinc-400 text-xs">No agreements match the selected filter.</p>
            <Link href="/agreements/new">
              <Button variant="primary" size="sm">
                Create First Agreement
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filtered.map((agreement) => {
              const releasedCount = agreement.milestones.filter(
                (m) => m.state === MilestoneState.RELEASED
              ).length;
              const pendingEvidenceCount = agreement.milestones.filter(
                (m) => m.state === MilestoneState.PENDING
              ).length;
              const awaitingVerificationCount = agreement.milestones.filter(
                (m) => m.state === MilestoneState.EVIDENCE_SUBMITTED
              ).length;

              return (
                <div
                  key={agreement.publicKey}
                  className="p-5 border border-zinc-800 bg-zinc-950/70 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left side details */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-zinc-100 hover:text-cyan-400">
                          <Link href={`/agreements/${agreement.publicKey}`}>
                            {agreement.title}
                          </Link>
                        </h3>
                        <AgreementStateBadge state={agreement.state} />
                      </div>

                      <p className="text-xs text-zinc-400 line-clamp-2">{agreement.description}</p>

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-zinc-400 pt-1">
                        <div>
                          <span>SPONSOR: </span>
                          <span className="text-zinc-300 font-mono">
                            {truncateAddress(agreement.sponsor, 4)}
                          </span>
                        </div>
                        <div>
                          <span>WORKER: </span>
                          <span className="text-zinc-300 font-mono">
                            {truncateAddress(agreement.worker, 4)}
                          </span>
                        </div>
                        <div>
                          <span>VAULT PDA: </span>
                          <span className="text-cyan-400 font-mono">
                            {truncateAddress(agreement.vaultPda, 4)}
                          </span>
                        </div>
                        <div>
                          <span>TERMS HASH: </span>
                          <span className="text-zinc-300 font-mono">
                            {truncateAddress(agreement.termsHash, 4)}
                          </span>
                        </div>
                      </div>

                      {/* Milestone Progress Summary */}
                      <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="text-zinc-400">
                          Milestones ({agreement.milestones.length}):
                        </span>
                        <span className="px-1.5 py-0.5 bg-emerald-950/80 border border-emerald-800 text-emerald-400">
                          {releasedCount} Settled
                        </span>
                        {awaitingVerificationCount > 0 && (
                          <span className="px-1.5 py-0.5 bg-amber-950/80 border border-amber-800 text-amber-400 animate-pulse">
                            {awaitingVerificationCount} In Verification
                          </span>
                        )}
                        {pendingEvidenceCount > 0 && (
                          <span className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400">
                            {pendingEvidenceCount} In Progress
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right side amount & CTA */}
                    <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 pt-3 lg:pt-0 border-zinc-800 gap-3">
                      <div className="text-left lg:text-right">
                        <div className="text-base sm:text-xl font-bold text-emerald-400">
                          ${formatUsdc(agreement.totalAmountUsdc)}
                        </div>
                        <span className="text-[10px] text-zinc-400 uppercase">
                          USDC Total Budget
                        </span>
                      </div>

                      <Link href={`/agreements/${agreement.publicKey}`}>
                        <Button variant="primary" size="sm">
                          Inspect Agreement
                          <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
