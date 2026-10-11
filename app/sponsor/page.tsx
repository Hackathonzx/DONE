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
import { DoneLogo } from '@/components/protocol/DoneLogo';
import { useQueryClient } from '@tanstack/react-query';
import { AGREEMENTS_QUERY_KEY } from '@/hooks/useAgreement';
import {
  ShieldCheck,
  PlusCircle,
  AlertCircle,
  ArrowRight,
  Lock,
} from 'lucide-react';

export default function SponsorDashboardPage() {
  const { publicKeyString } = useWallet();
  const { data: allAgreements = [], isLoading } = useAgreements();
  const { txState, execute, reset: resetTx, isOpen: isTxOpen } = useTransactionExecution();
  const queryClient = useQueryClient();

  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  // Filter agreements where current wallet is sponsor, or show all if none
  const sponsorAgreements = publicKeyString
    ? allAgreements.filter((a) => a.sponsor === publicKeyString)
    : allAgreements;
  const agreements = sponsorAgreements.length > 0 ? sponsorAgreements : allAgreements;

  const [drawerState, setDrawerState] = useState<{
    isOpen: boolean;
    type: QuickActionType;
    agreement: AgreementAccount | null;
    milestone?: MilestoneAccount;
  }>({
    isOpen: false,
    type: 'verify',
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
  const totalEscrowLocked = agreements.reduce((sum, a) => {
    const released = a.milestones
      .filter((m) => m.state === MilestoneState.RELEASED)
      .reduce((s, m) => s + m.amountUsdc, 0);
    return sum + (a.state !== AgreementState.DRAFT ? a.totalAmountUsdc - released : 0);
  }, 0);

  const totalSettledPaid = agreements.reduce((sum, a) => {
    return (
      sum +
      a.milestones
        .filter((m) => m.state === MilestoneState.RELEASED)
        .reduce((s, m) => s + m.amountUsdc, 0)
    );
  }, 0);

  const pendingVerifications = agreements.flatMap((a) =>
    a.milestones
      .filter((m) => m.state === MilestoneState.EVIDENCE_SUBMITTED)
      .map((m) => ({ agreement: a, milestone: m }))
  );

  return (
    <div className="space-y-6 font-mono text-neutral-100 max-w-6xl mx-auto">
      <CreateAgreementDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        onSuccess={async () => {
          await queryClient.invalidateQueries({ queryKey: AGREEMENTS_QUERY_KEY });
        }}
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
        <div className="flex items-center gap-3">
          <DoneLogo className="w-8 h-8" />
          <div>
            <div className="flex items-center gap-2 text-xs text-violet-400 mb-0.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="font-bold tracking-wider">CAPITAL SPONSOR</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Sponsor Hub</h1>
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateDrawerOpen(true)}
          className="flex items-center gap-1.5 self-start sm:self-auto bg-violet-600 hover:bg-violet-500"
        >
          <PlusCircle className="w-4 h-4" />
          New Escrow
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-[#000000] border border-[#26262a] rounded-2xl space-y-1">
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-semibold">
            Locked in Escrow
          </span>
          <div className="text-2xl font-black text-white">
            ${formatUsdc(totalEscrowLocked)} <span className="text-xs text-neutral-400 font-normal">USDC</span>
          </div>
        </div>
        <div className="p-4 bg-[#000000] border border-[#26262a] rounded-2xl space-y-1">
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-semibold">
            Total Settled
          </span>
          <div className="text-2xl font-black text-emerald-400">
            ${formatUsdc(totalSettledPaid)} <span className="text-xs text-neutral-400 font-normal">USDC</span>
          </div>
        </div>
        <div className="p-4 bg-[#000000] border border-[#26262a] rounded-2xl space-y-1">
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-semibold">
            Pending Audits
          </span>
          <div className="text-2xl font-black text-amber-400">
            {pendingVerifications.length}
          </div>
        </div>
      </div>

      {/* Review Queue */}
      {pendingVerifications.length > 0 && (
        <div className="p-5 bg-[#000000] border border-amber-500/30 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-amber-400 border-b border-[#26262a] pb-2">
            <AlertCircle className="w-4 h-4" />
            <h3 className="font-bold text-xs uppercase tracking-wider">
              Deliverables Ready for Verification ({pendingVerifications.length})
            </h3>
          </div>
          <div className="space-y-2">
            {pendingVerifications.map(({ agreement, milestone }) => (
              <div
                key={milestone.publicKey}
                className="p-3.5 bg-[#000000] border border-[#26262a] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-white">{milestone.title}</div>
                  <div className="text-neutral-400 text-[11px] mt-0.5">
                    {agreement.title} • Worker: {truncateAddress(agreement.worker, 4)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-violet-400 text-xs">
                    ${formatUsdc(milestone.amountUsdc)} USDC
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openDrawer('verify', agreement, milestone)}
                    className="text-xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                    Verify
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sponsored Agreements List */}
      <div className="space-y-3">
        <h3 className="text-xs uppercase font-bold text-neutral-400 tracking-wider">
          Sponsored Escrows ({agreements.length})
        </h3>
        {isLoading ? (
          <div className="p-8 text-center bg-[#000000] border border-[#26262a] rounded-2xl text-xs text-neutral-400">
            Loading sponsored agreements from Devnet...
          </div>
        ) : agreements.length === 0 ? (
          <div className="p-8 text-center bg-[#000000] border border-[#26262a] rounded-2xl space-y-3">
            <DoneLogo className="w-12 h-12 mx-auto" />
            <p className="text-xs text-neutral-400">No sponsored agreements yet.</p>
            <Button variant="primary" onClick={() => setIsCreateDrawerOpen(true)}>
              <PlusCircle className="w-4 h-4 mr-1.5" /> Create Agreement
            </Button>
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
                <span className="flex items-center gap-2">
                  <span>Worker: {truncateAddress(agreement.worker, 4)}</span>
                  <span>•</span>
                  <span className={agreement.workerAccepted ? 'text-emerald-400' : 'text-amber-400'}>
                    {agreement.workerAccepted ? 'Accepted ✓' : 'Awaiting Acceptance'}
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  {agreement.state === AgreementState.DRAFT && agreement.workerAccepted && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openDrawer('fund', agreement)}
                      className="text-xs bg-emerald-600 hover:bg-emerald-500"
                    >
                      <Lock className="w-3.5 h-3.5 mr-1" /> Fund Escrow
                    </Button>
                  )}
                  <Link
                    href={`/agreements/${agreement.publicKey}`}
                    className="text-violet-400 hover:text-violet-300 flex items-center gap-1 font-semibold"
                  >
                    Manage <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
