'use client';

import React from 'react';
import Link from 'next/link';
import { MilestoneAccount } from '@/types/protocol';
import { formatUsdc, truncateAddress, getExplorerUrl } from '@/lib/solana';
import { MilestoneStateBadge, VerificationTypeBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ExternalLink, ChevronRight } from 'lucide-react';

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
}: MilestoneRowProps) {
  const detailUrl = `/agreements/${agreementId}`;

  return (
    <div className="border border-[#26262a] bg-[#000000] p-5 rounded-2xl transition-all hover:border-violet-500/40 font-mono">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Index, Title, and Badges */}
        <div className="space-y-1.5 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-neutral-300 bg-[#000000] px-2 py-0.5 rounded-lg border border-[#26262a]">
              M#{milestone.index}
            </span>
            <h4 className="text-sm sm:text-base font-bold text-white">{milestone.title}</h4>
            <MilestoneStateBadge state={milestone.state} />
            <VerificationTypeBadge type={milestone.verificationType} />
          </div>

          <p className="text-xs text-neutral-400 line-clamp-1">{milestone.description}</p>

          {/* Canonical Hash Info */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-500 pt-1">
            <div className="flex items-center gap-1">
              <span>DoD HASH:</span>
              <span className="text-neutral-300 font-mono" title={milestone.dodHash}>
                {truncateAddress(milestone.dodHash, 8)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span>CRITERIA:</span>
              <span className="text-neutral-300">{milestone.dodCriteria.length} items</span>
            </div>
            {milestone.settlementTx && (
              <div className="flex items-center gap-1 text-emerald-400">
                <span>TX:</span>
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
        <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 pt-3 lg:pt-0 border-[#26262a] gap-3">
          <div className="text-left lg:text-right">
            <div className="text-base sm:text-lg font-bold text-emerald-400">
              ${formatUsdc(milestone.amountUsdc)} USDC
            </div>
            <span className="text-[10px] text-neutral-500 uppercase">Settlement</span>
          </div>

          <Link href={detailUrl}>
            <Button variant="secondary" size="sm">
              <span>Inspect</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
