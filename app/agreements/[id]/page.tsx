'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAgreement } from '@/hooks/useAgreement';
import { useWallet } from '@/components/web3/WalletContext';
import { useTransactionExecution } from '@/hooks/useTransactionExecution';
import { AgreementState, MilestoneState } from '@/types/protocol';
import { formatUsdc, truncateAddress, getExplorerUrl } from '@/lib/solana';
import { AgreementStateBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { MilestoneRow } from '@/components/protocol/MilestoneRow';
import { FundingModal } from '@/components/protocol/FundingModal';
import { TxStateModal } from '@/components/web3/TxStateModal';
import {
  ShieldCheck,
  Lock,
  ExternalLink,
  ChevronLeft,
  Coins,
  FileText,
  User,
  Hash,
  AlertTriangle,
} from 'lucide-react';

export default function AgreementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { data: agreement, isLoading } = useAgreement(id);
  const { publicKeyString, role } = useWallet();
  const { txState, execute, reset, isOpen: isTxOpen } = useTransactionExecution();

  const [isFundingModalOpen, setIsFundingModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center font-mono">
        <div className="animate-spin w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-zinc-400 text-xs">Deserializing Anchor agreement account...</p>
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center font-mono space-y-4">
        <div className="p-8 border border-zinc-800 bg-zinc-950 max-w-lg mx-auto">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <h2 className="text-base font-bold text-zinc-100">Agreement Account Not Found</h2>
          <p className="text-xs text-zinc-400 mt-1">
            No on-chain account matching address {id} was found on Devnet.
          </p>
          <div className="pt-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                Return to Protocol Explorer
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isSponsor = publicKeyString === agreement.sponsor;
  const isWorker = publicKeyString === agreement.worker;
  const isVerifier = isSponsor || role === 'oracle';

  const settledAmountUsdc = agreement.milestones
    .filter((m) => m.state === MilestoneState.RELEASED)
    .reduce((sum, m) => sum + m.amountUsdc, 0);

  const percentSettled =
    agreement.totalAmountUsdc > 0
      ? Math.round((settledAmountUsdc / agreement.totalAmountUsdc) * 100)
      : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 font-mono">
      <TxStateModal state={txState} isOpen={isTxOpen} onClose={reset} />

      <FundingModal
        agreement={agreement}
        isOpen={isFundingModalOpen}
        onClose={() => setIsFundingModalOpen(false)}
        onExecute={execute}
      />

      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Protocol Explorer</span>
        </Link>

        <div className="flex items-center gap-2">
          {agreement.fundingTx && (
            <a
              href={getExplorerUrl(agreement.fundingTx, 'tx')}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 underline"
            >
              <span>Escrow Tx</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="p-6 sm:p-8 bg-zinc-950 border border-zinc-800 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">{agreement.title}</h1>
              <AgreementStateBadge state={agreement.state} />
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl">{agreement.description}</p>
          </div>

          {/* Budget / Funding CTA */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 border-t lg:border-t-0 pt-4 lg:pt-0 border-zinc-800">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase block">ESCROW BUDGET</span>
              <div className="text-2xl font-extrabold text-emerald-400">
                ${formatUsdc(agreement.totalAmountUsdc)}{' '}
                <span className="text-xs text-zinc-400">USDC</span>
              </div>
            </div>

            {agreement.state === AgreementState.DRAFT && (
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsFundingModalOpen(true)}
                className="w-full sm:w-auto"
              >
                <Lock className="w-4 h-4 mr-1.5 text-black" />
                Fund Escrow Vault
              </Button>
            )}
          </div>
        </div>

        {/* Settlement Progress Bar */}
        <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400">
              Settlement Progress: <span className="text-zinc-200 font-semibold">{percentSettled}%</span>
            </span>
            <span className="text-emerald-400 font-semibold">
              ${formatUsdc(settledAmountUsdc)} / ${formatUsdc(agreement.totalAmountUsdc)} USDC
            </span>
          </div>
          <div className="w-full h-2 bg-zinc-900 border border-zinc-800 rounded-none overflow-hidden">
            <div
              className="h-full bg-cyan-500 transition-all duration-500"
              style={{ width: `${percentSettled}%` }}
            />
          </div>
        </div>

        {/* Account Details & PDAs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="p-3 bg-zinc-900/60 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 uppercase block mb-1">SPONSOR ACCOUNT</span>
            <span className="text-zinc-200 font-mono text-xs">{truncateAddress(agreement.sponsor, 6)}</span>
            <span className="text-[10px] text-zinc-400 block mt-0.5">
              {isSponsor ? '(Connected as Sponsor)' : 'Agreement creator'}
            </span>
          </div>

          <div className="p-3 bg-zinc-900/60 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 uppercase block mb-1">WORKER ACCOUNT</span>
            <span className="text-zinc-200 font-mono text-xs">{truncateAddress(agreement.worker, 6)}</span>
            <span className="text-[10px] text-zinc-400 block mt-0.5">
              {isWorker ? '(Connected as Worker)' : 'Designated executor'}
            </span>
          </div>

          <div className="p-3 bg-zinc-900/60 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 uppercase block mb-1">ESCROW VAULT PDA</span>
            <span className="text-cyan-400 font-mono text-xs">{truncateAddress(agreement.vaultPda, 6)}</span>
            <span className="text-[10px] text-zinc-400 block mt-0.5">
              Holds locked SPL USDC
            </span>
          </div>

          <div className="p-3 bg-zinc-900/60 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 uppercase block mb-1">TERMS SHA-256 HASH</span>
            <span className="text-zinc-300 font-mono text-xs" title={agreement.termsHash}>
              {truncateAddress(agreement.termsHash, 6)}
            </span>
            <span className="text-[10px] text-zinc-400 block mt-0.5">Canonical pre-image</span>
          </div>
        </div>
      </div>

      {/* Terms Drawer / Collapsible Box */}
      {agreement.termsText && (
        <Card className="bg-zinc-950">
          <CardHeader className="bg-zinc-900/40 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>CANONICAL AGREEMENT TERMS & LEGAL PROVISIONS</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">
              HASH: {truncateAddress(agreement.termsHash, 8)}
            </span>
          </CardHeader>
          <CardContent className="py-3">
            <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed bg-zinc-900/40 p-3 border border-zinc-800">
              {agreement.termsText}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Milestones Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Coins className="w-4 h-4 text-cyan-400" />
              Execution Milestones & DoD Pipeline ({agreement.milestones.length})
            </h2>
            <p className="text-xs text-zinc-400">
              Select a milestone to inspect evidence submission and verification audit steps.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {agreement.milestones.map((milestone) => (
            <MilestoneRow
              key={milestone.publicKey}
              milestone={milestone}
              agreementId={agreement.publicKey}
              isSponsor={isSponsor}
              isWorker={isWorker}
              isVerifier={isVerifier}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
