'use client';

import React, { useState, useEffect } from 'react';
import { MilestoneAccount } from '@/types/protocol';
import { hashEvidencePayload, uint8ArrayToHex } from '@/lib/protocol/hashing';
import { protocolClient } from '@/lib/protocol/client';
import { PublicKey } from '@solana/web3.js';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { Card, CardHeader, CardContent, CardFooter } from '../ui/Card';
import { UploadCloud, Link as LinkIcon, ShieldAlert, CheckCircle2, Plus, Trash2 } from 'lucide-react';

interface EvidenceFormProps {
  agreementKey: string;
  milestone: MilestoneAccount;
  onExecute: (
    actionName: string,
    instructionSummary: string,
    fn: () => Promise<{ signature: string }>
  ) => Promise<any>;
}

export function EvidenceForm({ agreementKey, milestone, onExecute }: EvidenceFormProps) {
  const [metadataUri, setMetadataUri] = useState('https://arweave.net/tx_deliverable_artifact_v1.tar.gz');
  const [notes, setNotes] = useState('');
  const [deliverableLinks, setDeliverableLinks] = useState<string[]>([
    'https://github.com/project/core/pull/101',
  ]);
  const [liveHash, setLiveHash] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recompute canonical SHA-256 evidence hash on change
  useEffect(() => {
    let active = true;
    const compute = async () => {
      const buffer = await hashEvidencePayload({
        metadataUri,
        notes,
        deliverableLinks: deliverableLinks.filter(Boolean),
      });
      if (active) {
        setLiveHash(uint8ArrayToHex(buffer));
      }
    };
    compute();
    return () => {
      active = false;
    };
  }, [metadataUri, notes, deliverableLinks]);

  const addLink = () => setDeliverableLinks([...deliverableLinks, '']);
  const updateLink = (index: number, val: string) => {
    const updated = [...deliverableLinks];
    updated[index] = val;
    setDeliverableLinks(updated);
  };
  const removeLink = (index: number) => {
    setDeliverableLinks(deliverableLinks.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metadataUri.trim() || !notes.trim()) return;

    setIsSubmitting(true);
    try {
      const hashBuffer = await hashEvidencePayload({
        metadataUri,
        notes,
        deliverableLinks: deliverableLinks.filter(Boolean),
      });

      await onExecute(
        'submitEvidence',
        `Submitting evidence hash for Milestone #${milestone.index} (${liveHash.slice(0, 16)}...)`,
        async () => {
          return protocolClient.submitEvidence({
            agreement: new PublicKey(agreementKey),
            milestoneIndex: milestone.index,
            evidenceHash: hashBuffer,
            metadataUri,
            notes,
            deliverableLinks: deliverableLinks.filter(Boolean),
          });
        }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-cyan-900/60 bg-zinc-950 font-mono">
      <CardHeader className="bg-zinc-900/60">
        <div className="flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-cyan-400" />
          <h3 className="font-bold text-sm text-zinc-100 uppercase tracking-wider">
            SUBMIT VERIFIABLE WORK EVIDENCE
          </h3>
        </div>
        <span className="text-[11px] text-zinc-400">WORKER ACTION</span>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <p className="text-xs text-zinc-400">
            Submit cryptographic proof and artifact references to satisfy the committed Definition of Done criteria. Once submitted, the verifier will validate the evidence hash against the criteria.
          </p>

          {/* DoD Criteria checklist summary for worker reference */}
          <div className="p-3 bg-zinc-900/70 border border-zinc-800 space-y-2">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
              TARGET DEFINITION OF DONE CRITERIA ({milestone.dodCriteria.length})
            </span>
            <ul className="space-y-1.5 text-xs text-zinc-300">
              {milestone.dodCriteria.map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold flex-shrink-0">[{i + 1}]</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Metadata URI */}
          <Input
            label="METADATA / ARTIFACT URI (ARWEAVE, IPFS, OR GITHUB RELEASE)"
            helperText="Permanent decentralised URI referencing the completed deliverables or archive."
            value={metadataUri}
            onChange={(e) => setMetadataUri(e.target.value)}
            required
            placeholder="https://arweave.net/..."
          />

          {/* Deliverable links */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-zinc-300 tracking-wide flex items-center gap-1.5">
                <LinkIcon className="w-3 h-3 text-cyan-400" />
                VERIFICATION LINKS & PR REFERENCES
              </label>
              <button
                type="button"
                onClick={addLink}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Link
              </button>
            </div>
            {deliverableLinks.map((link, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input
                  value={link}
                  onChange={(e) => updateLink(idx, e.target.value)}
                  placeholder="https://github.com/..."
                />
                {deliverableLinks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLink(idx)}
                    className="p-2 text-zinc-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Detailed Worker Notes */}
          <Textarea
            label="EXECUTION NOTES & COMPLIANCE SUMMARY"
            helperText="Explain exactly how each DoD requirement was executed and tested."
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            required
            placeholder="Documenting execution steps, test commands, and invariant confirmation..."
          />

          {/* Live Canonical Hash Display */}
          <div className="p-3 bg-zinc-900 border border-zinc-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
              CANONICAL SHA-256 EVIDENCE COMMITMENT (PRE-IMAGE DETERMINISTIC)
            </span>
            <div className="text-[11px] text-amber-300 font-mono break-all">{liveHash}</div>
          </div>
        </CardContent>

        <CardFooter className="justify-between">
          <span className="text-[11px] text-zinc-400">
            Recorded directly to Milestone Account on Solana Devnet
          </span>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitting || !metadataUri.trim() || !notes.trim()}
            isLoading={isSubmitting}
          >
            Submit Evidence to On-Chain Milestone
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
