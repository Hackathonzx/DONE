import { PublicKey, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import {
  AgreementAccount,
  AgreementState,
  DoneProtocolProgram,
  MilestoneAccount,
  MilestoneState,
  VerificationType,
} from '@/types/protocol';
import {
  getAgreementPda,
  getMilestonePda,
  getVaultPda,
} from './pda';
import { uint8ArrayToHex } from './hashing';
import { DONE_PROGRAM_ID } from '../solana';

const STORAGE_KEY = 'done_protocol_agreements_v1';

// Standard mock demo public keys for quick role simulation
export const DEMO_KEYS = {
  SPONSOR: '9t5GfRHsKY6QSDDwMiYvGNYp2wNgviSmzSgABGBTxJTA',
  WORKER: '4bpeHo134aPUiBm3Jgmrjm7tMJ9q3Q3n6cEhTJw3EVwR',
  ORACLE: '62FaF5bBh5RD4i3hdggdNKKrGG6CUy8C4VdWLWHq4yx3',
};

// Generate realistic 88-char base58 Solana transaction signature
function generateTxSignature(): string {
  const randomBytes = new Uint8Array(64);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < 64; i++) randomBytes[i] = Math.floor(Math.random() * 256);
  }
  return bs58.encode(randomBytes);
}

// Generate valid base58 public key string
function generateRandomPublicKey(): string {
  return Keypair.generate().publicKey.toBase58();
}

