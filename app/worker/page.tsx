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
import { QuickActionModal, QuickActionType } from '@/components/protocol/QuickActionModal';
import { TxStateModal } from '@/components/web3/TxStateModal';
import { DoneLogo } from '@/components/protocol/DoneLogo';
import {
  Coins,
  UploadCloud,
  FileCheck2,
  ArrowRight,
  Wallet,
} from 'lucide-react';

export default function WorkerDashboardPage() {
  const { connected, publicKeyString } = useWallet();
  const { data: allAgreements = [], isLoading } = useAgreements();
  const { txState, execute, reset: resetTx, isOpen: isTxOpen } = useTransactionExecution();

  // Strict filter: only agreements where connected wallet is Worker
  const agreements = publicKeyString
    ? allAgreements.filter((a) => a.worker === publicKeyString)
    : [];

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
  const totalEarnedReleased = agreements.reduce((sum, a) => {
    return (
      sum +
      a.milestones
        .filter((m) => m.state === MilestoneState.RELEASED)
        .reduce((s, m) => s + m.amountUsdc, 0)
    );
  }, 0);

  const pendingAcceptance = agreements.filter(
    (a) => a.state === AgreementState.DRAFT && !a.workerAccepted
  );

  const activeMilestones = agreements.flatMap((a) =>
    a.milestones
      .filter((m) => m.state === MilestoneState.PENDING && (a.state === AgreementState.FUNDED || a.state === AgreementState.ACTIVE))
      .map((m) => ({ agreement: a, milestone: m }))
  );

  const claimableMilestones = agreements.flatMap((a) =>
    a.milestones
      .filter((m) => m.state === MilestoneState.VERIFIED)
      .map((m) => ({ agreement: a, milestone: m }))
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#26262a]">
        <div>
          <div className="flex items-center gap-2">
            <DoneLogo className="w-6 h-6" />
            <h1 className="text-xl font-bold uppercase tracking-wide text-white">
              Worker Deliverables Console
            </h1>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Accept agreements, submit verifiable work evidence, and claim USDC releases on Solana Devnet
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-[#000000] border border-[#26262a] rounded-2xl">
          <span className="text-[10px] text-neutral-400 uppercase tracking-widest block font-semibold mb-1">
            Settled Earnings (Paid)
          </span>
          <div className="text-2xl font-black text-emerald-400">
            ${formatUsdc(totalEarnedReleased)} <span className="text-xs text-neutral-500 font-normal">USDC</span>
          </div>
        </div>

        <div className="p-4 bg-[#000000] border border-[#26262a] rounded-2xl">
          <span className="text-[10px] text-neutral-400 uppercase tracking-widest block font-semibold mb-1">
            Ready to Claim
          </span>
          <div className="text-2xl font-black text-violet-400">
            {claimableMilestones.length}
          </div>
        </div>

        <div className="p-4 bg-[#000000] border border-[#26262a] rounded-2xl">
          <span className="text-[10px] text-neutral-400 uppercase tracking-widest block font-semibold mb-1">
            In-Flight Milestones
          </span>
          <div className="text-2xl font-black text-amber-400">
            {activeMilestones.length}
          </div>
        </div>
      </div>

      {/* Pending Worker Acceptance Banner */}
      {pendingAcceptance.length > 0 && (
        <div className="p-4 bg-violet-950/20 border border-violet-500/30 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-violet-400 text-xs font-bold">
            <FileCheck2 className="w-4 h-4" />
            <span>Agreements Awaiting Your On-Chain Acceptance ({pendingAcceptance.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {pendingAcceptance.map((a) => (
              <div
                key={a.publicKey}
                className="p-3 bg-[#000000] border border-[#26262a] rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-white block truncate">{a.title}</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    ${formatUsdc(a.totalAmountUsdc)} USDC
                  </span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => openDrawer('accept', a)}
                  className="text-xs bg-violet-600 hover:bg-violet-500 font-bold"
                >
                  Accept Agreement
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verified Milestones Ready For Disbursal */}
      {claimableMilestones.length > 0 && (
        <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
            <Coins className="w-4 h-4" />
            <span>Verified Milestones Ready to Disburse ({claimableMilestones.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {claimableMilestones.map(({ agreement, milestone }) => (
              <div
                key={milestone.publicKey}
                className="p-3 bg-[#000000] border border-[#26262a] rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-white block">
                    #{milestone.index + 1}: {milestone.title}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    ${formatUsdc(milestone.amountUsdc)} USDC
                  </span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => openDrawer('release', agreement, milestone)}
                  className="text-xs bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
                >
                  <Coins className="w-3.5 h-3.5 mr-1" />
                  Claim Payout
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agreements List */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
          Your Assigned Agreements ({agreements.length})
        </h2>

        {!connected ? (
          <div className="p-12 text-center bg-[#000000] border border-[#26262a] rounded-2xl space-y-3 text-xs">
            <Wallet className="w-10 h-10 mx-auto text-neutral-600" />
            <h3 className="text-sm font-bold text-white">Connect Solana Wallet</h3>
            <p className="text-neutral-400 max-w-sm mx-auto">
              Connect your Phantom or Solflare wallet to view agreements where your address is designated as the worker.
            </p>
          </div>
        ) : isLoading ? (
          <div className="p-8 text-center bg-[#000000] border border-[#26262a] rounded-2xl text-xs text-neutral-400">
            Fetching on-chain accounts from Solana Devnet...
          </div>
        ) : agreements.length === 0 ? (
          <div className="p-12 text-center bg-[#000000] border border-[#26262a] rounded-2xl space-y-3 text-xs">
            <DoneLogo className="w-10 h-10 mx-auto opacity-50" />
            <h3 className="text-sm font-bold text-white">No Assigned Agreements Found</h3>
            <p className="text-neutral-400 max-w-sm mx-auto">
              No agreements have been created with your address as the assigned worker yet. Once a sponsor creates an agreement targeting your public key, it will appear here for acceptance.
            </p>
          </div>
        ) : (
          agreements.map((agreement) => {
            const nextPending = agreement.milestones.find(
              (m) => m.state === MilestoneState.PENDING
            );

            return (
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
                      <span>Sponsor: {truncateAddress(agreement.sponsor, 4)}</span>
                      <span>•</span>
                      <span>PDA: {truncateAddress(agreement.publicKey, 4)}</span>
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
                    {agreement.state === AgreementState.DRAFT && !agreement.workerAccepted && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openDrawer('accept', agreement)}
                        className="text-xs bg-violet-600 hover:bg-violet-500 font-bold"
                      >
                        <FileCheck2 className="w-3.5 h-3.5 mr-1" /> Accept Agreement
                      </Button>
                    )}

                    {nextPending &&
                      (agreement.state === AgreementState.FUNDED ||
                        agreement.state === AgreementState.ACTIVE) && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openDrawer('submit_evidence', agreement, nextPending)}
                          className="text-xs"
                        >
                          <UploadCloud className="w-3.5 h-3.5 mr-1 text-violet-400" />
                          Submit Evidence
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
          })
        )}
      </div>
    </div>
  );
}
