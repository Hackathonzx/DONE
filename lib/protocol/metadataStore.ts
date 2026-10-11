export interface OffchainMilestoneMetadata {
  index: number;
  title: string;
  description: string;
  dodCriteria: string[];
  verificationMethodLabel: string;
  evidenceNotes?: string;
  evidenceLinks?: string[];
  metadataUri?: string;
  rejectionReason?: string;
}

export interface OffchainAgreementMetadata {
  agreementPda: string;
  title: string;
  description: string;
  termsText: string;
  milestones: OffchainMilestoneMetadata[];
  createdAt: number;
}

const STORAGE_METADATA_PREFIX = 'done_protocol_meta_';

export function saveOffchainMetadata(data: OffchainAgreementMetadata): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_METADATA_PREFIX}${data.agreementPda}`, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save offchain metadata to localStorage:', err);
  }
}

export function getOffchainMetadata(agreementPda: string): OffchainAgreementMetadata | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_METADATA_PREFIX}${agreementPda}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse offchain metadata:', err);
    return null;
  }
}

export function updateOffchainMilestoneEvidence(
  agreementPda: string,
  milestoneIndex: number,
  evidence: {
    notes: string;
    links: string[];
    metadataUri?: string;
  }
): void {
  const current = getOffchainMetadata(agreementPda);
  if (!current) return;
  const milestone = current.milestones.find((m) => m.index === milestoneIndex);
  if (milestone) {
    milestone.evidenceNotes = evidence.notes;
    milestone.evidenceLinks = evidence.links;
    milestone.metadataUri = evidence.metadataUri;
    saveOffchainMetadata(current);
  }
}

export function updateOffchainMilestoneRejection(
  agreementPda: string,
  milestoneIndex: number,
  rejectionReason: string
): void {
  const current = getOffchainMetadata(agreementPda);
  if (!current) return;
  const milestone = current.milestones.find((m) => m.index === milestoneIndex);
  if (milestone) {
    milestone.rejectionReason = rejectionReason;
    saveOffchainMetadata(current);
  }
}