const INITIAL_SEED_AGREEMENTS: AgreementAccount[] = [
  {
    publicKey: '4xs4yBNNMoWmwsWQi6MEGCjGofSU9xL9GeYh3rQKy8x4',
    sponsor: DEMO_KEYS.SPONSOR,
    worker: DEMO_KEYS.WORKER,
    title: 'Anchor Smart Contract Security Audit',
    description:
      'Comprehensive security assessment of DONE Protocol Anchor programs on Solana Devnet including invariant testing and fuzzing.',
    termsText:
      '1. Scope includes protocol core program and token escrow vaults.\n2. Severity classification follows Immunefi standard.\n3. Remediation report required prior to final settlement.',
    termsHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    totalAmountUsdc: 15_000_000_000, // 15,000 USDC
    state: AgreementState.ACTIVE,
    milestoneCount: 3,
    createdAt: Date.now() - 86400000 * 7,
    fundedAt: Date.now() - 86400000 * 6,
    fundingTx: '5hXN9bFwK2vR8pL4mJ7tY3zQ6sB1nD9xE2aC8vM4tP7kL3wQ6sB1nD9xE2aC8vM4tP7kL3wQ6sB1nD9xE2aC8vM4',
    vaultPda: 'J4XfJZhGY9MN2eJYC2EDQZjSpesw3KngbNNNnBUNiYRr',
    bump: 254,
    milestones: [
      {
        publicKey: '2da4ecoyGLD5xmQfUXu8ZQWGf5Kmt7AqayXL289u1AnD',
        agreement: '4xs4yBNNMoWmwsWQi6MEGCjGofSU9xL9GeYh3rQKy8x4',
        index: 0,
        title: 'Milestone 0: Threat Modeling & Static Analysis',
        description: 'Delivery of preliminary architecture threat model and static tool analysis reports.',
        amountUsdc: 4_000_000_000, // 4,000 USDC
        dodCriteria: [
          'Architecture threat model document covering all CPI call paths',
          'Automated Slither / cargo-audit report with zero unaddressed high-risk alerts',
          'Initial security findings memo signed by Lead Security Researcher',
        ],
        dodHash: '8f434346648f6b96df89dda901c5176b10f60753b8c01210b0e4d003ecd3c4b7',
        verificationType: VerificationType.SPONSOR,
        verifier: DEMO_KEYS.SPONSOR,
        state: MilestoneState.RELEASED,
        evidence: {
          evidenceHash: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
          metadataUri: 'https://arweave.net/tx_threat_model_report_final_v1.pdf',
          notes: 'Static analysis and threat model completed. Found 2 medium findings which are documented in report.',
          submittedAt: Date.now() - 86400000 * 5,
          submittedBy: DEMO_KEYS.WORKER,
          deliverableLinks: [
            'https://github.com/done-protocol/audits/pull/12',
            'https://arweave.net/tx_threat_model_report_final_v1.pdf',
          ],
        },
        verification: {
          verifiedAt: Date.now() - 86400000 * 4,
          verifiedBy: DEMO_KEYS.SPONSOR,
          notes: 'Verified all 3 criteria satisfied against cryptographic commit.',
          signature: '2vM4tP7kL3wQ6sB1nD9xE2aC8vM4tP7kL3wQ6sB1nD9xE2aC8vM4tP7kL3wQ6sB1nD9xE2aC8vM4tP7kL3wQ6s',
        },
        settlementTx: '4zL9wE2aC8vM4tP7kL3wQ6sB1nD9xE2aC8vM4tP7kL3wQ6sB1nD9xE2aC8vM4tP7kL3wQ6sB1nD9xE2aC8vM4tP',
        releasedAt: Date.now() - 86400000 * 4,
      },
      {
        publicKey: 'CfSVNb8SXjifbtJx3qtiTcGXu6deDHdSM39jivh7t8gM',
        agreement: '4xs4yBNNMoWmwsWQi6MEGCjGofSU9xL9GeYh3rQKy8x4',
        index: 1,
        title: 'Milestone 1: Fuzz Testing & Invariant Analysis',
        description: 'Trident fuzz test suite verifying solvency and PDA reentrancy safety.',
        amountUsdc: 6_000_000_000, // 6,000 USDC
        dodCriteria: [
          'Trident fuzzing test suite run for minimum 10,000,000 iterations',
          'Zero state invariants violated on Escrow Vault balance consistency',
          'Pull request merged into target protocol repository test tree',
        ],
        dodHash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
        verificationType: VerificationType.SPONSOR,
        verifier: DEMO_KEYS.SPONSOR,
        state: MilestoneState.VERIFIED,
        evidence: {
          evidenceHash: 'c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3',
          metadataUri: 'https://arweave.net/tx_trident_fuzz_run_10m_iters.json',
          notes: 'Executed 12.5M Trident iterations with 100% invariant assertion pass rate.',
          submittedAt: Date.now() - 86400000 * 2,
          submittedBy: DEMO_KEYS.WORKER,
          deliverableLinks: [
            'https://github.com/done-protocol/core/actions/runs/849201948',
            'https://arweave.net/tx_trident_fuzz_run_10m_iters.json',
          ],
        },
        verification: {
          verifiedAt: Date.now() - 86400000 * 1,
          verifiedBy: DEMO_KEYS.SPONSOR,
          notes: 'Verified logs and merged PR #45. Verification passed. Ready for settlement release.',
          signature: '3wQ6sB1nD9xE2aC8vM4tP7kL3wQ6sB1nD9xE2aC8vM4tP7kL3wQ6sB1nD9xE2aC8vM4tP7kL3wQ6sB1nD9xE2a',
        },
      },
      {
        publicKey: '86g5VFY517Wf99162hbcK6fXvMhvX5XMEvjCBCMSKqmV',
        agreement: '4xs4yBNNMoWmwsWQi6MEGCjGofSU9xL9GeYh3rQKy8x4',
        index: 2,
        title: 'Milestone 2: Remediation Verification & Final Report',
        description: 'Final audit report delivery and review of fixes deployed by core team.',
        amountUsdc: 5_000_000_000, // 5,000 USDC
        dodCriteria: [
          'Verification of PR fixes for all Medium/High severity findings',
          'Cryptographically signed Executive Summary PDF uploaded to Arweave',
          'Public presentation recording delivered to engineering leadership',
        ],
        dodHash: 'b5c6d7e8f90123456789abcdef0123456789abcdef01a1b2c3d4e5f60718293a4',
        verificationType: VerificationType.SPONSOR,
        verifier: DEMO_KEYS.SPONSOR,
        state: MilestoneState.PENDING,
      },
    ],
  },
  {
    publicKey: 'Fh1c4NRVwSAuKkvBgPQXqTrLLR19gzt1QhU9aqx7wH7t',
    sponsor: DEMO_KEYS.SPONSOR,
    worker: DEMO_KEYS.WORKER,
    title: 'Solana RPC Indexer Subgraph Implementation',
    description:
      'High-throughput Geyser plugin indexer streaming on-chain DONE protocol account states into PostgreSQL with sub-100ms latency.',
    termsText:
      'Worker agrees to deliver Dockerized Geyser plugin, database schema migrations, and GraphQL query engine endpoint with 99.9% uptime test.',
    termsHash: '4a5b6c7d8e9f0123456789abcdef0123456789abcdef0123456789abcdef0123',
    totalAmountUsdc: 8_500_000_000, // 8,500 USDC
    state: AgreementState.FUNDED,
    milestoneCount: 2,
    createdAt: Date.now() - 86400000 * 3,
    fundedAt: Date.now() - 86400000 * 2,
    fundingTx: '3mB5xQ8zP1sL4dK9wE6cF3yH8aR2tM7vX2vR8pL4mJ7tY3zQ6sB1nD9xE2aC8vM4tP7kL3wQ6sB1nD9xE2aC8vM4',
    vaultPda: 'BfhBRqe1bG392AvNxDuDaFfpAsxoeHzAyv1PZi62mCCN',
    bump: 253,
    milestones: [
      {
        publicKey: '9RmDV7FnY8ZfGGjDv48b2LJt2D3Kcu7xpkmSAttRRhgP',
        agreement: 'Fh1c4NRVwSAuKkvBgPQXqTrLLR19gzt1QhU9aqx7wH7t',
        index: 0,
        title: 'Milestone 0: Geyser Ingestion & Schema Migration',
        description: 'Core plugin binary listening to Solana Devnet accounts with zero dropped messages.',
        amountUsdc: 4_500_000_000,
        dodCriteria: [
          'Geyser plugin compiled with Rust 1.75+ against solana-geyser-plugin-interface 1.18',
          'Postgres DDL migrations created for agreement and milestone accounts',
          'Integration test asserting zero dropped slots over 24h Devnet continuous stream',
        ],
        dodHash: 'f7e6d5c4b3a201928374655647382910abcdef0123456789abcdef0123456789',
        verificationType: VerificationType.ON_CHAIN_ORACLE,
        verifier: DEMO_KEYS.ORACLE,
        state: MilestoneState.EVIDENCE_SUBMITTED,
        evidence: {
          evidenceHash: '7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a',
          metadataUri: 'https://arweave.net/tx_indexer_geyser_build_v0.1.tar.gz',
          notes: 'Plugin tested on local validator and Devnet. 24-hour test log attached with 0 dropped events.',
          submittedAt: Date.now() - 3600000 * 8,
          submittedBy: DEMO_KEYS.WORKER,
          deliverableLinks: [
            'https://github.com/done-protocol/indexer-geyser/releases/tag/v0.1.0',
            'https://grafana.devnet.doneprotocol.io/d/geyser-solana-health',
          ],
        },
      },
      {
        publicKey: 'DBjaiV65TeMBpNzgsYN1bhBD4URtWjQJLfqFkURaAQNz',
        agreement: 'Fh1c4NRVwSAuKkvBgPQXqTrLLR19gzt1QhU9aqx7wH7t',
        index: 1,
        title: 'Milestone 1: Production GraphQL API & Stress Test',
        description: 'Exposing indexed data with pagination and sub-50ms query response time.',
        amountUsdc: 4_000_000_000,
        dodCriteria: [
          'Hasura / Apollo GraphQL endpoint querying agreements by sponsor and worker',
          'k6 load test report demonstrating 2,500 req/sec at p95 latency < 50ms',
          'Documentation book and Docker Compose production deployment stack',
        ],
        dodHash: '123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0',
        verificationType: VerificationType.SPONSOR,
        verifier: DEMO_KEYS.SPONSOR,
        state: MilestoneState.PENDING,
      },
    ],
  },
  {
    publicKey: 'ByDCJfo9unCyCyp11ZRT1rx3WbEE8cJ8tx5N5Q362ggA',
    sponsor: DEMO_KEYS.SPONSOR,
    worker: DEMO_KEYS.WORKER,
    title: 'Cross-Program Invocation (CPI) Oracle Feeder',
    description: 'Autonomous keeper bot for validating attestation payloads and triggering on-chain settlements.',
    termsText: 'Complete delivery of open-source keeper agent with automated gas refunding.',
    termsHash: '9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
    totalAmountUsdc: 6_000_000_000,
    state: AgreementState.COMPLETED,
    milestoneCount: 2,
    createdAt: Date.now() - 86400000 * 20,
    fundedAt: Date.now() - 86400000 * 19,
    fundingTx: '7wX2bM1nJ6tP4hK8aD3mQ9vSpon5orZk4uF8cE3vL9qY7wX2bM1nJ6tP4hK8aD3mQ9vSpon5orZk4uF8cE3vL9qY',
    vaultPda: 'epVaQ6gtt3z4fgCs8hz9U7xi75q9kbKAjBSDq16dCNY',
    bump: 255,
    milestones: [
      {
        publicKey: 'DDJt6nMymQwc8XK36YWhQ1tbeSRZizQwrMsepjro1axu',
        agreement: 'ByDCJfo9unCyCyp11ZRT1rx3WbEE8cJ8tx5N5Q362ggA',
        index: 0,
        title: 'Milestone 0: Attestation Verification Engine',
        description: 'Cryptographic attestation validator against EAS & Solana Ed25519 precompile.',
        amountUsdc: 3_000_000_000,
        dodCriteria: ['Ed25519 signature instruction verification on Devnet', '100% test coverage on valid/invalid signatures'],
        dodHash: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
        verificationType: VerificationType.SPONSOR,
        verifier: DEMO_KEYS.SPONSOR,
        state: MilestoneState.RELEASED,
        releasedAt: Date.now() - 86400000 * 14,
        settlementTx: '8pL4mJ7tY3zQ6sB1nD9xE2aC8vM4tP7kL3wQ6sB1nD9xE2aC8vM4tP7kL3wQ6sB1nD9xE2aC8vM4tP7kL3wQ6sB1',
      },
      {
        publicKey: '3GxBMwfd9XHHYvZDrT2yAuG3mbLGYT7nUYiaddY8JZ2b',
        agreement: 'ByDCJfo9unCyCyp11ZRT1rx3WbEE8cJ8tx5N5Q362ggA',
        index: 1,
        title: 'Milestone 1: Automated Settlement Keeper Bot',
        description: 'Docker image configured with priority fee estimator for automated settlement dispatch.',
        amountUsdc: 3_000_000_000,
        dodCriteria: ['Keeper bot packaged with Docker compose', 'Automatic tip routing via Jito or standard priority fee'],
        dodHash: 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
        verificationType: VerificationType.SPONSOR,
        verifier: DEMO_KEYS.SPONSOR,
        state: MilestoneState.RELEASED,
        releasedAt: Date.now() - 86400000 * 10,
        settlementTx: '9xE2aC8vM4tP7kL3wQ6sB1nD9xE2aC8vM4tP7kL3wQ6sB1nD9xE2aC8vM4tP7kL3wQ6sB1nD9xE2aC8vM4tP7k',
      },
    ],
  },
];

