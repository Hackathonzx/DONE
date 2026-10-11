import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { DONE_PROGRAM_ID } from '../solana';

export const SEED_AGREEMENT = Buffer.from('agreement');
export const SEED_MILESTONE = Buffer.from('milestone');
export const SEED_ESCROW = Buffer.from('escrow');
export const SEED_ESCROW_TOKEN = Buffer.from('escrow-token');
export const SEED_CONFIG = Buffer.from('config');

/**
 * Derives Agreement Account PDA matching on-chain seeds:
 * [b"agreement", sponsor.key().as_ref(), &agreement_id.to_le_bytes()]
 */
export function getAgreementPda(
  sponsor: PublicKey,
  agreementId: number | bigint | string | BN,
  programId = DONE_PROGRAM_ID
): [PublicKey, number] {
  let bn: BN;
  if (BN.isBN(agreementId)) {
    bn = agreementId;
  } else if (typeof agreementId === 'bigint') {
    bn = new BN(agreementId.toString());
  } else if (typeof agreementId === 'number') {
    bn = new BN(agreementId);
  } else {
    // If string is numeric or timestamp
    const clean = String(agreementId).replace(/\D/g, '');
    bn = new BN(clean || '1');
  }

  const idBuffer = bn.toArrayLike(Buffer, 'le', 8);
  return PublicKey.findProgramAddressSync(
    [SEED_AGREEMENT, sponsor.toBuffer(), idBuffer],
    programId
  );
}

/**
 * Derives Escrow Authority PDA matching on-chain seeds:
 * [b"escrow", agreement.key().as_ref()]
 */
export function getEscrowAuthorityPda(
  agreement: PublicKey,
  programId = DONE_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEED_ESCROW, agreement.toBuffer()],
    programId
  );
}

/**
 * Derives Escrow Token Account PDA matching on-chain seeds:
 * [b"escrow-token", agreement.key().as_ref()]
 */
export function getEscrowTokenAccountPda(
  agreement: PublicKey,
  programId = DONE_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEED_ESCROW_TOKEN, agreement.toBuffer()],
    programId
  );
}

/**
 * Backward compatibility alias for UI components referring to Vault PDA
 */
export function getVaultPda(
  agreement: PublicKey,
  programId = DONE_PROGRAM_ID
): [PublicKey, number] {
  return getEscrowTokenAccountPda(agreement, programId);
}

/**
 * Derives Milestone Account PDA matching on-chain seeds:
 * [b"milestone", agreement.key().as_ref(), index.to_le_bytes().as_ref()]
 */
export function getMilestonePda(
  agreement: PublicKey,
  index: number,
  programId = DONE_PROGRAM_ID
): [PublicKey, number] {
  const indexBuffer = Buffer.alloc(4);
  indexBuffer.writeUInt32LE(index, 0);
  return PublicKey.findProgramAddressSync(
    [SEED_MILESTONE, agreement.toBuffer(), indexBuffer],
    programId
  );
}

/**
 * Derives Protocol Config PDA matching on-chain seeds:
 * [b"config"]
 */
export function getConfigPda(
  programId = DONE_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEED_CONFIG],
    programId
  );
}
