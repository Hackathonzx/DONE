'use client';

import React, { useState, useEffect } from 'react';
import { MilestoneAccount } from '@/types/protocol';
import { prepareAccountVerificationRecipe } from '@/lib/protocol/recipe';
import { executeOnChainSubmitEvidence } from '@/lib/protocol/anchorClient';
import { updateOffchainMilestoneEvidence } from '@/lib/protocol/metadataStore';
import { useWallet } from '@/components/web3/WalletContext';
import { PublicKey } from '@solana/web3.js';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { Card, CardHeader, CardContent, CardFooter } from '../ui/Card';
import { UploadCloud, Link as LinkIcon, Plus, Trash2, CheckCircle2 } from 'lucide-react';

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
  const { publicKey, signTransaction } = useWallet();
  const [metadataUri, setMetadataUri] = useState('https://explorer.solana.com/address/82MCkYR3RkcqBcYWDDixbaoi4bWL8w5ohu7UkJTiZXYM?cluster=devnet');
  const [notes, setNotes] = useState('Executed automated account-check verification on Devnet with verified ProgramData PDA linkage.');
  const [deliverableLinks, setDeliverableLinks] = useState<string[]>(['https://github.com/Hackathonzx/DONE/tree/smart-contract']);
  const [liveHash, setLiveHash] = useState<string>('');
  const [evidenceBytes, setEvidenceBytes] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    prepareAccountVerificationRecipe()
      .then((recipe) => {
        if (active) {
          setLiveHash(recipe.evidenceHashHex);
          setEvidenceBytes(recipe.evidenceHashBytes);
        }
      })
      .catch(console.error);
    return () => {
      active = false;
    };
  }, []);

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
    if (!publicKey || !liveHash) return;
    setIsSubmitting(true);
    try {
      await onExecute(
        'submitEvidence',
        `Submitting 32-byte verified account-check evidence hash to Milestone #${milestone.index + 1}`,
        async () => {
          const rec = await prepareAccountVerificationRecipe();
          const sig = await executeOnChainSubmitEvidence(
            publicKey,
            new PublicKey(agreementKey),
            new PublicKey(milestone.publicKey),
            new Uint8Array(rec.evidenceHashBytes),
            { signTransaction }
          );

          updateOffchainMilestoneEvidence(agreementKey, milestone.index, {
            notes,
            links: deliverableLinks.filter(Boolean),
            metadataUri,
          });

          return { signature: sig };
        }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="font-mono">
      <CardHeader>
        <div className="flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-white" />
          <h3 className="font-bold text-sm text-white uppercase tracking-wider">
            SUBMIT VERIFIABLE WORK EVIDENCE
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-violet-400 font-bold">SOLANA RECIPE</span>
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <p className="text-xs text-neutral-400">
            Submit cryptographic proof and artifact references to satisfy the committed Definition of Done criteria.
          </p>

          <div className="p-3.5 bg-[#000000] border border-[#26262a] rounded-xl space-y-2">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
              TARGET DEFINITION OF DONE CRITERIA ({milestone.dodCriteria.length})
            </span>
            <ul className="space-y-1.5 text-xs text-neutral-300">
              {milestone.dodCriteria.map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-violet-400 font-bold flex-shrink-0">[{i + 1}]</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          <Input
            label="METADATA / ARTIFACT URI"
            helperText="Permanent URI referencing the target deployment or verification artifacts."
            value={metadataUri}
            onChange={(e) => setMetadataUri(e.target.value)}
            required
            placeholder="https://explorer.solana.com/address/..."
          />

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-neutral-300 tracking-wide flex items-center gap-1.5">
                <LinkIcon className="w-3 h-3 text-white" />
                VERIFICATION LINKS & REPO REFERENCES
              </label>
              <button
                type="button"
                onClick={addLink}
                className="text-[11px] text-violet-400 hover:text-violet-300 inline-flex items-center gap-1"
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
                    className="p-2 text-neutral-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <Textarea
            label="SUBMISSION NOTES & AUDIT SUMMARY"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            required
            placeholder="Documenting execution steps, test commands, and invariant confirmation..."
          />

          <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
              CANONICAL SHA-256 EVIDENCE COMMITMENT:
            </span>
            <div className="text-[11px] text-amber-400 font-mono break-all">{liveHash || 'Calculating...'}</div>
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <span className="text-[11px] text-neutral-500">
            Recorded on Solana Devnet Milestone Account
          </span>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitting || !liveHash}
            isLoading={isSubmitting}
            className="bg-violet-600 hover:bg-violet-500 font-bold"
          >
            Submit Evidence to Chain
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
