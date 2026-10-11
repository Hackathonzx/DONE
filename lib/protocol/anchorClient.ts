import '@/lib/polyfills';
import * as anchor from '@coral-xyz/anchor';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import BN from 'bn.js';
import IDL from './idl/done_protocol.json';
import {
  DONE_PROGRAM_ID,
  DEVNET_USDC_MINT,
  DEVNET_RPC_URL,
  truncateAddress,
} from '../solana';
import {
  getAgreementPda,
  getMilestonePda,
  getEscrowAuthorityPda,
  getEscrowTokenAccountPda,
  getConfigPda,
} from './pda';
import {
  AgreementAccount,
  AgreementState,
  MilestoneAccount,
  MilestoneState,
  VerificationType,
} from '@/types/protocol';
import { getOffchainMetadata } from './metadataStore';

export interface WalletSigner {
  signTransaction: (tx: Transaction) => Promise<Transaction>;
}

// Stale CLI smoke-test account to exclude from frontend display
export const LEGACY_CLI_SMOKE_TEST_PDA = '5j9ppSy2X759be5ZHYuCgGeSwyZc3bKiAkGtf1Th67dF';

/**
 * Instantiate Anchor Program instance with connected signer or read-only provider
 */
export function getAnchorProgram(
  connection: Connection,
  walletPubkey?: PublicKey,
  signTransaction?: (tx: Transaction) => Promise<Transaction>
) {
  const dummyWallet: any = {
    publicKey: walletPubkey || PublicKey.default,
    signTransaction: (signTransaction ? (tx: any) => signTransaction(tx) : async (tx: any) => tx),
    signAllTransactions: async (txs: any[]) => txs,
    payer: anchor.web3.Keypair.generate(),
  };

  const provider = new anchor.AnchorProvider(
    connection,
    dummyWallet,
    anchor.AnchorProvider.defaultOptions()
  );

  return new anchor.Program(IDL as anchor.Idl, provider);
}

function parseAgreementStatus(statusObj: any): AgreementState {
  if (!statusObj) return AgreementState.DRAFT;
  if (typeof statusObj === 'string') {
    const s = statusObj.toLowerCase();
    if (s.includes('active')) return AgreementState.ACTIVE;
    if (s.includes('funded')) return AgreementState.FUNDED;
    if (s.includes('completed')) return AgreementState.COMPLETED;
    if (s.includes('cancelled')) return AgreementState.CANCELLED;
    return AgreementState.DRAFT;
  }
  if ('draft' in statusObj) return AgreementState.DRAFT;
  if ('funded' in statusObj) return AgreementState.FUNDED;
  if ('active' in statusObj) return AgreementState.ACTIVE;
  if ('completed' in statusObj) return AgreementState.COMPLETED;
  if ('cancelled' in statusObj) return AgreementState.CANCELLED;
  return AgreementState.DRAFT;
}

function parseMilestoneStatus(statusObj: any): MilestoneState {
  if (!statusObj) return MilestoneState.PENDING;
  if (typeof statusObj === 'string') {
    const s = statusObj.toLowerCase();
    if (s.includes('evidencesubmitted') || s.includes('submitted'))
      return MilestoneState.EVIDENCE_SUBMITTED;
    if (s.includes('verified')) return MilestoneState.VERIFIED;
    if (s.includes('released')) return MilestoneState.RELEASED;
    return MilestoneState.PENDING;
  }
  if ('evidenceSubmitted' in statusObj || 'evidence_submitted' in statusObj)
    return MilestoneState.EVIDENCE_SUBMITTED;
  if ('verified' in statusObj) return MilestoneState.VERIFIED;
  if ('released' in statusObj) return MilestoneState.RELEASED;
  return MilestoneState.PENDING;
}

