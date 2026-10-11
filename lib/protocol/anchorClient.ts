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
import idl from './idl/done_protocol.json';
import {
  DONE_PROGRAM_ID,
  DEVNET_USDC_MINT,
  DEVNET_RPC_URL,
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
  publicKey?: PublicKey;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
}

export function getAnchorProgram(
  connection: Connection,
  walletKey: PublicKey,
  signTx: (tx: Transaction) => Promise<Transaction>
): anchor.Program {
  const dummyWallet = {
    publicKey: walletKey,
    signTransaction: signTx,
    signAllTransactions: async (txs: Transaction[]) => {
      const res: Transaction[] = [];
      for (const t of txs) res.push(await signTx(t));
      return res;
    },
  };
  const provider = new anchor.AnchorProvider(connection, dummyWallet as any, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  });
  return new anchor.Program(idl as any, provider);
}

function parseAgreementStatus(status: any): AgreementState {
  if (!status) return AgreementState.DRAFT;
  if ('draft' in status || 'Draft' in status) return AgreementState.DRAFT;
  if ('funded' in status || 'Funded' in status) return AgreementState.FUNDED;
  if ('active' in status || 'Active' in status) return AgreementState.ACTIVE;
  if ('completed' in status || 'Completed' in status) return AgreementState.COMPLETED;
  if ('cancelled' in status || 'Cancelled' in status) return AgreementState.CANCELLED;
  return AgreementState.DRAFT;
}

function parseMilestoneStatus(status: any): MilestoneState {
  if (!status) return MilestoneState.PENDING;
  if ('pending' in status || 'Pending' in status) return MilestoneState.PENDING;
  if ('evidenceSubmitted' in status || 'EvidenceSubmitted' in status) return MilestoneState.EVIDENCE_SUBMITTED;
  if ('verified' in status || 'Verified' in status) return MilestoneState.VERIFIED;
  if ('released' in status || 'Released' in status) return MilestoneState.RELEASED;
  return MilestoneState.PENDING;
}

function bytesToHex(arr: number[] | Uint8Array): string {
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Fetch all on-chain agreements and milestones deployed under DONE Protocol
 */
export async function fetchAllOnChainAgreements(): Promise<AgreementAccount[]> {
  const connection = new Connection(DEVNET_RPC_URL, 'confirmed');
  const coder = new anchor.BorshAccountsCoder(idl as any);

  try {
    const rawAccounts = await connection.getProgramAccounts(DONE_PROGRAM_ID, 'confirmed');
    const agreementsMap = new Map<string, any>();
    const milestonesList: Array<{ pubkey: PublicKey; data: any }> = [];

    for (const acc of rawAccounts) {
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
        const mOff = offchain?.milestones.find((om) => om.index === m.data.index);
        const mStatus = parseMilestoneStatus(m.data.status);
        const evHex = bytesToHex(m.data.evidence_hash || m.data.evidenceHash || []);
        const dodHex = bytesToHex(m.data.definition_hash || m.data.definitionHash || []);
        const isEvSubmitted = Boolean(m.data.evidence_submitted ?? m.data.evidenceSubmitted);

        return {
          publicKey: m.pubkey.toBase58(),
          agreement: agreementPdaStr,
          index: m.data.index,
          title: mOff?.title || `Milestone #${m.data.index + 1} (${mOff?.verificationMethodLabel || 'Account Check'})`,
          description: mOff?.description || 'Solana Devnet automated program-account verification recipe.',
          amountUsdc: Number(m.data.amount.toString()),
          dodCriteria: mOff?.dodCriteria || [
            'Program exists on Devnet cluster',
            'Program account is executable',
            'Owned by Upgradeable Loader',
            'ProgramData PDA linkage is valid',
          ],
          dodHash: dodHex,
          verificationType: VerificationType.SPONSOR,
          verifier: m.data.verifier.toBase58(),
          state: mStatus,
          evidence: isEvSubmitted || mStatus !== MilestoneState.PENDING
            ? {
                evidenceHash: evHex,
                metadataUri: mOff?.metadataUri || 'https://explorer.solana.com/address/82MCkYR3RkcqBcYWDDixbaoi4bWL8w5ohu7UkJTiZXYM?cluster=devnet',
                notes: mOff?.evidenceNotes || (mOff?.rejectionReason ? `Previous rejection: ${mOff.rejectionReason}` : 'Verified via automated account-check recipe.'),
                submittedAt: Date.now(),
                submittedBy: agData.worker.toBase58(),
                deliverableLinks: mOff?.evidenceLinks || ['https://github.com/Hackathonzx/DONE/tree/smart-contract'],
              }
            : undefined,
          verification: mStatus === MilestoneState.VERIFIED || mStatus === MilestoneState.RELEASED
            ? {
                verifiedAt: Date.now(),
                verifiedBy: m.data.verifier.toBase58(),
                notes: 'Attested against committed DoD SHA-256 criteria on Devnet.',
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
        title: offchain?.title || `Devnet Agreement #${agData.agreement_id?.toString() || agData.agreementId?.toString()}`,
        description: offchain?.description || 'USDC-funded verifiable work agreement on Solana Devnet.',
        termsText: offchain?.termsText || 'Standard DONE Protocol escrow terms on Solana Devnet.',
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
    console.error('Error fetching on-chain agreements:', err);
    return [];
  }
}

/**
 * Step 1: Sponsor creates Agreement and Milestone on Devnet
 */
export async function executeOnChainCreateAgreement(
  sponsor: PublicKey,
  worker: PublicKey,
  agreementIdBn: anchor.BN,
  totalAmountRaw: anchor.BN,
  definitionHash32: Uint8Array,
  milestones: Array<{
    index: number;
    amountRaw: anchor.BN;
    definitionHash32: Uint8Array;
    verifier: PublicKey;
  }>,
  walletSigner: WalletSigner
): Promise<{ signature: string; agreementPda: string }> {
  const connection = new Connection(DEVNET_RPC_URL, 'confirmed');
  const program = getAnchorProgram(connection, sponsor, walletSigner.signTransaction);
  const [configPda] = getConfigPda(DONE_PROGRAM_ID);
  const [agreementPda] = getAgreementPda(sponsor, agreementIdBn, DONE_PROGRAM_ID);

  const tx = new Transaction();

  const createAgreementIx = await (program.methods as any)
    .createAgreement(
      agreementIdBn,
      totalAmountRaw,
      Array.from(definitionHash32)
    )
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
