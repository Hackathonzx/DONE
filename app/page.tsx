'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAgreements } from '@/hooks/useAgreement';
import { useWallet } from '@/components/web3/WalletContext';
import { useTransactionExecution } from '@/hooks/useTransactionExecution';
import { AgreementState, MilestoneState, AgreementAccount, MilestoneAccount } from '@/types/protocol';
import { formatUsdc, truncateAddress } from '@/lib/solana';
import { AgreementStateBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CreateAgreementDrawer } from '@/components/protocol/CreateAgreementDrawer';
import { QuickActionModal, QuickActionType } from '@/components/protocol/QuickActionModal';
import { TxStateModal } from '@/components/web3/TxStateModal';
import {
  ShieldCheck,
  Coins,
  UploadCloud,
  FileCode,
  ArrowRight,
  PlusCircle,
  FileCheck2,
  Lock,
} from 'lucide-react';

export default function ProtocolOverviewPage() {
  const { data: agreements = [], isLoading } = useAgreements();
  const { connected, publicKeyString } = useWallet();
  const { txState, execute, reset: resetTx, isOpen: isTxOpen } = useTransactionExecution();

  const [activeTab, setActiveTab] = useState<'my' | 'all' | 'active' | 'completed'>('my');
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [drawerState, setDrawerState] = useState<{
    isOpen: boolean;
    type: QuickActionType;
    agreement: AgreementAccount | null;
    milestone?: MilestoneAccount;
  }>({
    isOpen: false,
    type: 'inspect',
    agreement: null,
  });

  const openDrawer = (
    type: QuickActionType,
    agreement: AgreementAccount,
    milestone?: MilestoneAccount
  ) => {
    setDrawerState({
      isOpen: true,
      type,
      agreement,
      milestone,
    });
  };

  const closeDrawer = () => {
    setDrawerState((prev) => ({ ...prev, isOpen: false }));
  };

  // Metrics across real on-chain agreements
  const totalValueLockedUsdc = agreements.reduce((sum, a) => {
    const released = a.milestones
      .filter((m) => m.state === MilestoneState.RELEASED)
      .reduce((s, m) => s + m.amountUsdc, 0);
    return sum + (a.state !== AgreementState.DRAFT && a.state !== AgreementState.CANCELLED ? a.totalAmountUsdc - released : 0);
  }, 0);

  const totalSettledUsdc = agreements.reduce((sum, a) => {
    return (
      sum +
      a.milestones
        .filter((m) => m.state === MilestoneState.RELEASED)
        .reduce((s, m) => s + m.amountUsdc, 0)
    );
  }, 0);

  const allMilestones = agreements.flatMap((a) => a.milestones);
  const totalMilestonesCount = allMilestones.length;

  const filteredAgreements = agreements.filter((agreement) => {
    if (activeTab === 'my') {
      if (!publicKeyString) return true;
      return agreement.sponsor === publicKeyString || agreement.worker === publicKeyString;
    }
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return agreement.state === AgreementState.ACTIVE || agreement.state === AgreementState.FUNDED;
    if (activeTab === 'completed') return agreement.state === AgreementState.COMPLETED;
    return true;
  });

  return (
    <div className="space-y-8 font-mono text-neutral-100 max-w-6xl mx-auto">
      <CreateAgreementDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        onSuccess={() => {}}
      />
      <TxStateModal state={txState} isOpen={isTxOpen} onClose={resetTx} />

      {drawerState.agreement && (
        <QuickActionModal
          isOpen={drawerState.isOpen}
          onClose={closeDrawer}
          actionType={drawerState.type}
          agreement={drawerState.agreement}
          milestone={drawerState.milestone}
          onExecute={execute}
        />
      )}

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-[#000000] border border-[#26262a] p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Program ID: 82MC...ZXYM (Solana Devnet)</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Programmable Settlement for Verifiable Work
            </h1>

            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              Non-custodial USDC-funded milestones on Solana. Verified Definition of Done commitments,
              designated on-chain attestations, and deterministic escrow payouts.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsCreateDrawerOpen(true)}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 font-bold"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Escrow Agreement</span>
              </Button>

              <Link
                href="/agreements"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#000000] hover:bg-neutral-900 border border-[#26262a] text-neutral-300 text-xs font-semibold transition-colors"
              >
                <span>Directory</span>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
              </Link>
            </div>
          </div>

          {/* Quick Metrics Badge */}
          <div className="grid grid-cols-2 gap-3 min-w-[280px]">
            <div className="p-4 rounded-2xl bg-neutral-950/60 border border-[#26262a]">
              <span className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">
                Active TVL
              </span>
              <div className="text-xl font-black text-violet-400">
                ${formatUsdc(totalValueLockedUsdc)}
              </div>
              <span className="text-[10px] text-neutral-400">Devnet USDC</span>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-950/60 border border-[#26262a]">
              <span className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">
                Settled Payouts
              </span>
              <div className="text-xl font-black text-emerald-400">
                ${formatUsdc(totalSettledUsdc)}
              </div>
              <span className="text-[10px] text-neutral-400">Released to Workers</span>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-950/60 border border-[#26262a]">
              <span className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">
                Total Milestones
              </span>
              <div className="text-xl font-black text-white">
                {totalMilestonesCount}
              </div>
              <span className="text-[10px] text-neutral-400">On-Chain Accounts</span>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-950/60 border border-[#26262a]">
              <span className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">
                Network State
              </span>
              <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Devnet Live
              </div>
              <span className="text-[10px] text-neutral-400">Confirmed RPC</span>
            </div>
          </div>
        </div>
      </div>

      {/* 7-Step Workflow Architecture */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
          7-Step On-Chain Execution Pipeline
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-4 bg-[#000000] border border-[#26262a] rounded-2xl space-y-1.5">
            <div className="text-violet-400 font-bold">1. Sponsor Creates</div>
            <p className="text-[11px] text-neutral-400">
              Sponsor initializes Agreement & Milestones with committed Definition of Done hashes.
            </p>
          </div>
          <div className="p-4 bg-[#000000] border border-[#26262a] rounded-2xl space-y-1.5">
            <div className="text-violet-400 font-bold">2. Worker Accepts</div>
            <p className="text-[11px] text-neutral-400">
              Assigned worker signs to lock allocations and enable deposit funding.
            </p>
          </div>
          <div className="p-4 bg-[#000000] border border-[#26262a] rounded-2xl space-y-1.5">
            <div className="text-violet-400 font-bold">3. Sponsor Funds</div>
            <p className="text-[11px] text-neutral-400">
              Devnet USDC transfers from Sponsor into program Escrow PDA vault.
            </p>
          </div>
          <div className="p-4 bg-[#000000] border border-[#26262a] rounded-2xl space-y-1.5">
            <div className="text-violet-400 font-bold">4. Worker Evidence</div>
            <p className="text-[11px] text-neutral-400">
              Worker submits 32-byte cryptographic evidence hash on-chain.
            </p>
          </div>
          <div className="p-4 bg-[#000000] border border-[#26262a] rounded-2xl space-y-1.5">
            <div className="text-violet-400 font-bold">5. Verifier Attests</div>
            <p className="text-[11px] text-neutral-400">
              Designated verifier signs verification instruction or issues rejection hash.
            </p>
          </div>
          <div className="p-4 bg-[#000000] border border-[#26262a] rounded-2xl space-y-1.5">
            <div className="text-violet-400 font-bold">6. Escrow Release</div>
            <p className="text-[11px] text-neutral-400">
              Verified funds disburse directly to worker USDC account.
            </p>
          </div>
          <div className="p-4 bg-[#000000] border border-[#26262a] rounded-2xl space-y-1.5 sm:col-span-2">
            <div className="text-violet-400 font-bold">7. Mutual Cancellation</div>
            <p className="text-[11px] text-neutral-400">
              Requires both sponsor and worker signatures; refunds remaining escrow back to Sponsor.
            </p>
          </div>
        </div>
      </div>

      {/* Agreements Directory Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#26262a]">
          <div>
            <h2 className="text-base font-bold uppercase tracking-wide text-white">
              Live Agreements
            </h2>
            <p className="text-xs text-neutral-400">
              Real accounts decoded directly from deployed program 82MC...ZXYM
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-[#000000] border border-[#26262a] p-1 rounded-xl text-xs">
            {connected && (
              <button
                onClick={() => setActiveTab('my')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeTab === 'my'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                My Agreements
              </button>
            )}
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              All Agreements
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'active'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'completed'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Agreements Cards */}
        {isLoading ? (
          <div className="p-12 text-center bg-[#000000] border border-[#26262a] rounded-2xl text-xs text-neutral-400 space-y-2">
            <div>Fetching live program accounts from Solana Devnet RPC...</div>
          </div>
        ) : filteredAgreements.length === 0 ? (
          <div className="p-12 text-center bg-[#000000] border border-[#26262a] rounded-2xl space-y-3 text-xs">
            <FileCode className="w-10 h-10 mx-auto text-neutral-600" />
            <h3 className="text-sm font-bold text-white">No Active Agreements Found</h3>
            <p className="text-neutral-400 max-w-sm mx-auto">
              {activeTab === 'my'
                ? "You haven't created or been assigned to any escrow agreements with this wallet yet."
                : 'No agreements currently match this filter on Solana Devnet.'}
            </p>
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateDrawerOpen(true)}
                className="bg-violet-600 hover:bg-violet-500 font-bold"
              >
                <PlusCircle className="w-4 h-4 mr-1.5" /> Create Escrow Agreement
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAgreements.map((agreement) => {
              const nextMilestone =
                agreement.milestones.find((m) => m.state !== MilestoneState.RELEASED) ||
                agreement.milestones[agreement.milestones.length - 1];

              const releasedCount = agreement.milestones.filter(
                (m) => m.state === MilestoneState.RELEASED
              ).length;

              const progressPct =
                agreement.milestones.length > 0
                  ? Math.round((releasedCount / agreement.milestones.length) * 100)
                  : 0;

              return (
                <div
                  key={agreement.publicKey}
                  className="p-5 bg-[#000000] hover:bg-neutral-950 border border-[#26262a] hover:border-violet-500/40 rounded-2xl transition-all space-y-4"
                >
                  {/* Top Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <AgreementStateBadge state={agreement.state} />
                        <Link
                          href={`/agreements/${agreement.publicKey}`}
                          className="text-base font-bold text-white hover:text-violet-300 transition-colors"
                        >
                          {agreement.title}
                        </Link>
                      </div>
                      <div className="text-xs text-neutral-400 flex items-center gap-3">
                        <span>Worker: {truncateAddress(agreement.worker, 4)}</span>
                        <span>•</span>
                        <span>Vault: {truncateAddress(agreement.vaultPda, 4)}</span>
                        <span>•</span>
                        <span className={agreement.workerAccepted ? 'text-emerald-400' : 'text-amber-400'}>
                          {agreement.workerAccepted ? 'Accepted ✓' : 'Awaiting Worker Acceptance'}
                        </span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-lg font-black text-violet-400">
                        ${formatUsdc(agreement.totalAmountUsdc)} USDC
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        {releasedCount} / {agreement.milestones.length} Milestones Settled ({progressPct}%)
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  {/* Milestone Pills & Quick Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#26262a]/60">
                    <div className="flex flex-wrap gap-1.5">
                      {agreement.milestones.map((m, idx) => (
                        <button
                          key={idx}
                          onClick={() => openDrawer('inspect', agreement, m)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                            m.state === MilestoneState.RELEASED
                              ? 'bg-emerald-950/30 text-emerald-300 border-emerald-500/30'
                              : m.state === MilestoneState.VERIFIED
                              ? 'bg-violet-950/30 text-violet-300 border-violet-500/30 font-bold'
                              : m.state === MilestoneState.EVIDENCE_SUBMITTED
                              ? 'bg-amber-950/30 text-amber-300 border-amber-500/30'
                              : 'bg-[#000000] text-neutral-400 border-[#26262a]'
                          }`}
                        >
                          #{idx + 1}: ${formatUsdc(m.amountUsdc)}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      {agreement.state === AgreementState.DRAFT && !agreement.workerAccepted && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openDrawer('accept', agreement)}
                          className="text-xs text-violet-300 border-violet-500/30"
                        >
                          <FileCheck2 className="w-3.5 h-3.5 mr-1" />
                          Worker Accept
                        </Button>
                      )}

                      {agreement.state === AgreementState.DRAFT && agreement.workerAccepted && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => openDrawer('fund', agreement)}
                          className="text-xs bg-emerald-600 hover:bg-emerald-500"
                        >
                          <Lock className="w-3.5 h-3.5 mr-1" />
                          Fund Escrow
                        </Button>
                      )}

                      {nextMilestone &&
                        nextMilestone.state === MilestoneState.PENDING &&
                        (agreement.state === AgreementState.FUNDED || agreement.state === AgreementState.ACTIVE) && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openDrawer('submit_evidence', agreement, nextMilestone)}
                            className="text-xs"
                          >
                            <UploadCloud className="w-3.5 h-3.5 mr-1 text-violet-400" />
                            Submit Proof
                          </Button>
                        )}

                      {nextMilestone && nextMilestone.state === MilestoneState.EVIDENCE_SUBMITTED && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => openDrawer('verify', agreement, nextMilestone)}
                          className="text-xs"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                          Verify
                        </Button>
                      )}

                      {nextMilestone && nextMilestone.state === MilestoneState.VERIFIED && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => openDrawer('release', agreement, nextMilestone)}
                          className="text-xs bg-emerald-600 hover:bg-emerald-500"
                        >
                          <Coins className="w-3.5 h-3.5 mr-1" />
                          Release Funds
                        </Button>
                      )}

                      <Link
                        href={`/agreements/${agreement.publicKey}`}
                        className="px-3 py-1.5 rounded-xl bg-[#000000] hover:bg-neutral-900 border border-[#26262a] text-neutral-300 text-xs font-semibold inline-flex items-center gap-1"
                      >
                        Details <ArrowRight className="w-3 h-3" />
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
