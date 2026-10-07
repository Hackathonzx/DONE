'use client';

import React from 'react';
import Link from 'next/link';
import { MilestoneAccount, MilestoneState } from '@/types/protocol';
import { formatUsdc, truncateAddress, getExplorerUrl } from '@/lib/solana';
import { MilestoneStateBadge, VerificationTypeBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ExternalLink, ArrowRight, ShieldCheck, UploadCloud, Coins } from 'lucide-react';

interface MilestoneRowProps {
  milestone: MilestoneAccount;
  agreementId: string;
  isSponsor: boolean;
  isWorker: boolean;
  isVerifier: boolean;
}

export function MilestoneRow({
  milestone,
  agreementId,
  isSponsor,
  isWorker,
  isVerifier,
}: MilestoneRowProps) {
  const detailUrl = `/agreements/${agreementId}/m/${milestone.index}`;

  return (
    <div className="border border-zinc-800 bg-zinc-950/60 p-4 transition-colors hover:border-zinc-700/80 font-mono">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Index, Title, and Badges */}
        <div className="space-y-1.5 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 border border-cyan-800">
              M#{milestone.index}
            </span>
            <h4 className="text-sm sm:text-base font-semibold text-zinc-100">{milestone.title}</h4>
            <MilestoneStateBadge state={milestone.state} />
            <VerificationTypeBadge type={milestone.verificationType} />
          </div>

          <p className="text-xs text-zinc-400 line-clamp-1">{milestone.description}</p>

          {/* Canonical Hash Info */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-400 pt-1">
            <div className="flex items-center gap-1">
              <span>DoD HASH:</span>
              <span className="text-zinc-300 font-mono" title={milestone.dodHash}>
                {truncateAddress(milestone.dodHash, 8)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span>CRITERIA:</span>
              <span className="text-zinc-300">{milestone.dodCriteria.length} items defined</span>
            </div>
            {milestone.settlementTx && (
              <div className="flex items-center gap-1 text-emerald-400">
                <span>SETTLED TX:</span>
                <a
                  href={getExplorerUrl(milestone.settlementTx, 'tx')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline inline-flex items-center gap-0.5"
                >
                  {truncateAddress(milestone.settlementTx, 4)}
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Right: Amount & CTA */}
        <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 pt-3 lg:pt-0 border-zinc-800 gap-3">
          <div className="text-left lg:text-right">
            <div className="text-base sm:text-lg font-bold text-emerald-400">
              ${formatUsdc(milestone.amountUsdc)}
            </div>
            <span className="text-[10px] text-zinc-400 uppercase">USDC (Devnet Mint)</span>
          </div>

          {/* Contextual Action Button */}
          <div className="flex items-center gap-2">
            <Link href={detailUrl}>
              <Button variant="secondary" size="sm">
                <span>Inspect Pipeline</span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
