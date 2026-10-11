import { Connection, PublicKey } from '@solana/web3.js';
import { DEVNET_RPC_URL, UPGRADEABLE_LOADER_ID, DONE_PROGRAM_ID } from '../solana';

export interface PreparedProgramCheck {
  clusterGenesis: string;
  expectedProgramId: string;
  expectedOwner: string;
  isExecutable: boolean;
  programDataAddress: string;
  definitionHashHex: string;
  definitionHashBytes: number[];
  evidenceHashHex: string;
  evidenceHashBytes: number[];
}

export async function computeSha256(input: string): Promise<{ hex: string; bytes: number[] }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  const hex = hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
  return { hex, bytes: hashArr };
}

/**
 * Standard account-check verification recipe from DONE Protocol specification
 * Calculates Definition of Done and Evidence commitments for a target Solana program account.
 */
export async function prepareAccountVerificationRecipe(
  targetProgramId: PublicKey = DONE_PROGRAM_ID,
  connection?: Connection
): Promise<PreparedProgramCheck> {
  const conn = connection || new Connection(DEVNET_RPC_URL, 'confirmed');
  const genesisHash = await conn.getGenesisHash();
  const programInfo = await conn.getAccountInfo(targetProgramId, 'confirmed');

  if (!programInfo) {
    throw new Error(`Target program ${targetProgramId.toBase58()} does not exist on this cluster.`);
  }
  if (!programInfo.executable) {
    throw new Error('Target account is not executable.');
  }

  const [programDataAddress] = PublicKey.findProgramAddressSync(
    [targetProgramId.toBuffer()],
    UPGRADEABLE_LOADER_ID
  );

  const dodPreimage = [
    'DONE_SOLANA_PROGRAM_ACCOUNT_DOD_V1',
    `cluster_genesis=${genesisHash}`,
    `expected_program_id=${targetProgramId.toBase58()}`,
    `expected_owner=${UPGRADEABLE_LOADER_ID.toBase58()}`,
    'expected_executable=true',
  ].join('\n');

  const { hex: definitionHashHex, bytes: definitionHashBytes } = await computeSha256(dodPreimage);

  const evidencePreimage = [
    'DONE_SOLANA_PROGRAM_ACCOUNT_EVIDENCE_V1',
    `cluster_genesis=${genesisHash}`,
    `program_id=${targetProgramId.toBase58()}`,
    `owner=${programInfo.owner.toBase58()}`,
    `executable=${String(programInfo.executable)}`,
    `program_data=${programDataAddress.toBase58()}`,
  ].join('\n');

  const { hex: evidenceHashHex, bytes: evidenceHashBytes } = await computeSha256(evidencePreimage);

  return {
    clusterGenesis: genesisHash,
    expectedProgramId: targetProgramId.toBase58(),
    expectedOwner: UPGRADEABLE_LOADER_ID.toBase58(),
    isExecutable: Boolean(programInfo.executable),
    programDataAddress: programDataAddress.toBase58(),
    definitionHashHex,
    definitionHashBytes,
    evidenceHashHex,
    evidenceHashBytes,
  };
}
