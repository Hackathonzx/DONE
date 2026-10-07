import React from 'react';
import { AgreementState, MilestoneState, VerificationType } from '@/types/protocol';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'danger' | 'purple' | 'mono';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'sm', className = '' }: BadgeProps) {
  const variantStyles = {
    default: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    success: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80',
    warning: 'bg-amber-950/80 text-amber-400 border-amber-800/80',
    info: 'bg-cyan-950/80 text-cyan-400 border-cyan-800/80',
    danger: 'bg-rose-950/80 text-rose-400 border-rose-800/80',
    purple: 'bg-purple-950/80 text-purple-400 border-purple-800/80',
    mono: 'bg-black text-zinc-300 border-zinc-800 font-mono',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 tracking-wider',
    md: 'text-xs px-2.5 py-1 tracking-wider font-medium',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border uppercase font-mono font-medium ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
}

export function AgreementStateBadge({ state }: { state: AgreementState }) {
  switch (state) {
    case AgreementState.DRAFT:
      return <Badge variant="default">DRAFT</Badge>;
    case AgreementState.FUNDED:
      return <Badge variant="warning">FUNDED IN ESCROW</Badge>;
    case AgreementState.ACTIVE:
      return <Badge variant="info">ACTIVE</Badge>;
    case AgreementState.COMPLETED:
      return <Badge variant="success">COMPLETED</Badge>;
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
        <Badge variant="default">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
          PENDING
        </Badge>
      );
    case MilestoneState.EVIDENCE_SUBMITTED:
      return (
        <Badge variant="warning">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
          EVIDENCE SUBMITTED
        </Badge>
      );
    case MilestoneState.VERIFIED:
      return (
        <Badge variant="info">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
          VERIFIED
        </Badge>
      );
    case MilestoneState.RELEASED:
      return (
        <Badge variant="success">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          RELEASED (SETTLED)
        </Badge>
      );
    default:
      return <Badge>{state}</Badge>;
  }
}

export function VerificationTypeBadge({ type }: { type: VerificationType }) {
  switch (type) {
    case VerificationType.SPONSOR:
      return <Badge variant="mono">Sponsor Sign-off</Badge>;
    case VerificationType.ON_CHAIN_ORACLE:
      return <Badge variant="purple">On-Chain Oracle</Badge>;
    case VerificationType.ATTESTATION:
      return <Badge variant="info">Cryptographic Attestation</Badge>;
    default:
      return null;
  }
}
