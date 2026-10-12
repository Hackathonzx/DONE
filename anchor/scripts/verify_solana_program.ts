
import * as anchor from "@coral-xyz/anchor";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import type { DoneProtocol } from "../target/types/done_protocol";

const UPGRADEABLE_LOADER_ID = new PublicKey(
  "BPFLoaderUpgradeab1e11111111111111111111111"
);

const COMMITMENT_LEVEL = "confirmed" as const;

type ProgramCheck = {
  genesisHash: string;
  expectedProgramId: PublicKey;
  programDataAddress: PublicKey;
  definitionHash: Buffer;
  evidenceHash: Buffer;
};

function sha256(text: string): Buffer {
  return createHash("sha256").update(text, "utf8").digest();
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

function hasEnumVariant(value: unknown, variant: string): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    variant in value
  );
}

function loadKeypair(): Keypair {
  const inputPath =
    process.env.VERIFIER_KEYPAIR ?? "~/.config/solana/id.json";

  const expandedPath = inputPath.startsWith("~/")
    ? resolve(homedir(), inputPath.slice(2))
    : resolve(inputPath);

  const contents = JSON.parse(
    readFileSync(expandedPath, "utf8")
  ) as number[];

  return Keypair.fromSecretKey(Uint8Array.from(contents));
}

/**
 * Canonical Definition of Done commitment.
 *
 * The exact text and field order are part of the protocol.
 * The frontend must use the same recipe.
 */
function makeDefinitionHash(
  genesisHash: string,
  expectedProgramId: PublicKey
): Buffer {
  const preimage = [
    "DONE_SOLANA_PROGRAM_ACCOUNT_DOD_V1",
    `cluster_genesis=${genesisHash}`,
    `expected_program_id=${expectedProgramId.toBase58()}`,
    `expected_owner=${UPGRADEABLE_LOADER_ID.toBase58()}`,
    "expected_executable=true",
  ].join("\n");

  return sha256(preimage);
}

async function inspectProgramAccount(
  connection: Connection,
  expectedProgramId: PublicKey
): Promise<ProgramCheck> {
  const genesisHash = await connection.getGenesisHash();

  const programInfo = await connection.getAccountInfo(
    expectedProgramId,
    COMMITMENT_LEVEL
  );

  if (!programInfo) {
    throw new Error(
      `Target program ${expectedProgramId.toBase58()} does not exist on this cluster.`
    );
  }

  if (!programInfo.executable) {
    throw new Error("Target account is not executable.");
  }

  if (!programInfo.owner.equals(UPGRADEABLE_LOADER_ID)) {
    throw new Error(
      `Unexpected program owner: ${programInfo.owner.toBase58()}`
    );
  }

  // UpgradeableLoaderState::Program has discriminator 2,
  // followed by the 32-byte ProgramData address.
  if (
    programInfo.data.length < 36 ||
    programInfo.data.readUInt32LE(0) !== 2
  ) {
    throw new Error(
      "Target account does not contain a valid upgradeable-loader Program state."
    );
  }

  const programDataAddress = PublicKey.findProgramAddressSync(
    [expectedProgramId.toBuffer()],
    UPGRADEABLE_LOADER_ID
  )[0];

  const linkedProgramDataAddress = new PublicKey(
    programInfo.data.subarray(4, 36)
  );

  if (!linkedProgramDataAddress.equals(programDataAddress)) {
    throw new Error(
      "The target program's ProgramData address does not match its expected PDA."
    );
  }

  const programDataInfo = await connection.getAccountInfo(
    programDataAddress,
    COMMITMENT_LEVEL
  );

  if (!programDataInfo) {
    throw new Error("The ProgramData account does not exist.");
  }

  if (!programDataInfo.owner.equals(UPGRADEABLE_LOADER_ID)) {
    throw new Error("The ProgramData account has an unexpected owner.");
  }

  // UpgradeableLoaderState::ProgramData has discriminator 3.
  if (
    programDataInfo.data.length < 4 ||
    programDataInfo.data.readUInt32LE(0) !== 3
  ) {
    throw new Error("The ProgramData account has an invalid loader state.");
  }

  const definitionHash = makeDefinitionHash(
    genesisHash,
    expectedProgramId
  );

  const evidencePreimage = [
    "DONE_SOLANA_PROGRAM_ACCOUNT_EVIDENCE_V1",
    `cluster_genesis=${genesisHash}`,
    `program_id=${expectedProgramId.toBase58()}`,
    `owner=${programInfo.owner.toBase58()}`,
    `executable=${String(programInfo.executable)}`,
    `program_data=${programDataAddress.toBase58()}`,
  ].join("\n");

  return {
    genesisHash,
    expectedProgramId,
    programDataAddress,
    definitionHash,
    evidenceHash: sha256(evidencePreimage),
  };
}