function bytesToHex(bytes: number[] | Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Fetch all real on-chain agreements and milestones deployed under DONE_PROGRAM_ID
 */
export async function fetchAllOnChainAgreements(): Promise<AgreementAccount[]> {
  try {
    const connection = new Connection(DEVNET_RPC_URL, 'confirmed');
    const coder = new anchor.BorshAccountsCoder(IDL as anchor.Idl);

    const programAccounts = await connection.getProgramAccounts(DONE_PROGRAM_ID, {
      commitment: 'confirmed',
    });

    const agreementsMap = new Map<string, { pubkey: PublicKey; data: any }>();
    const milestonesList: Array<{ pubkey: PublicKey; data: any }> = [];

    for (const acc of programAccounts) {
      // Exclude legacy CLI smoke-test account
      if (acc.pubkey.toBase58() === LEGACY_CLI_SMOKE_TEST_PDA) {
        continue;
      }

      if (acc.account.data.length === 175) {
        try {
          const decoded = coder.decode('Agreement', acc.account.data);
          agreementsMap.set(acc.pubkey.toBase58(), {
            pubkey: acc.pubkey,
            data: decoded,
          });
        } catch (e) {
          console.warn('Failed decoding agreement', acc.pubkey.toBase58(), e);
        }
      } else if (acc.account.data.length === 159) {
        try {
          const decoded = coder.decode('Milestone', acc.account.data);
          milestonesList.push({
            pubkey: acc.pubkey,
            data: decoded,
          });
        } catch (e) {
          console.warn('Failed decoding milestone', acc.pubkey.toBase58(), e);
        }
      }
    }

    const agreements: AgreementAccount[] = [];

    for (const [agreementPdaStr, { pubkey, data: agData }] of agreementsMap.entries()) {
      const offchain = getOffchainMetadata(agreementPdaStr);
      const [vaultPda] = getEscrowTokenAccountPda(pubkey);

      const agMilestonesRaw = milestonesList
        .filter((m) => m.data.agreement.toBase58() === agreementPdaStr)
        .sort((a, b) => a.data.index - b.data.index);

      const milestones: MilestoneAccount[] = agMilestonesRaw.map((m) => {
        const mOff = offchain?.milestones?.find((om) => om.index === m.data.index);
        const mStatus = parseMilestoneStatus(m.data.status);
        const evHex = bytesToHex(m.data.evidence_hash || m.data.evidenceHash || []);
        const dodHex = bytesToHex(m.data.definition_hash || m.data.definitionHash || []);
        const isEvSubmitted = Boolean(m.data.evidence_submitted ?? m.data.evidenceSubmitted);

        return {
          publicKey: m.pubkey.toBase58(),
          agreement: agreementPdaStr,
          index: m.data.index,
          title: mOff?.title || `Milestone #${m.data.index + 1}`,
          description: mOff?.description || '',
          amountUsdc: Number(m.data.amount.toString()),
          dodCriteria: mOff?.dodCriteria || [],
          dodHash: dodHex,
          verificationType: VerificationType.SPONSOR,
          verifier: m.data.verifier.toBase58(),
          state: mStatus,
          evidence: isEvSubmitted || mStatus !== MilestoneState.PENDING
            ? {
                evidenceHash: evHex,
                metadataUri: mOff?.metadataUri || '',
                notes: mOff?.evidenceNotes || (mOff?.rejectionReason ? `Previous rejection: ${mOff.rejectionReason}` : ''),
                submittedAt: Date.now(),
                submittedBy: agData.worker.toBase58(),
                deliverableLinks: mOff?.evidenceLinks || [],
              }
            : undefined,
          verification: mStatus === MilestoneState.VERIFIED || mStatus === MilestoneState.RELEASED
            ? {
                verifiedAt: Date.now(),
                verifiedBy: m.data.verifier.toBase58(),
                notes: mOff?.evidenceNotes ? 'Attested against submitted evidence' : 'Verified on-chain',
              }
            : undefined,
        };
      });

      const agStatus = parseAgreementStatus(agData.status);
      const isAccepted = Boolean(agData.worker_accepted ?? agData.workerAccepted);
      const defHex = bytesToHex(agData.definition_hash || agData.definitionHash || []);

      agreements.push({
        publicKey: agreementPdaStr,
        sponsor: agData.sponsor.toBase58(),
        worker: agData.worker.toBase58(),
        title: offchain?.title || `Agreement (${truncateAddress(agreementPdaStr, 4)})`,
        description: offchain?.description || '',
        termsText: offchain?.termsText || '',
        termsHash: defHex,
        totalAmountUsdc: Number(agData.total_amount?.toString() || agData.totalAmount?.toString() || 0),
        state: agStatus,
        milestoneCount: agData.milestone_count ?? agData.milestoneCount ?? milestones.length,
        createdAt: offchain?.createdAt || Date.now(),
        vaultPda: vaultPda.toBase58(),
        bump: agData.bump,
        workerAccepted: isAccepted,
        agreementId: agData.agreement_id?.toString() || agData.agreementId?.toString(),
        milestones,
        isOnChain: true,
      });
    }

    return agreements.sort((a, b) => b.createdAt - a.createdAt);
  } catch (err) {
    console.error('Error fetching on-chain agreements from Devnet:', err);
    return [];
  }
}

/**
 * Step 1: Sponsor creates Agreement and Milestones in one atomic transaction
 */
export async function executeOnChainCreateAgreement(
  sponsor: PublicKey,
  worker: PublicKey,
  agreementId: BN,
  totalAmount: BN,
  definitionHash: Uint8Array,
  milestones: Array<{
    index: number;
    amountRaw: BN;
    definitionHash32: Uint8Array;
    verifier: PublicKey;
  }>,
  walletSigner: WalletSigner
): Promise<{ signature: string; agreementPda: string }> {
  const connection = new Connection(DEVNET_RPC_URL, 'confirmed');
  const program = getAnchorProgram(connection, sponsor, walletSigner.signTransaction);

  const [agreementPda] = getAgreementPda(sponsor, agreementId, DONE_PROGRAM_ID);
  const [configPda] = getConfigPda(DONE_PROGRAM_ID);

  const tx = new Transaction();

  const createAgreementIx = await (program.methods as any)
    .createAgreement(agreementId, totalAmount, Array.from(definitionHash))
    .accountsStrict({
      sponsor,
      worker,
      paymentMint: DEVNET_USDC_MINT,
      config: configPda,
      agreement: agreementPda,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  tx.add(createAgreementIx);

  for (const m of milestones) {
    const [milestonePda] = getMilestonePda(agreementPda, m.index, DONE_PROGRAM_ID);
    const milestoneIx = await (program.methods as any)
      .createMilestone(
        m.index,
        m.amountRaw,
        Array.from(m.definitionHash32),
        m.verifier
      )
      .accountsStrict({
        sponsor,
        agreement: agreementPda,
        milestone: milestonePda,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    tx.add(milestoneIx);
  }

  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = sponsor;

  const signedTx = await walletSigner.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  await connection.confirmTransaction(signature, 'confirmed');

  return { signature, agreementPda: agreementPda.toBase58() };
}

/**
 * Step 2: Assigned Worker accepts the finalized allocation on-chain
 */
export async function executeOnChainAcceptAgreement(
  worker: PublicKey,
  agreementPda: PublicKey,
  walletSigner: WalletSigner
): Promise<string> {
  const connection = new Connection(DEVNET_RPC_URL, 'confirmed');
  const program = getAnchorProgram(connection, worker, walletSigner.signTransaction);

  const tx = new Transaction();

  const acceptIx = await (program.methods as any)
    .acceptAgreement()
    .accountsStrict({
      worker,
      agreement: agreementPda,
    })
    .instruction();

  tx.add(acceptIx);

  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = worker;

  const signedTx = await walletSigner.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
}

/**
 * Step 3: Sponsor funds the escrow in Devnet USDC
 */
export async function executeOnChainFundAgreement(
  sponsor: PublicKey,
  agreementPda: PublicKey,
  walletSigner: WalletSigner
): Promise<string> {
  const connection = new Connection(DEVNET_RPC_URL, 'confirmed');
  const program = getAnchorProgram(connection, sponsor, walletSigner.signTransaction);

  const [escrowAuthority] = getEscrowAuthorityPda(agreementPda, DONE_PROGRAM_ID);
  const [escrowTokenAccount] = getEscrowTokenAccountPda(agreementPda, DONE_PROGRAM_ID);

  const sponsorTokenAccount = await getAssociatedTokenAddress(
    DEVNET_USDC_MINT,
    sponsor,
    false,
    TOKEN_PROGRAM_ID
  );

  const tx = new Transaction();

  const info = await connection.getAccountInfo(sponsorTokenAccount);
  if (!info) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        sponsor,
        sponsorTokenAccount,
        sponsor,
        DEVNET_USDC_MINT,
        TOKEN_PROGRAM_ID
      )
    );
  }

  const fundIx = await (program.methods as any)
    .fundAgreement()
    .accountsStrict({
      sponsor,
      agreement: agreementPda,
      paymentMint: DEVNET_USDC_MINT,
      sponsorTokenAccount,
      escrowAuthority,
      escrowTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  tx.add(fundIx);

  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = sponsor;

  const signedTx = await walletSigner.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
}

/**
 * Step 4: Worker submits 32-byte evidence hash on-chain
 */
export async function executeOnChainSubmitEvidence(
  worker: PublicKey,
  agreementPda: PublicKey,
  milestonePda: PublicKey,
  evidenceHash32: Uint8Array,
  walletSigner: WalletSigner
): Promise<string> {
  const connection = new Connection(DEVNET_RPC_URL, 'confirmed');
  const program = getAnchorProgram(connection, worker, walletSigner.signTransaction);

  const tx = new Transaction();

  const submitIx = await (program.methods as any)
    .submitEvidence(Array.from(evidenceHash32))
    .accountsStrict({
      worker,
      agreement: agreementPda,
      milestone: milestonePda,
    })
    .instruction();

  tx.add(submitIx);

  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = worker;

  const signedTx = await walletSigner.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
}

/**
 * Step 5: Assigned Verifier verifies evidence on-chain
 */
export async function executeOnChainVerifyEvidence(
  verifier: PublicKey,
  agreementPda: PublicKey,
  milestonePda: PublicKey,
  walletSigner: WalletSigner
): Promise<string> {
  const connection = new Connection(DEVNET_RPC_URL, 'confirmed');
  const program = getAnchorProgram(connection, verifier, walletSigner.signTransaction);

  const tx = new Transaction();

  const verifyIx = await (program.methods as any)
    .verifyEvidence()
    .accountsStrict({
      verifier,
      agreement: agreementPda,
      milestone: milestonePda,
    })
    .instruction();

  tx.add(verifyIx);

  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = verifier;

  const signedTx = await walletSigner.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
}

/**
 * Step 5b: Assigned Verifier rejects evidence on-chain with 32-byte reason hash
 */
export async function executeOnChainRejectEvidence(
  verifier: PublicKey,
  agreementPda: PublicKey,
  milestonePda: PublicKey,
  rejectionReasonHash32: Uint8Array,
  walletSigner: WalletSigner
): Promise<string> {
  const connection = new Connection(DEVNET_RPC_URL, 'confirmed');
  const program = getAnchorProgram(connection, verifier, walletSigner.signTransaction);

  const tx = new Transaction();

  const rejectIx = await (program.methods as any)
    .rejectEvidence(Array.from(rejectionReasonHash32))
    .accountsStrict({
      verifier,
      agreement: agreementPda,
      milestone: milestonePda,
    })
    .instruction();

  tx.add(rejectIx);

  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = verifier;

  const signedTx = await walletSigner.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
}

/**
 * Step 6: Release verified milestone funds to assigned worker token account
 */
export async function executeOnChainReleaseMilestone(
  payer: PublicKey,
  agreementPda: PublicKey,
  milestonePda: PublicKey,
  workerPubkey: PublicKey,
  walletSigner: WalletSigner
): Promise<string> {
  const connection = new Connection(DEVNET_RPC_URL, 'confirmed');
  const program = getAnchorProgram(connection, payer, walletSigner.signTransaction);

  const [escrowAuthority] = getEscrowAuthorityPda(agreementPda, DONE_PROGRAM_ID);
  const [escrowTokenAccount] = getEscrowTokenAccountPda(agreementPda, DONE_PROGRAM_ID);

  const workerTokenAccount = await getAssociatedTokenAddress(
    DEVNET_USDC_MINT,
    workerPubkey,
    false,
    TOKEN_PROGRAM_ID
  );

  const tx = new Transaction();

  const info = await connection.getAccountInfo(workerTokenAccount);
  if (!info) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        payer,
        workerTokenAccount,
        workerPubkey,
        DEVNET_USDC_MINT,
        TOKEN_PROGRAM_ID
      )
    );
  }

  const releaseIx = await (program.methods as any)
    .releaseMilestone()
    .accountsStrict({
      agreement: agreementPda,
      milestone: milestonePda,
      paymentMint: DEVNET_USDC_MINT,
      escrowAuthority,
      escrowTokenAccount,
      workerTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();

  tx.add(releaseIx);

  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer;

  const signedTx = await walletSigner.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
}

/**
 * Step 7: Mutual Cancellation (Requires both sponsor and worker signatures in same transaction)
 */
export async function executeOnChainCancelAgreement(
  sponsor: PublicKey,
  worker: PublicKey,
  agreementPda: PublicKey,
  sponsorTokenAccount: PublicKey,
  signTx: (tx: Transaction) => Promise<Transaction>
): Promise<string> {
  const connection = new Connection(DEVNET_RPC_URL, 'confirmed');
  const program = getAnchorProgram(connection, sponsor, signTx);

  const [escrowAuthority] = getEscrowAuthorityPda(agreementPda, DONE_PROGRAM_ID);
  const [escrowTokenAccount] = getEscrowTokenAccountPda(agreementPda, DONE_PROGRAM_ID);

  const tx = new Transaction();

  const cancelIx = await (program.methods as any)
    .cancelAgreement()
    .accountsStrict({
      sponsor,
      worker,
      agreement: agreementPda,
      paymentMint: DEVNET_USDC_MINT,
      sponsorTokenAccount,
      escrowAuthority,
      escrowTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();

  tx.add(cancelIx);

  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = sponsor;

  const signedTx = await signTx(tx);
  const signature = await connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
}

/**
 * Step 7a: Create and partially sign mutual cancellation transaction (Party 1)
 */
export async function createPartialCancelAgreement(
  sponsor: PublicKey,
  worker: PublicKey,
  agreementPda: PublicKey,
  sponsorTokenAccount: PublicKey,
  signer: (tx: Transaction) => Promise<Transaction>
): Promise<{ partialTxBase64: string; signedBy: string }> {
  const connection = new Connection(DEVNET_RPC_URL, "confirmed");
  const program = getAnchorProgram(connection, sponsor, signer);

  const [escrowAuthority] = getEscrowAuthorityPda(agreementPda, DONE_PROGRAM_ID);
  const [escrowTokenAccount] = getEscrowTokenAccountPda(agreementPda, DONE_PROGRAM_ID);

  const tx = new Transaction();

  const cancelIx = await (program.methods as any)
    .cancelAgreement()
    .accountsStrict({
      sponsor,
      worker,
      agreement: agreementPda,
      paymentMint: DEVNET_USDC_MINT,
      sponsorTokenAccount,
      escrowAuthority,
      escrowTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();

  tx.add(cancelIx);

  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = sponsor;

  const partiallySignedTx = await signer(tx);
  const partialTxBase64 = partiallySignedTx
    .serialize({ requireAllSignatures: false, verifySignatures: false })
    .toString("base64");

  const signedBy = partiallySignedTx.signatures.find((s) => s.signature !== null)?.publicKey.toBase58() || "";

  return { partialTxBase64, signedBy };
}

/**
 * Step 7b: Co-sign partially signed cancellation transaction and broadcast to Solana Devnet (Party 2)
 */
export async function cosignAndBroadcastCancelAgreement(
  partialTxBase64: string,
  cosigner: (tx: Transaction) => Promise<Transaction>
): Promise<string> {
  const connection = new Connection(DEVNET_RPC_URL, "confirmed");
  const txBuffer = Buffer.from(partialTxBase64, "base64");
  const tx = Transaction.from(txBuffer);

  const fullySignedTx = await cosigner(tx);

  const signature = await connection.sendRawTransaction(fullySignedTx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  await connection.confirmTransaction(signature, "confirmed");
  return signature;
}
