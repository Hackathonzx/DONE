import { PublicKey } from '@solana/web3.js';
import {
  AgreementAccount,
  AgreementState,
  MilestoneAccount,
  MilestoneState,
  VerificationType,
  ProtocolLogEntry,
} from '@/types/protocol';
import {
  fetchAllOnChainAgreements,
  executeOnChainCreateAgreement,
  executeOnChainAcceptAgreement,
  executeOnChainFundAgreement,
  executeOnChainSubmitEvidence,
  executeOnChainVerifyEvidence,
  executeOnChainRejectEvidence,
  executeOnChainReleaseMilestone,
  executeOnChainCancelAgreement,
} from './anchorClient';
import { saveOffchainMetadata, updateOffchainMilestoneEvidence, updateOffchainMilestoneRejection } from './metadataStore';
import { uint8ArrayToHex } from './hashing';
import { DEVNET_USDC_MINT } from '../solana';

const STORAGE_LOGS_KEY = 'done_protocol_logs_v1';

export class ProtocolClient {
  public async getAgreements(): Promise<AgreementAccount[]> {
    return fetchAllOnChainAgreements();
  }

  public async getAgreement(publicKey: string): Promise<AgreementAccount | null> {
    const list = await this.getAgreements();
    return list.find((a) => a.publicKey === publicKey) || null;
  }

  public async getMilestone(
    agreementId: string,
    index: number
  ): Promise<{ agreement: AgreementAccount; milestone: MilestoneAccount } | null> {
    const agreement = await this.getAgreement(agreementId);
    if (!agreement) return null;
    const milestone = agreement.milestones.find((m) => m.index === index);
    if (!milestone) return null;
    return { agreement, milestone };
  }

  public getLogs(): ProtocolLogEntry[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_LOGS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public appendLog(entry: Omit<ProtocolLogEntry, 'id' | 'timestamp'>) {
    if (typeof window === 'undefined') return;
    try {
      const logs = this.getLogs();
      logs.unshift({
        ...entry,
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
      });
      localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(logs.slice(0, 50)));
    } catch {
      // ignore
    }
  }
}

export const protocolClient = new ProtocolClient();
