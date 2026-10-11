'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAgreements } from '@/hooks/useAgreement';
import { useWallet } from '@/components/web3/WalletContext';
import { useTransactionExecution } from '@/hooks/useTransactionExecution';
import { AgreementState, MilestoneState, AgreementAccount, MilestoneAccount } from '@/types/protocol';
import { formatUsdc, truncateAddress } from '@/lib/solana';
import { AgreementStateBadge, MilestoneStateBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TxStateModal } from '@/components/web3/TxStateModal';
import { QuickActionModal, QuickActionType } from '@/components/protocol/QuickActionModal';
import { DoneLogo } from '@/components/protocol/DoneLogo';
import {
  Briefcase,
  Coins,
  UploadCloud,
  ArrowRight,
  Clock,
  FileCheck2,
} from 'lucide-react';

export default function WorkerDashboardPage() {
  const { publicKeyString } = useWallet();
  const { data: allAgreements = [], isLoading } = useAgreements();
  const { txState, execute, reset: resetTx, isOpen: isTxOpen } = useTransactionExecution();

  // Filter agreements where current wallet is worker or show all
  const workerAgreements = publicKeyString
    ? allAgreements.filter((a) => a.worker === publicKeyString)
    : allAgreements;
  const agreements = workerAgreements.length > 0 ? workerAgreements : allAgreements;

  const [drawerState, setDrawerState] = useState<{
    isOpen: boolean;
    type: QuickActionType;
    agreement: AgreementAccount | null;
    milestone?: MilestoneAccount;
  }>({
    isOpen: false,
    type: 'submit_evidence',
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

  // Metrics
  const totalSettledEarnings = agreements.reduce((sum, a) => {
    return (
      sum +
      a.milestones
        .filter((m) => m.state === MilestoneState.RELEASED)
        .reduce((s, m) => s + m.amountUsdc, 0)
    );
  }, 0);

  const totalClaimableEarnings = agreements.reduce((sum, a) => {
    return (
      sum +
      a.milestones
        .filter((m) => m.state === MilestoneState.VERIFIED)
        .reduce((s, m) => s + m.amountUsdc, 0)
    );
  }, 0);

  const pendingDeliverables = agreements.flatMap((a) =>
    a.milestones
      .filter(
        (m) =>
          m.state === MilestoneState.PENDING &&
          (a.state === AgreementState.FUNDED || a.state === AgreementState.ACTIVE)
      )
      .map((m) => ({ agreement: a, milestone: m }))
  );

  const pendingAcceptance = agreements.filter(
    (a) => a.state === AgreementState.DRAFT && !a.workerAccepted
  );

  return (
    <div className="space-y-6 font-mono text-neutral-100 max-w-6xl mx-auto">
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
        <div className="flex items-center gap-3">
          <DoneLogo className="w-8 h-8" />
          <div>
            <div className="flex items-center gap-2 text-xs text-violet-400 mb-0.5">
              <Briefcase className="w-3.5 h-3.5" />
              <span className="font-bold tracking-wider">BUILDER CONSOLE</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Worker Hub</h1>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-[#000000] border border-[#26262a] rounded-2xl space-y-1">
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-semibold">
            Settled Payouts
          </span>
          <div className="text-2xl font-black text-emerald-400">
            ${formatUsdc(totalSettledEarnings)} <span className="text-xs text-neutral-400 font-normal">USDC</span>
          </div>
        </div>
        <div className="p-4 bg-[#000000] border border-[#26262a] rounded-2xl space-y-1">
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-semibold">
            Claimable Unlocked
          </span>
          <div className="text-2xl font-black text-violet-400">
            ${formatUsdc(totalClaimableEarnings)} <span className="text-xs text-neutral-400 font-normal">USDC</span>
          </div>
        </div>
        <div className="p-4 bg-[#000000] border border-[#26262a] rounded-2xl space-y-1">
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-semibold">
            Active Deliverables
          </span>
          <div className="text-2xl font-black text-amber-400">
            {pendingDeliverables.length}
          </div>
        </div>
      </div>

      {/* Pending Worker Acceptance Queue */}
      {pendingAcceptance.length > 0 && (
        <div className="p-5 bg-violet-950/20 border border-violet-500/40 rounded-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-[#26262a] pb-2 text-xs">
            <span className="font-bold text-violet-300 uppercase tracking-wider flex items-center gap-2">
              <FileCheck2 className="w-3.5 h-3.5 text-violet-400" />
              Agreements Requiring Your Acceptance ({pendingAcceptance.length})
            </span>
          </div>
          <div className="space-y-2">
            {pendingAcceptance.map((agreement) => (
              <div
                key={agreement.publicKey}
                className="p-3.5 bg-[#000000] border border-[#26262a] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-white">{agreement.title}</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    Sponsor: {truncateAddress(agreement.sponsor, 4)} • {agreement.milestones.length} Milestones
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-400 text-xs">
                    ${formatUsdc(agreement.totalAmountUsdc)} USDC
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openDrawer('accept', agreement)}
                    className="text-xs bg-violet-600 hover:bg-violet-500 font-bold"
                  >
                    <FileCheck2 className="w-3.5 h-3.5 mr-1" />
                    Accept On-Chain
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actionable Deliverables Queue */}
      {pendingDeliverables.length > 0 && (
        <div className="p-5 bg-[#000000] border border-[#26262a] rounded-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-[#26262a] pb-2 text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-violet-400" />
              Deliverables Ready For Proof Submission ({pendingDeliverables.length})
            </span>
          </div>
          <div className="space-y-2">
            {pendingDeliverables.map(({ agreement, milestone }) => (
              <div
                key={milestone.publicKey}
                className="p-3.5 bg-[#000000] border border-[#26262a] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-white">{milestone.title}</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    {agreement.title} • Sponsor: {truncateAddress(agreement.sponsor, 4)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-violet-400 text-xs">
                    ${formatUsdc(milestone.amountUsdc)} USDC
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openDrawer('submit_evidence', agreement, milestone)}
                    className="text-xs"
                  >
                    <UploadCloud className="w-3.5 h-3.5 mr-1" />
                    Submit Deliverable
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Worker Agreements */}
      <div className="space-y-3">
        <h3 className="text-xs uppercase font-bold text-neutral-400 tracking-wider">
          Assigned Escrow Agreements ({agreements.length})
        </h3>
        {isLoading ? (
          <div className="p-8 text-center bg-[#000000] border border-[#26262a] rounded-2xl text-xs text-neutral-400">
            Loading worker agreements from Devnet...
          </div>
        ) : agreements.length === 0 ? (
          <div className="p-8 text-center bg-[#000000] border border-[#26262a] rounded-2xl space-y-3">
            <DoneLogo className="w-12 h-12 mx-auto" />
            <p className="text-xs text-neutral-400">No agreements assigned to this address yet.</p>
          </div>
        ) : (
          agreements.map((agreement) => (
            <div
              key={agreement.publicKey}
              className="p-4 bg-[#000000] border border-[#26262a] hover:border-violet-500/40 rounded-2xl transition-all space-y-3 text-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AgreementStateBadge state={agreement.state} />
                  <Link
                    href={`/agreements/${agreement.publicKey}`}
                    className="font-bold text-white hover:text-violet-300 text-sm"
                  >
                    {agreement.title}
                  </Link>
                </div>
                <div className="font-bold text-violet-400 text-sm">
                  ${formatUsdc(agreement.totalAmountUsdc)} USDC
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#26262a]/60 text-neutral-400">
                <span>Sponsor: {truncateAddress(agreement.sponsor, 4)}</span>
                <Link
                  href={`/agreements/${agreement.publicKey}`}
                  className="text-violet-400 hover:text-violet-300 flex items-center gap-1 font-semibold"
                >
                  View Details <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
