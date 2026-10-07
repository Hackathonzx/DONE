'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMilestone } from '@/hooks/useMilestone';
import { useWallet } from '@/components/web3/WalletContext';
import { useTransactionExecution } from '@/hooks/useTransactionExecution';
import { MilestoneState, VerificationType } from '@/types/protocol';
import { formatUsdc, truncateAddress, getExplorerUrl } from '@/lib/solana';
import { MilestoneStateBadge, VerificationTypeBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { PipelineProgress } from '@/components/protocol/PipelineProgress';
import { EvidenceForm } from '@/components/protocol/EvidenceForm';
import { VerificationCard } from '@/components/protocol/VerificationCard';
import { TxStateModal } from '@/components/web3/TxStateModal';
import {
  ChevronLeft,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Hash,
  Link as LinkIcon,
  FileText,
  UserCheck,
  Coins,
  AlertTriangle,
} from 'lucide-react';

export default function MilestoneDetailPage() {
  const params = useParams();
  const router = useRouter();

  const id = params?.id as string;
  const mIdStr = params?.mId as string;
  const milestoneIndex = parseInt(mIdStr, 10);

  const { data, isLoading } = useMilestone(id, milestoneIndex);
  const { publicKeyString, role, switchRole } = useWallet();
  const { txState, execute, reset, isOpen } = useTransactionExecution();

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 text-center font-mono">
        <div className="animate-spin w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-zinc-400 text-xs">Loading milestone account and DoD criteria...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 text-center font-mono space-y-4">
        <div className="p-8 border border-zinc-800 bg-zinc-950 max-w-lg mx-auto">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <h2 className="text-base font-bold text-zinc-100">Milestone Account Not Found</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Could not resolve milestone #{milestoneIndex} on agreement {truncateAddress(id, 4)}.
          </p>
          <div className="pt-4">
            <Link href={`/agreements/${id}`}>
              <Button variant="outline" size="sm">
                Return to Agreement
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { agreement, milestone } = data;
  const isSponsor = publicKeyString === agreement.sponsor;
  const isWorker = publicKeyString === agreement.worker;
  const isVerifier = isSponsor || role === 'oracle';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 font-mono">
      <TxStateModal state={txState} isOpen={isOpen} onClose={reset} />

      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href={`/agreements/${id}`}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Agreement: {agreement.title}</span>
        </Link>

        {/* Role Quick-Switch Hint for Seamless Testing */}
        <div className="text-[11px] text-zinc-400 flex items-center gap-2">
          <span>Current Role:</span>
          <span className="text-cyan-300 font-bold uppercase">{role}</span>
          <span className="text-zinc-600">|</span>
          <button
            onClick={() => switchRole(role === 'worker' ? 'sponsor' : 'worker')}
            className="text-cyan-400 hover:underline"
          >
            Switch to {role === 'worker' ? 'Sponsor' : 'Worker'}
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="p-6 bg-zinc-950 border border-zinc-800 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-cyan-400 px-2 py-0.5 bg-cyan-950 border border-cyan-800">
                MILESTONE #{milestone.index}
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-zinc-100">{milestone.title}</h1>
              <MilestoneStateBadge state={milestone.state} />
              <VerificationTypeBadge type={milestone.verificationType} />
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl">{milestone.description}</p>
          </div>

          <div className="text-left lg:text-right border-t lg:border-t-0 pt-3 lg:pt-0 border-zinc-800">
            <span className="text-[10px] text-zinc-400 uppercase block">ALLOCATED SETTLEMENT</span>
            <div className="text-2xl font-bold text-emerald-400">
              ${formatUsdc(milestone.amountUsdc)}{' '}
              <span className="text-xs text-zinc-400">USDC</span>
            </div>
          </div>
        </div>

        {/* 4-Stage Protocol Pipeline Visualizer */}
        <div className="pt-2 border-t border-zinc-800/80">
          <PipelineProgress state={milestone.state} />
        </div>
      </div>

      {/* Section 1: Definition of Done Criteria Checklist */}
      <Card>
        <CardHeader className="bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-zinc-100 uppercase tracking-wider">
              1. DEFINITION OF DONE (DoD) SPECIFICATION
            </h3>
          </div>
          <span className="text-[10px] text-zinc-400">CANONICAL CONTRACT COMMITMENT</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-zinc-400">
            These criteria were normalized, sorted, and SHA-256 hashed on-chain at account initialization. The worker cannot alter these requirements, and the verifier cannot demand arbitrary scope changes outside this commitment.
          </p>

          <div className="space-y-2">
            {milestone.dodCriteria.map((c, idx) => (
              <div
                key={idx}
                className="p-3 bg-zinc-900/70 border border-zinc-800 flex items-start gap-3"
              >
                <div className="w-5 h-5 bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="text-xs text-zinc-200 leading-relaxed pt-0.5">{c}</div>
              </div>
            ))}
          </div>

          {/* Canonical Hash Display */}
          <div className="p-3 bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Hash className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span className="text-zinc-400 text-[10px] uppercase font-bold">
                CANONICAL SHA-256 PRE-IMAGE HASH:
              </span>
            </div>
            <span className="text-amber-300 font-mono text-[11px] break-all">
              {milestone.dodHash}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Evidence Submission */}
      {milestone.evidence ? (
        <Card className="border-amber-900/50 bg-zinc-950">
          <CardHeader className="bg-zinc-900/60">
            <div className="flex items-center gap-2 text-amber-400">
              <CheckCircle2 className="w-4 h-4" />
              <h3 className="font-bold text-sm text-zinc-100 uppercase tracking-wider">
                2. EVIDENCE SUBMITTED ON-CHAIN
              </h3>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">
              SUBMITTED {new Date(milestone.evidence.submittedAt).toLocaleString()}
            </span>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <span className="text-zinc-400 text-[10px] block uppercase font-bold">
                METADATA URI (PERMANENT ARTIFACT STORAGE)
              </span>
              <a
                href={milestone.evidence.metadataUri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline font-mono text-[11px] inline-flex items-center gap-1 mt-0.5 break-all"
              >
                {milestone.evidence.metadataUri}
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            </div>

            {milestone.evidence.deliverableLinks.length > 0 && (
              <div>
                <span className="text-zinc-400 text-[10px] block uppercase font-bold mb-1">
                  DELIVERABLE REFERENCES & PULL REQUESTS
                </span>
                <div className="space-y-1">
                  {milestone.evidence.deliverableLinks.map((link, idx) => (
                    <a
                      key={idx}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px] font-mono"
                    >
                      <LinkIcon className="w-3 h-3" />
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="text-zinc-400 text-[10px] block uppercase font-bold">
                WORKER NOTES
              </span>
              <p className="text-zinc-300 bg-zinc-900 p-2.5 border border-zinc-800 mt-1 leading-relaxed">
                {milestone.evidence.notes}
              </p>
            </div>

            <div className="p-2.5 bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-400 text-[10px] block uppercase font-bold mb-0.5">
                SUBMITTED EVIDENCE HASH
              </span>
              <span className="text-amber-300 font-mono text-[11px] break-all">
                {milestone.evidence.evidenceHash}
              </span>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* If no evidence yet, show Evidence Form */
        <EvidenceForm
          agreementKey={agreement.publicKey}
          milestone={milestone}
          onExecute={execute}
        />
      )}

      {/* Section 3 & 4: Verification Card & Settlement Disbursal */}
      <VerificationCard
        agreementKey={agreement.publicKey}
        milestone={milestone}
        isVerifierOrSponsor={isVerifier}
        onExecute={execute}
      />
    </div>
  );
}
