import React from 'react';
import { AgreementState, MilestoneState, VerificationType } from '@/types/protocol';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'draft' | 'active' | 'verified' | 'released' | 'danger' | 'neutral' | 'violet';
  className?: string;
}

export function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  const variantStyles = {
    neutral: 'bg-neutral-800/80 text-neutral-300 border border-neutral-700/50',
    draft: 'bg-neutral-800 text-neutral-300 border border-neutral-700/60',
    active: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    verified: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    released: 'bg-violet-500/10 text-violet-300 border border-violet-500/30',
    violet: 'bg-violet-500/10 text-violet-300 border border-violet-500/30',
    danger: 'bg-red-500/10 text-red-400 border border-red-500/20',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-lg ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function AgreementStateBadge({ state }: { state: AgreementState }) {
  switch (state) {
    case AgreementState.DRAFT:
      return <Badge variant="draft">DRAFT</Badge>;
    case AgreementState.FUNDED:
      return <Badge variant="active">FUNDED</Badge>;
    case AgreementState.ACTIVE:
      return <Badge variant="active">ACTIVE</Badge>;
    case AgreementState.COMPLETED:
      return <Badge variant="verified">COMPLETED</Badge>;
    case AgreementState.CANCELLED:
      return <Badge variant="danger">CANCELLED</Badge>;
    default:
      return <Badge>{state}</Badge>;
  }
}

export function MilestoneStateBadge({ state }: { state: MilestoneState }) {
  switch (state) {
    case MilestoneState.PENDING:
      return (
        <Badge variant="draft">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
          PENDING
        </Badge>
      );
    case MilestoneState.EVIDENCE_SUBMITTED:
      return (
        <Badge variant="active">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          EVIDENCE SUBMITTED
        </Badge>
      );
    case MilestoneState.VERIFIED:
      return (
        <Badge variant="verified">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          VERIFIED
        </Badge>
      );
    case MilestoneState.RELEASED:
      return (
        <Badge variant="released">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
          RELEASED
        </Badge>
      );
    default:
      return <Badge>{state}</Badge>;
  }
}

export function VerificationTypeBadge({ type }: { type: VerificationType }) {
  switch (type) {
    case VerificationType.SPONSOR:
      return <Badge variant="neutral">Sponsor Sign-off</Badge>;
    case VerificationType.ON_CHAIN_ORACLE:
      return <Badge variant="active">On-Chain Oracle</Badge>;
    case VerificationType.ATTESTATION:
      return <Badge variant="verified">Attestation</Badge>;
    default:
      return null;
  }
}
