import { PublicKey } from '@solana/web3.js';

export enum AgreementState {
  DRAFT = 'DRAFT',
  FUNDED = 'FUNDED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum MilestoneState {
  PENDING = 'PENDING',
  EVIDENCE_SUBMITTED = 'EVIDENCE_SUBMITTED',
  VERIFIED = 'VERIFIED',
  RELEASED = 'RELEASED',
}

export enum VerificationType {
  SPONSOR = 0,
  ON_CHAIN_ORACLE = 1,
  ATTESTATION = 2,
}

export interface EvidenceRecord {
  evidenceHash: string; // Hex representation of SHA-256
  metadataUri: string;
  notes: string;
  submittedAt: number;
  submittedBy: string;
  deliverableLinks: string[];
}

export interface VerificationRecord {
  verifiedAt: number;
  verifiedBy: string;
  notes: string;
  signature?: string;
  attestationUid?: string;
}

export interface MilestoneAccount {
  publicKey: string;
  agreement: string;
  index: number;
  title: string;
  description: string;
  amountUsdc: number; // in base units (6 decimals)
  dodCriteria: string[];
  dodHash: string; // Hex string of canonical SHA-256
  verificationType: VerificationType;
  verifier: string;
  state: MilestoneState;
  evidence?: EvidenceRecord;
  verification?: VerificationRecord;
  settlementTx?: string;
  releasedAt?: number;
}

export interface AgreementAccount {
  publicKey: string;
  sponsor: string;
  worker: string;
  title: string;
  description: string;
  termsText: string;
  termsHash: string; // Hex string of SHA-256
  totalAmountUsdc: number; // in base units (6 decimals)
  state: AgreementState;
  milestoneCount: number;
  createdAt: number;
  fundedAt?: number;
  fundingTx?: string;
  vaultPda: string;
  bump: number;
  milestones: MilestoneAccount[];
}

export interface TransactionExecutionState {
  status: 'idle' | 'requesting_signature' | 'confirming' | 'confirmed' | 'failed';
  actionName?: string;
  signature?: string;
  slot?: number;
  computeUnits?: number;
  feeLamports?: number;
  error?: string;
  instructionSummary?: string;
}

export interface DoneProtocolProgram {
  createAgreement(params: {
    worker: PublicKey;
    termsHash: Uint8Array;
    milestoneCount: number;
    title: string;
    description: string;
    termsText: string;
  }): Promise<{ signature: string; agreementPda: PublicKey }>;

  createMilestone(params: {
    agreement: PublicKey;
    index: number;
    amount: number; // in raw USDC base units
    dodHash: Uint8Array;
    verificationType: VerificationType;
    title: string;
    description: string;
    dodCriteria: string[];
  }): Promise<{ signature: string; milestonePda: PublicKey }>;

  fundAgreement(params: {
    agreement: PublicKey;
    amount: number;
  }): Promise<{ signature: string; vaultPda: PublicKey }>;

  submitEvidence(params: {
    agreement: PublicKey;
    milestoneIndex: number;
    evidenceHash: Uint8Array;
    metadataUri: string;
    notes: string;
    deliverableLinks: string[];
  }): Promise<{ signature: string }>;

  verifyMilestone(params: {
    agreement: PublicKey;
    milestoneIndex: number;
    notes?: string;
  }): Promise<{ signature: string }>;

  releasePayment(params: {
    agreement: PublicKey;
    milestoneIndex: number;
  }): Promise<{ signature: string; workerAta: PublicKey }>;
}
