'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAgreement } from '@/hooks/useAgreement';
import { useTransactionExecution } from '@/hooks/useTransactionExecution';
import { AgreementState, MilestoneState, MilestoneAccount } from '@/types/protocol';
import { formatUsdc, truncateAddress, getExplorerUrl } from '@/lib/solana';
import { useWallet } from '@/components/web3/WalletContext';
import { AgreementStateBadge, MilestoneStateBadge, VerificationTypeBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TxStateModal } from '@/components/web3/TxStateModal';
import { QuickActionModal, QuickActionType } from '@/components/protocol/QuickActionModal';
import { DoneLogo } from '@/components/protocol/DoneLogo';
import {
  ArrowLeft,
  ExternalLink,
  Lock,
  UploadCloud,
  ShieldCheck,
  Coins,
  Copy,
  Check,
  ChevronRight,
  AlertCircle,
  FileCheck2,
  XCircle,
} from 'lucide-react';

export default function AgreementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { data: agreement, isLoading } = useAgreement(id);
  const { publicKeyString } = useWallet();
  const { txState, execute, reset: resetTx, isOpen: isTxOpen } = useTransactionExecution();

  const [drawerState, setDrawerState] = useState<{
    isOpen: boolean;
    type: QuickActionType;
    milestone?: MilestoneAccount;
  }>({
    isOpen: false,
    type: 'inspect',
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const openDrawer = (type: QuickActionType, milestone?: MilestoneAccount) => {
    setDrawerState({ isOpen: true, type, milestone });
  };

  const closeDrawer = () => {
    setDrawerState((prev) => ({ ...prev, isOpen: false }));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] font-mono text-neutral-400">
        <DoneLogo className="w-10 h-10 animate-pulse mb-3" />
        <span className="text-xs">Fetching on-chain agreement state from Solana Devnet...</span>
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="space-y-4 font-mono text-neutral-100 max-w-2xl mx-auto py-12 text-center">
        <h2 className="text-base font-bold text-white">Agreement Account Not Found</h2>
        <p className="text-xs text-neutral-400">
          No deployed account matching address {id} on Devnet.
        </p>
        <Link
          href="/agreements"
          className="inline-flex items-center gap-2 text-xs text-violet-400 hover:text-violet-300 underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Agreements
        </Link>
      </div>
    );
  }

  const isSponsor = publicKeyString && publicKeyString === agreement.sponsor;
  const isWorker = publicKeyString && publicKeyString === agreement.worker;

  const settledAmountUsdc = agreement.milestones
    .filter((m) => m.state === MilestoneState.RELEASED)
    .reduce((sum, m) => sum + m.amountUsdc, 0);

  const percentSettled =
    agreement.totalAmountUsdc > 0
      ? Math.round((settledAmountUsdc / agreement.totalAmountUsdc) * 100)
      : 0;

  const nextActionableMilestone = agreement.milestones.find(
    (m) => m.state !== MilestoneState.RELEASED
  );

  return (
    <div className="space-y-6 font-mono text-neutral-100 max-w-6xl mx-auto">
      <TxStateModal state={txState} isOpen={isTxOpen} onClose={resetTx} />

      <QuickActionModal
        isOpen={drawerState.isOpen}
        onClose={closeDrawer}
        actionType={drawerState.type}
        agreement={agreement}
        milestone={drawerState.milestone}
        onExecute={execute}
        onSwitchAction={(type, m) => setDrawerState({ isOpen: true, type, milestone: m })}
      />

      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between border-b border-[#26262a] pb-3 text-xs">
        <Link
          href="/agreements"
          className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Agreements</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-neutral-300">Live On-Chain Devnet PDA</span>
        </div>
      </div>

      {/* Main Header Banner */}
      <Card className="p-6 bg-[#000000] border-[#26262a] rounded-3xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <AgreementStateBadge state={agreement.state} />
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
                {agreement.title}
              </h1>
            </div>
            <p className="text-xs text-neutral-400 max-w-2xl">{agreement.description}</p>
          </div>

          <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 pt-3 lg:pt-0 border-[#26262a] gap-3">
            <div>
              <span className="text-[10px] text-neutral-400 uppercase block font-semibold">
                ESCROW BUDGET
              </span>
              <div className="text-2xl font-bold text-emerald-400">
                ${formatUsdc(agreement.totalAmountUsdc)}{' '}
                <span className="text-xs text-neutral-400 font-normal">USDC</span>
              </div>
            </div>

            {/* Workflow Action Buttons */}
            <div className="flex items-center gap-2">
              {agreement.state === AgreementState.DRAFT && !agreement.workerAccepted && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => openDrawer('accept')}
                  className="bg-violet-600 hover:bg-violet-500 font-bold"
                >
                  <FileCheck2 className="w-4 h-4 mr-1.5" />
                  Worker Accept Terms
                </Button>
              )}

              {agreement.state === AgreementState.DRAFT && agreement.workerAccepted && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => openDrawer('fund')}
                  className="bg-emerald-600 hover:bg-emerald-500 font-bold"
                >
                  <Lock className="w-4 h-4 mr-1.5" />
                  Sponsor Fund Escrow
                </Button>
              )}

              {(agreement.state === AgreementState.FUNDED || agreement.state === AgreementState.ACTIVE) && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openDrawer('cancel')}
                  className="text-rose-400 hover:text-rose-300 border-rose-500/30 text-xs"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Cancel Escrow
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Progress Track */}
        <div className="space-y-1.5 pt-2 border-t border-[#26262a]">
          <div className="flex justify-between text-xs text-neutral-400">
            <span>
              Settlement Disbursed: <span className="text-white font-semibold">{percentSettled}%</span>
            </span>
            <span className="text-emerald-400 font-semibold">
              ${formatUsdc(settledAmountUsdc)} / ${formatUsdc(agreement.totalAmountUsdc)} USDC
            </span>
          </div>
          <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full transition-all duration-300"
              style={{ width: `${percentSettled}%` }}
            />
          </div>
        </div>

        {/* Monospace IDs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 text-xs">
          <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl">
            <span className="text-[10px] text-neutral-500 uppercase block mb-0.5">SPONSOR ACCOUNT</span>
            <span className="text-neutral-200 font-mono text-xs">{truncateAddress(agreement.sponsor, 6)}</span>
          </div>
          <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl">
            <span className="text-[10px] text-neutral-500 uppercase block mb-0.5">WORKER ACCOUNT</span>
            <span className="text-neutral-200 font-mono text-xs">{truncateAddress(agreement.worker, 6)}</span>
          </div>
          <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl">
            <span className="text-[10px] text-neutral-500 uppercase block mb-0.5">VAULT PDA</span>
            <span className="text-violet-300 font-mono text-xs">{truncateAddress(agreement.vaultPda, 6)}</span>
          </div>
          <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl">
            <span className="text-[10px] text-neutral-500 uppercase block mb-0.5">WORKER ACCEPTED</span>
            <span className={agreement.workerAccepted ? 'text-emerald-400 font-bold' : 'text-amber-400 font-semibold'}>
              {agreement.workerAccepted ? 'ACCEPTED ✓' : 'PENDING ACCEPTANCE'}
            </span>
          </div>
        </div>
      </Card>

      {/* Sequential Milestone Pipeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#26262a] pb-2.5">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">
            Milestone Pipeline ({agreement.milestones.length})
          </h2>
          <span className="text-[11px] text-neutral-400">Click any milestone for details</span>
        </div>

        <div className="space-y-3">
          {agreement.milestones.map((milestone) => (
            <div
              key={milestone.publicKey}
              className="bg-[#000000] border border-[#26262a] hover:border-violet-500/40 rounded-2xl p-4 sm:p-5 transition-all space-y-3.5"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Index, Title, Status */}
                <div
                  className="space-y-1.5 flex-1 cursor-pointer"
                  onClick={() => openDrawer('inspect', milestone)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-[#000000] border border-violet-500/30 text-xs font-bold text-violet-300">
                      #{milestone.index + 1}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-white hover:text-violet-300 transition-colors">
                      {milestone.title}
                    </h3>
                    <MilestoneStateBadge state={milestone.state} />
                  </div>
                  <p className="text-xs text-neutral-400">{milestone.description}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-400 pt-1">
                    <span>DoD: {truncateAddress(milestone.dodHash, 6)}</span>
                    <span>•</span>
                    <span>Verifier: {truncateAddress(milestone.verifier, 4)}</span>
                  </div>
                </div>

                {/* Right: Amount & Direct Action Button */}
                <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 pt-3 lg:pt-0 border-[#26262a] gap-3">
                  <div className="text-left lg:text-right">
                    <div className="text-base sm:text-lg font-bold text-emerald-400">
                      ${formatUsdc(milestone.amountUsdc)} USDC
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {milestone.state === MilestoneState.PENDING && (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={agreement.state === AgreementState.DRAFT}
                        onClick={() => openDrawer('submit_evidence', milestone)}
                      >
                        <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                        Submit Proof
                      </Button>
                    )}

                    {milestone.state === MilestoneState.EVIDENCE_SUBMITTED && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openDrawer('verify', milestone)}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                        Verify DoD
                      </Button>
                    )}

                    {milestone.state === MilestoneState.VERIFIED && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openDrawer('release', milestone)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
                      >
                        <Coins className="w-3.5 h-3.5 mr-1.5" />
                        Release Escrow
                      </Button>
                    )}

                    {milestone.state === MilestoneState.RELEASED && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openDrawer('inspect', milestone)}
                      >
                        Receipt
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
