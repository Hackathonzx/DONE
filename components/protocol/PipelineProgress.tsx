import React from 'react';
import { MilestoneState } from '@/types/protocol';
import { Check, ArrowRight } from 'lucide-react';

export function PipelineProgress({ state }: { state: MilestoneState }) {
  const steps = [
    {
      id: 'dod',
      name: 'Definition of Done',
      short: 'DoD Committed',
      completed: true, // Always committed at creation
      current: state === MilestoneState.PENDING,
    },
    {
      id: 'evidence',
      name: 'Evidence Submission',
      short: 'Evidence Proof',
      completed:
        state === MilestoneState.EVIDENCE_SUBMITTED ||
        state === MilestoneState.VERIFIED ||
        state === MilestoneState.RELEASED,
      current: state === MilestoneState.EVIDENCE_SUBMITTED,
    },
    {
      id: 'verification',
      name: 'Verification',
      short: 'DoD Verified',
      completed: state === MilestoneState.VERIFIED || state === MilestoneState.RELEASED,
      current: state === MilestoneState.VERIFIED,
    },
    {
      id: 'settlement',
      name: 'Settlement Release',
      short: 'USDC Released',
      completed: state === MilestoneState.RELEASED,
      current: false,
    },
  ];

  return (
    <div className="w-full font-mono text-xs">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {steps.map((step, idx) => {
          return (
            <div
              key={step.id}
              className={`p-2.5 border transition-all ${
                step.completed
                  ? 'bg-zinc-900/90 border-emerald-800/80 text-emerald-300'
                  : step.current
                  ? 'bg-zinc-900 border-cyan-500 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                  : 'bg-zinc-950/40 border-zinc-800 text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-mono tracking-wider opacity-75">
                  STAGE {idx + 1}
                </span>
                {step.completed && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                {step.current && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
              </div>
              <p className="font-semibold text-xs truncate">{step.short}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
