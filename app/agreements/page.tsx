'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAgreements } from '@/hooks/useAgreement';
import { useTransactionExecution } from '@/hooks/useTransactionExecution';
import { AgreementState, MilestoneState, AgreementAccount, MilestoneAccount } from '@/types/protocol';
import { formatUsdc, truncateAddress } from '@/lib/solana';
import { AgreementStateBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DoneLogo } from '@/components/protocol/DoneLogo';
import { CreateAgreementDrawer } from '@/components/protocol/CreateAgreementDrawer';
import { QuickActionModal, QuickActionType } from '@/components/protocol/QuickActionModal';
import { TxStateModal } from '@/components/web3/TxStateModal';
import {
  PlusCircle,
  Search,
  ArrowRight,
  UploadCloud,
  ShieldCheck,
  Coins,
  Lock,
  FileCheck2,
} from 'lucide-react';

export default function AgreementsDirectoryPage() {
  const { data: agreements = [], isLoading } = useAgreements();
  const { txState, execute, reset: resetTx, isOpen: isTxOpen } = useTransactionExecution();

  const [activeFilter, setActiveFilter] = useState<'ALL' | AgreementState>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredAgreements = agreements.filter((a) => {
    const matchesFilter = activeFilter === 'ALL' || a.state === activeFilter;
    const matchesSearch =
      searchQuery === '' ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.sponsor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.worker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.publicKey.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filterOptions = [
    { id: 'ALL', label: 'All Agreements' },
    { id: AgreementState.DRAFT, label: 'Draft' },
    { id: AgreementState.FUNDED, label: 'Funded' },
    { id: AgreementState.ACTIVE, label: 'Active' },
    { id: AgreementState.COMPLETED, label: 'Completed' },
  ];

  return (
    <div className="space-y-6 font-mono text-neutral-100 max-w-6xl mx-auto">
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#26262a] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
            Devnet Escrows
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Live Solana Devnet agreements with real account states and verified milestone payouts.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsCreateDrawerOpen(true)}
          className="inline-flex items-center gap-2 self-start sm:self-auto bg-violet-600 hover:bg-violet-500"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Agreement</span>
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#000000] p-2 rounded-2xl border border-[#26262a]">
        <div className="flex flex-wrap gap-1">
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setActiveFilter(opt.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === opt.id
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search address or title..."
            className="w-full sm:w-64 bg-[#000000] border border-[#26262a] rounded-xl pl-9 pr-3.5 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="p-12 text-center bg-[#000000] border border-[#26262a] rounded-3xl space-y-3">
          <DoneLogo className="w-10 h-10 mx-auto animate-pulse" />
          <p className="text-xs text-neutral-400">Loading on-chain program accounts...</p>
        </div>
      ) : agreements.length === 0 ? (
        <div className="p-10 text-center bg-[#000000] border border-[#26262a] rounded-3xl space-y-4">
          <DoneLogo className="w-14 h-14 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No Escrow Agreements</h3>
            <p className="text-xs text-neutral-400">
              Create an escrow agreement on Solana Devnet to get started.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsCreateDrawerOpen(true)}
            className="inline-flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" /> Create Agreement
          </Button>
        </div>
      ) : filteredAgreements.length === 0 ? (
        <div className="p-8 text-center bg-[#000000] border border-[#26262a] rounded-2xl text-xs text-neutral-400">
          No agreements matching this filter.
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
                className="p-5 bg-[#000000] hover:bg-neutral-950 border border-[#26262a] hover:border-violet-500/40 rounded-2xl transition-all space-y-3"
              >
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
                      <span>{agreement.milestones.length} Milestones</span>
                      <span>•</span>
                      <span className={agreement.workerAccepted ? 'text-emerald-400' : 'text-amber-400'}>
                        {agreement.workerAccepted ? 'Accepted ✓' : 'Awaiting Worker'}
                      </span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-lg font-black text-violet-400">
                      ${formatUsdc(agreement.totalAmountUsdc)} USDC
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      {releasedCount} / {agreement.milestones.length} Settled
                    </div>
                  </div>
                </div>

                <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

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
  );
}