class ProtocolClient implements DoneProtocolProgram {
  private isLiveContract: boolean = false; // Toggle to true when live Devnet contract deployed

  public isUsingLiveContract(): boolean {
    return this.isLiveContract;
  }

  public setUseLiveContract(val: boolean) {
    this.isLiveContract = val;
  }

  private loadAgreements(): AgreementAccount[] {
    if (typeof window === 'undefined') return INITIAL_SEED_AGREEMENTS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SEED_AGREEMENTS));
        return INITIAL_SEED_AGREEMENTS;
      }
      return JSON.parse(stored);
    } catch {
      return INITIAL_SEED_AGREEMENTS;
    }
  }

  private saveAgreements(agreements: AgreementAccount[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(agreements));
    } catch (e) {
      console.error('Failed to persist protocol agreements to storage', e);
    }
  }

  public resetToDefaultSeed(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SEED_AGREEMENTS));
    }
  }

  public async getAgreements(): Promise<AgreementAccount[]> {
    return this.loadAgreements();
  }

  public async getAgreement(publicKey: string): Promise<AgreementAccount | null> {
    const list = this.loadAgreements();
    return list.find((a) => a.publicKey === publicKey) || null;
  }

  public async getMilestone(
    agreementKey: string,
    index: number
  ): Promise<{ agreement: AgreementAccount; milestone: MilestoneAccount } | null> {
    const agreement = await this.getAgreement(agreementKey);
    if (!agreement) return null;
    const milestone = agreement.milestones.find((m) => m.index === index);
    if (!milestone) return null;
    return { agreement, milestone };
  }

  /**
   * Instruction: createAgreement
   */
  public async createAgreement(params: {
    worker: PublicKey;
    termsHash: Uint8Array;
    milestoneCount: number;
    title: string;
    description: string;
    termsText: string;
  }): Promise<{ signature: string; agreementPda: PublicKey }> {
    const agreements = this.loadAgreements();
    const sponsorKey = new PublicKey(DEMO_KEYS.SPONSOR);
    const nonce = Date.now();
    const [agreementPda, bump] = getAgreementPda(sponsorKey, nonce);
    const [vaultPda] = getVaultPda(agreementPda);

    const signature = generateTxSignature();
    const termsHashHex = uint8ArrayToHex(params.termsHash);

    const newAgreement: AgreementAccount = {
      publicKey: agreementPda.toBase58(),
      sponsor: sponsorKey.toBase58(),
      worker: params.worker.toBase58(),
      title: params.title,
      description: params.description,
      termsText: params.termsText,
      termsHash: termsHashHex,
      totalAmountUsdc: 0,
      state: AgreementState.DRAFT,
      milestoneCount: params.milestoneCount,
      createdAt: Date.now(),
      vaultPda: vaultPda.toBase58(),
      bump,
      milestones: [],
    };

    agreements.unshift(newAgreement);
    this.saveAgreements(agreements);

    return { signature, agreementPda };
  }

  /**
   * Instruction: createMilestone
   */
  public async createMilestone(params: {
    agreement: PublicKey;
    index: number;
    amount: number;
    dodHash: Uint8Array;
    verificationType: VerificationType;
    title: string;
    description: string;
    dodCriteria: string[];
  }): Promise<{ signature: string; milestonePda: PublicKey }> {
    const agreements = this.loadAgreements();
    const agreementIndex = agreements.findIndex((a) => a.publicKey === params.agreement.toBase58());
    if (agreementIndex === -1) {
      throw new Error('Agreement account not found on-chain');
    }

    const [milestonePda] = getMilestonePda(params.agreement, params.index);
    const signature = generateTxSignature();
    const dodHashHex = uint8ArrayToHex(params.dodHash);

    const newMilestone: MilestoneAccount = {
      publicKey: milestonePda.toBase58(),
      agreement: params.agreement.toBase58(),
      index: params.index,
      title: params.title,
      description: params.description,
      amountUsdc: params.amount,
      dodCriteria: params.dodCriteria,
      dodHash: dodHashHex,
      verificationType: params.verificationType,
      verifier:
        params.verificationType === VerificationType.ON_CHAIN_ORACLE
          ? DEMO_KEYS.ORACLE
          : agreements[agreementIndex].sponsor,
      state: MilestoneState.PENDING,
    };

    agreements[agreementIndex].milestones.push(newMilestone);
    agreements[agreementIndex].totalAmountUsdc += params.amount;
    agreements[agreementIndex].milestoneCount = agreements[agreementIndex].milestones.length;

    this.saveAgreements(agreements);
    return { signature, milestonePda };
  }

  /**
   * Instruction: fundAgreement
   */
  public async fundAgreement(params: {
    agreement: PublicKey;
    amount: number;
  }): Promise<{ signature: string; vaultPda: PublicKey }> {
    const agreements = this.loadAgreements();
    const agreement = agreements.find((a) => a.publicKey === params.agreement.toBase58());
    if (!agreement) {
      throw new Error('Agreement account not found');
    }

    if (agreement.state !== AgreementState.DRAFT && agreement.state !== AgreementState.FUNDED) {
      throw new Error('ProgramError 6000: InvalidAgreementState. Cannot fund non-draft agreement.');
    }

    const signature = generateTxSignature();
    const [vaultPda] = getVaultPda(params.agreement);

    agreement.state = AgreementState.FUNDED;
    agreement.fundedAt = Date.now();
    agreement.fundingTx = signature;

    this.saveAgreements(agreements);
    return { signature, vaultPda };
  }

  /**
   * Instruction: submitEvidence
   */
  public async submitEvidence(params: {
    agreement: PublicKey;
    milestoneIndex: number;
    evidenceHash: Uint8Array;
    metadataUri: string;
    notes: string;
    deliverableLinks: string[];
  }): Promise<{ signature: string }> {
    const agreements = this.loadAgreements();
    const agreement = agreements.find((a) => a.publicKey === params.agreement.toBase58());
    if (!agreement) {
      throw new Error('Agreement not found');
    }

    const milestone = agreement.milestones.find((m) => m.index === params.milestoneIndex);
    if (!milestone) {
      throw new Error('Milestone index out of bounds');
    }

    if (milestone.state !== MilestoneState.PENDING) {
      throw new Error('Milestone is not in PENDING state');
    }

    const signature = generateTxSignature();
    const evidenceHashHex = uint8ArrayToHex(params.evidenceHash);

    milestone.evidence = {
      evidenceHash: evidenceHashHex,
      metadataUri: params.metadataUri,
      notes: params.notes,
      submittedAt: Date.now(),
      submittedBy: agreement.worker,
      deliverableLinks: params.deliverableLinks,
    };
    milestone.state = MilestoneState.EVIDENCE_SUBMITTED;

    // Transition agreement to ACTIVE if currently FUNDED
    if (agreement.state === AgreementState.FUNDED) {
      agreement.state = AgreementState.ACTIVE;
    }

    this.saveAgreements(agreements);
    return { signature };
  }

  /**
   * Instruction: verifyMilestone
   */
  public async verifyMilestone(params: {
    agreement: PublicKey;
    milestoneIndex: number;
    notes?: string;
  }): Promise<{ signature: string }> {
    const agreements = this.loadAgreements();
    const agreement = agreements.find((a) => a.publicKey === params.agreement.toBase58());
    if (!agreement) throw new Error('Agreement not found');

    const milestone = agreement.milestones.find((m) => m.index === params.milestoneIndex);
    if (!milestone) throw new Error('Milestone not found');

    if (milestone.state !== MilestoneState.EVIDENCE_SUBMITTED) {
      throw new Error('ProgramError 6001: InvalidDoDHash. Milestone must have evidence submitted.');
    }

    const signature = generateTxSignature();
    milestone.state = MilestoneState.VERIFIED;
    milestone.verification = {
      verifiedAt: Date.now(),
      verifiedBy: milestone.verifier,
      notes: params.notes || 'Definition of Done verified against canonical SHA-256 criteria.',
      signature,
    };

    this.saveAgreements(agreements);
    return { signature };
  }

  /**
   * Instruction: releasePayment
   */
  public async releasePayment(params: {
    agreement: PublicKey;
    milestoneIndex: number;
  }): Promise<{ signature: string; workerAta: PublicKey }> {
    const agreements = this.loadAgreements();
    const agreement = agreements.find((a) => a.publicKey === params.agreement.toBase58());
    if (!agreement) throw new Error('Agreement not found');

    const milestone = agreement.milestones.find((m) => m.index === params.milestoneIndex);
    if (!milestone) throw new Error('Milestone not found');

    if (milestone.state !== MilestoneState.VERIFIED) {
      throw new Error('ProgramError 6002: MilestoneNotVerified. Milestone must be in VERIFIED state before settlement release.');
    }

    const signature = generateTxSignature();
    milestone.state = MilestoneState.RELEASED;
    milestone.releasedAt = Date.now();
    milestone.settlementTx = signature;

    // Check if all milestones are released
    const allReleased = agreement.milestones.every((m) => m.state === MilestoneState.RELEASED);
    if (allReleased) {
      agreement.state = AgreementState.COMPLETED;
    }

    this.saveAgreements(agreements);
    const workerAta = new PublicKey(DEMO_KEYS.WORKER);
    return { signature, workerAta };
  }
}

export const protocolClient = new ProtocolClient();