function printPreparedHashes(check: ProgramCheck): void {
  console.log("\nSolana program-account check passed.");
  console.log(`Cluster genesis hash: ${check.genesisHash}`);
  console.log(`Target program ID: ${check.expectedProgramId.toBase58()}`);
  console.log(`ProgramData PDA: ${check.programDataAddress.toBase58()}`);

  console.log(
    "\nDefinition of Done hash (use when creating the milestone):"
  );
  console.log(check.definitionHash.toString("hex"));

  console.log(
    "\nEvidence hash (the worker submits this 32-byte value):"
  );
  console.log(check.evidenceHash.toString("hex"));

  console.log(
    "\nEvidence bytes for the Anchor client:"
  );
  console.log(JSON.stringify(Array.from(check.evidenceHash)));

  console.log(
    "\nCheck scope: existence, upgradeable-loader ownership, executable state, and ProgramData linkage."
  );
}

async function attest(
  connection: Connection,
  check: ProgramCheck,
  agreementPda: PublicKey,
  milestonePda: PublicKey
): Promise<void> {
  const verifierKeypair = loadKeypair();
  const wallet = new anchor.Wallet(verifierKeypair);

  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: COMMITMENT_LEVEL,
    preflightCommitment: COMMITMENT_LEVEL,
  });

  const idlPath = resolve(__dirname, "../target/idl/done_protocol.json");
  const idl = JSON.parse(readFileSync(idlPath, "utf8")) as DoneProtocol;
  const program = new anchor.Program<DoneProtocol>(idl, provider);

  const doneProgramInfo = await connection.getAccountInfo(
    program.programId,
    COMMITMENT_LEVEL
  );

  if (
    !doneProgramInfo ||
    !doneProgramInfo.executable ||
    !doneProgramInfo.owner.equals(UPGRADEABLE_LOADER_ID)
  ) {
    throw new Error(
      "DONE Protocol is not deployed as an executable upgradeable-loader program on this RPC."
    );
  }

  const agreement = await program.account.agreement.fetch(agreementPda);
  const milestone = await program.account.milestone.fetch(milestonePda);

  if (!milestone.agreement.equals(agreementPda)) {
    throw new Error("The milestone does not belong to the supplied agreement.");
  }

  if (!agreement.workerAccepted) {
    throw new Error("The agreement has not been accepted by its worker.");
  }

  if (
    !hasEnumVariant(agreement.status, "funded") &&
    !hasEnumVariant(agreement.status, "active")
  ) {
    throw new Error("The agreement is not funded or active.");
  }

  if (!milestone.verifier.equals(wallet.publicKey)) {
    throw new Error(
      "The configured signing wallet is not the verifier assigned to this milestone."
    );
  }

  if (!milestone.evidenceSubmitted ||
      !hasEnumVariant(milestone.status, "evidenceSubmitted")) {
    throw new Error(
      "The milestone does not have evidence awaiting verification."
    );
  }

  if (!Buffer.from(milestone.definitionHash).equals(check.definitionHash)) {
    throw new Error(
      "Definition of Done hash mismatch. Do not attest: the milestone does not commit to this verification recipe."
    );
  }

  if (!Buffer.from(milestone.evidenceHash).equals(check.evidenceHash)) {
    throw new Error(
      "Evidence hash mismatch. The submitted evidence does not match the independently checked account."
    );
  }

  const signature = await program.methods
    .verifyEvidence()
    .accounts({
      verifier: wallet.publicKey,
      agreement: agreementPda,
      milestone: milestonePda,
    })
    .rpc();

  console.log("\nVerification attestation submitted successfully.");
  console.log(`Verifier: ${wallet.publicKey.toBase58()}`);
  console.log(`Transaction signature: ${signature}`);
  console.log(
    "The existing on-chain instruction emits VerificationAttestedEvent."
  );
}

async function main(): Promise<void> {
  const mode = process.argv[2];

  if (mode === "--help" || !mode) {
    console.log(
      [
        "DONE Protocol Solana program-account verifier",
        "",
        "Prepare hashes:",
        "  ts-node scripts/verify_solana_program.ts --prepare",
        "",
        "Verify and submit on-chain attestation:",
        "  ts-node scripts/verify_solana_program.ts --attest",
        "",
        "Required for both modes:",
        "  SOLANA_RPC_URL",
        "  EXPECTED_PROGRAM_ID",
        "",
        "Required for --attest:",
        "  AGREEMENT_PDA",
        "  MILESTONE_PDA",
        "  VERIFIER_KEYPAIR (optional; defaults to ~/.config/solana/id.json)",
      ].join("\n")
    );
    return;
  }

  if (mode !== "--prepare" && mode !== "--attest") {
    throw new Error("Unknown mode. Use --prepare, --attest, or --help.");
  }

  const rpcUrl = requireEnv("SOLANA_RPC_URL");
  const expectedProgramId = new PublicKey(
    requireEnv("EXPECTED_PROGRAM_ID")
  );

  const connection = new Connection(rpcUrl, COMMITMENT_LEVEL);

  const check = await inspectProgramAccount(
    connection,
    expectedProgramId
  );

  if (mode === "--prepare") {
    printPreparedHashes(check);
    return;
  }

  const agreementPda = new PublicKey(requireEnv("AGREEMENT_PDA"));
  const milestonePda = new PublicKey(requireEnv("MILESTONE_PDA"));

  await attest(connection, check, agreementPda, milestonePda);
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : String(error);

  console.error(`\nVerification failed: ${message}`);
  process.exitCode = 1;
});
