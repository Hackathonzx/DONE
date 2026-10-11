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
  Wallet,
} from 'lucide-react';

export default function SponsorDashboardPage() {
  const { connected, publicKeyString } = useWallet();
  const { data: allAgreements = [], isLoading } = useAgreements();
  const { txState, execute, reset: resetTx, isOpen: isTxOpen } = useTransactionExecution();
  const queryClient = useQueryClient();
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  // Strict filter: only agreements where connected wallet is Sponsor
  const agreements = publicKeyString
    ? allAgreements.filter((a) => a.sponsor === publicKeyString)
    : [];

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
    return sum + (a.state !== AgreementState.DRAFT && a.state !== AgreementState.CANCELLED ? a.totalAmountUsdc - released : 0);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#26262a]">
        <div>
          <div className="flex items-center gap-2">
            <DoneLogo className="w-6 h-6" />
            <h1 className="text-xl font-bold uppercase tracking-wide text-white">
              Sponsor Operations Console
            </h1>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Manage your USDC-funded milestone escrows and attestations on Solana Devnet
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateDrawerOpen(true)}
          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 font-bold"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Agreement</span>
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-[#000000] border border-[#26262a] rounded-2xl">
          <span className="text-[10px] text-neutral-400 uppercase tracking-widest block font-semibold mb-1">
            Escrow Locked (Active)
          </span>
          <div className="text-2xl font-black text-violet-400">
            ${formatUsdc(totalEscrowLocked)} <span className="text-xs text-neutral-500 font-normal">USDC</span>
          </div>
        </div>

        <div className="p-4 bg-[#000000] border border-[#26262a] rounded-2xl">
          <span className="text-[10px] text-neutral-400 uppercase tracking-widest block font-semibold mb-1">
            Settled & Disbursed
          </span>
          <div className="text-2xl font-black text-emerald-400">
            ${formatUsdc(totalSettledPaid)} <span className="text-xs text-neutral-500 font-normal">USDC</span>
          </div>
        </div>

        <div className="p-4 bg-[#000000] border border-[#26262a] rounded-2xl">
          <span className="text-[10px] text-neutral-400 uppercase tracking-widest block font-semibold mb-1">
            Pending Evidence Audits
          </span>
          <div className="text-2xl font-black text-amber-400">
            {pendingVerifications.length}
          </div>
        </div>
      </div>

      {/* Action Required: Pending Verification Audits */}
      {pendingVerifications.length > 0 && (
        <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
              <AlertCircle className="w-4 h-4" />
              <span>Evidence Submitted Awaiting Attestation ({pendingVerifications.length})</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {pendingVerifications.map(({ agreement, milestone }) => (
              <div
                key={milestone.publicKey}
                className="p-3 bg-[#000000] border border-[#26262a] rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-white block">
                    #{milestone.index + 1}: {milestone.title}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Agreement: {truncateAddress(agreement.publicKey, 4)}
                  </span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => openDrawer('verify', agreement, milestone)}
                  className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-bold"
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  Review & Verify
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agreements List */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
          Your Escrow Agreements ({agreements.length})
        </h2>

        {!connected ? (
          <div className="p-12 text-center bg-[#000000] border border-[#26262a] rounded-2xl space-y-3 text-xs">
            <Wallet className="w-10 h-10 mx-auto text-neutral-600" />
            <h3 className="text-sm font-bold text-white">Connect Solana Wallet</h3>
            <p className="text-neutral-400 max-w-sm mx-auto">
              Connect your Phantom or Solflare wallet to view and manage agreements created by your address.
            </p>
          </div>
        ) : isLoading ? (
          <div className="p-8 text-center bg-[#000000] border border-[#26262a] rounded-2xl text-xs text-neutral-400">
            Fetching on-chain accounts from Solana Devnet...
          </div>
        ) : agreements.length === 0 ? (
          <div className="p-12 text-center bg-[#000000] border border-[#26262a] rounded-2xl space-y-3 text-xs">
            <DoneLogo className="w-10 h-10 mx-auto opacity-50" />
            <h3 className="text-sm font-bold text-white">No Sponsor Agreements Found</h3>
            <p className="text-neutral-400 max-w-sm mx-auto">
              You haven&apos;t created any escrow agreements with this wallet yet. Click below to create your first agreement.
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
          agreements.map((agreement) => (
            <div
              key={agreement.publicKey}
              className="p-5 bg-[#000000] border border-[#26262a] hover:border-violet-500/40 rounded-2xl space-y-3 transition-colors"
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
                    <span>PDA: {truncateAddress(agreement.publicKey, 4)}</span>
                    <span>•</span>
                    <span className={agreement.workerAccepted ? 'text-emerald-400' : 'text-amber-400'}>
                      {agreement.workerAccepted ? 'Accepted ✓' : 'Awaiting Worker Acceptance'}
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-base font-black text-violet-400">
                    ${formatUsdc(agreement.totalAmountUsdc)} USDC
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    {agreement.milestones.length} Milestones
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#26262a]/60">
                <div className="flex gap-1.5 flex-wrap">
                  {agreement.milestones.map((m, idx) => (
                    <button
                      key={idx}
                      onClick={() => openDrawer('inspect', agreement, m)}
                      className="px-2 py-0.5 rounded-lg text-[11px] border bg-[#000000] border-[#26262a] text-neutral-300 hover:border-violet-500/40"
                    >
                      #{idx + 1}: ${formatUsdc(m.amountUsdc)}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {agreement.state === AgreementState.DRAFT && agreement.workerAccepted && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openDrawer('fund', agreement)}
                      className="text-xs bg-emerald-600 hover:bg-emerald-500 font-bold"
                    >
                      <Lock className="w-3.5 h-3.5 mr-1" /> Fund Escrow
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
          ))
        )}
      </div>
    </div>
  );
}
