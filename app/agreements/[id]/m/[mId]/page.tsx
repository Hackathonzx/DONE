'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAgreement } from '@/hooks/useAgreement';
import { useWallet } from '@/components/web3/WalletContext';
import { useTransactionExecution } from '@/hooks/useTransactionExecution';
import { MilestoneState } from '@/types/protocol';
import { formatUsdc, truncateAddress } from '@/lib/solana';
import { MilestoneStateBadge } from '@/components/ui/Badge';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { TxStateModal } from '@/components/web3/TxStateModal';
import { EvidenceForm } from '@/components/protocol/EvidenceForm';
import { VerificationCard } from '@/components/protocol/VerificationCard';
import { PipelineProgress } from '@/components/protocol/PipelineProgress';
import { DoneLogo } from '@/components/protocol/DoneLogo';
import {
  ChevronLeft,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Hash,
  Link as LinkIcon,
} from 'lucide-react';

export default function MilestoneDetailPage() {
  const params = useParams();
  const agreementId = params?.id as string;
  const milestoneIndex = parseInt(params?.mId as string, 10);

  const { data: agreement, isLoading } = useAgreement(agreementId);
  const { publicKeyString } = useWallet();
  const { txState, execute, reset: resetTx, isOpen: isTxOpen } = useTransactionExecution();

  if (isLoading) {
    return (
      <div className="py-16 text-center font-mono">
        <DoneLogo className="w-8 h-8 mx-auto animate-pulse mb-3" />
        <p className="text-neutral-400 text-xs">Loading milestone on-chain state...</p>
      </div>
    );
  }

  const milestone = agreement?.milestones.find((m) => m.index === milestoneIndex);

  if (!agreement || !milestone) {
    return (
      <div className="max-w-md mx-auto py-16 text-center font-mono space-y-3">
        <DoneLogo className="w-10 h-10 mx-auto opacity-50" />
        <h2 className="text-sm font-bold text-white">Milestone Account Not Found</h2>
        <Link href={`/agreements/${agreementId}`} className="text-xs text-violet-400 hover:underline">
          Return to Agreement
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-mono text-neutral-100">
      <TxStateModal state={txState} isOpen={isTxOpen} onClose={resetTx} />

      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href={`/agreements/${agreement.publicKey}`}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to {agreement.title}</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="p-6 bg-[#000000] border border-[#26262a] rounded-2xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <DoneLogo className="w-8 h-8 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-violet-400 px-2 py-0.5 bg-violet-950/40 border border-violet-500/30 rounded-lg">
                  MILESTONE #{milestone.index + 1}
                </span>
                <h1 className="text-lg sm:text-xl font-bold text-white">{milestone.title}</h1>
                <MilestoneStateBadge state={milestone.state} />
              </div>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl">{milestone.description}</p>
            </div>
          </div>

          <div className="text-left lg:text-right border-t lg:border-t-0 pt-3 lg:pt-0 border-[#26262a]">
            <span className="text-[10px] text-neutral-400 uppercase block font-semibold">ALLOCATED SETTLEMENT</span>
            <div className="text-2xl font-black text-violet-400">
              ${formatUsdc(milestone.amountUsdc)}{' '}
              <span className="text-xs text-neutral-400 font-normal">USDC</span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-[#26262a]">
          <PipelineProgress state={milestone.state} />
        </div>
      </div>

      {/* Definition of Done Criteria Checklist */}
      <Card>
        <CardHeader className="bg-[#000000]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-violet-400" />
            <h3 className="font-bold text-xs text-white uppercase tracking-wider">
              Definition of Done (DoD) Criteria
            </h3>
          </div>
          <span className="text-[10px] text-neutral-400 font-mono">CRYPTOGRAPHIC COMMITMENT</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {milestone.dodCriteria.map((c, idx) => (
              <div
                key={idx}
                className="p-3 bg-[#000000] border border-[#26262a] rounded-xl flex items-start gap-3"
              >
                <div className="w-5 h-5 bg-[#000000] border border-[#26262a] text-violet-300 rounded flex items-center justify-center text-xs font-bold shrink-0">
                  {idx + 1}
                </div>
                <div className="text-xs text-neutral-200 leading-relaxed pt-0.5">{c}</div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Hash className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <span className="text-neutral-400 text-[10px] uppercase font-bold">
                CANONICAL SHA-256 HASH:
              </span>
            </div>
            <span className="text-violet-300 font-mono text-[11px] break-all">
              {milestone.dodHash}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Evidence Submission Card */}
      {milestone.evidence ? (
        <Card className="bg-[#000000] border border-[#26262a]">
          <CardHeader className="bg-[#000000]">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <h3 className="font-bold text-xs text-white uppercase tracking-wider">
                Submitted Deliverable Evidence
              </h3>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">
              {new Date(milestone.evidence.submittedAt).toLocaleString()}
            </span>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <span className="text-neutral-400 text-[10px] block uppercase font-bold mb-1">
                METADATA URI
              </span>
              <a
                href={milestone.evidence.metadataUri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 underline font-mono text-[11px] inline-flex items-center gap-1 break-all"
              >
                {milestone.evidence.metadataUri}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>

            {milestone.evidence.deliverableLinks.length > 0 && (
              <div>
                <span className="text-neutral-400 text-[10px] block uppercase font-bold mb-1">
                  DELIVERABLE REFERENCES
                </span>
                <div className="space-y-1">
                  {milestone.evidence.deliverableLinks.map((link, idx) => (
                    <a
                      key={idx}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-400 hover:underline flex items-center gap-1 text-[11px] font-mono"
                    >
                      <LinkIcon className="w-3 h-3" />
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="text-neutral-400 text-[10px] block uppercase font-bold mb-1">
                WORKER NOTES
              </span>
              <p className="text-neutral-300 bg-[#000000] p-2.5 rounded-xl border border-[#26262a] leading-relaxed">
                {milestone.evidence.notes}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        milestone.state === MilestoneState.PENDING && (
          <EvidenceForm
            agreementKey={agreement.publicKey}
            milestone={milestone}
            onExecute={execute}
          />
        )
      )}

      {/* Verification Card */}
      {(milestone.state === MilestoneState.EVIDENCE_SUBMITTED ||
        milestone.state === MilestoneState.VERIFIED ||
        milestone.state === MilestoneState.RELEASED) && (
        <VerificationCard
          agreementKey={agreement.publicKey}
          milestone={milestone}
          workerAddress={agreement.worker}
          onExecute={execute}
        />
      )}
    </div>
  );
}
