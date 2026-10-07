import { PublicKey } from '@solana/web3.js';
import { DONE_PROGRAM_ID } from '../solana';

export const SEED_AGREEMENT = Buffer.from('agreement');
export const SEED_VAULT = Buffer.from('vault');
export const SEED_MILESTONE = Buffer.from('milestone');

/**
 * Derives Agreement Account PDA
 */
export function getAgreementPda(
  sponsor: PublicKey,
  agreementIdOrNonce: string | number,
  programId = DONE_PROGRAM_ID
): [PublicKey, number] {
  const nonceBuffer = Buffer.from(String(agreementIdOrNonce));
  return PublicKey.findProgramAddressSync(
    [SEED_AGREEMENT, sponsor.toBuffer(), nonceBuffer],
    programId
  );
}

/**
 * Derives Escrow Vault PDA for holding USDC
 */
export function getVaultPda(
  agreement: PublicKey,
  programId = DONE_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEED_VAULT, agreement.toBuffer()],
    programId
  );
}

/**
 * Derives Milestone Account PDA
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
