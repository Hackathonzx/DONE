
import * as anchor from "@coral-xyz/anchor";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  getAccount,
  getAssociatedTokenAddress,
  getMint,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type { DoneProtocol } from "../target/types/done_protocol";

const RPC_URL = "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey(
  "82MCkYR3RkcqBcYWDDixbaoi4bWL8w5ohu7UkJTiZXYM"
);
const USDC_MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);
const UPGRADEABLE_LOADER = new PublicKey(
  "BPFLoaderUpgradeab1e11111111111111111111111"
);
const AMOUNT = new anchor.BN(1_000_000); // 1 USDC

function sha256(text: string): Buffer {
  return createHash("sha256").update(text, "utf8").digest();
}

function loadSponsor(): Keypair {
  const secret = JSON.parse(
    readFileSync(
      resolve(homedir(), ".config/solana/id.json"),
      "utf8"
    )
  ) as number[];

  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

function loadProgram(
  connection: Connection,
  sponsor: Keypair
): anchor.Program<DoneProtocol> {
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(sponsor),
    {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    }
  );

  const idl = JSON.parse(
    readFileSync(
      resolve(__dirname, "../target/idl/done_protocol.json"),
      "utf8"
    )
  ) as DoneProtocol;

  return new anchor.Program<DoneProtocol>(idl, provider);
}

async function makeVerificationHashes(
  connection: Connection
): Promise<{ definitionHash: Buffer; evidenceHash: Buffer }> {
  const genesisHash = await connection.getGenesisHash();

  const programInfo = await connection.getAccountInfo(
    PROGRAM_ID,
    "confirmed"
  );

  if (
    !programInfo ||
    !programInfo.executable ||
    !programInfo.owner.equals(UPGRADEABLE_LOADER)
  ) {
    throw new Error("Target program is missing or not executable.");
  }

  if (
    programInfo.data.length < 36 ||
    programInfo.data.readUInt32LE(0) !== 2
  ) {
    throw new Error("Invalid upgradeable-loader Program state.");
  }

  const [programDataPda] = PublicKey.findProgramAddressSync(
    [PROGRAM_ID.toBuffer()],
    UPGRADEABLE_LOADER
  );

  const linkedProgramDataPda = new PublicKey(
    programInfo.data.subarray(4, 36)
  );

  if (!linkedProgramDataPda.equals(programDataPda)) {
    throw new Error("Unexpected ProgramData address.");
  }

  const programDataInfo = await connection.getAccountInfo(
    programDataPda,
    "confirmed"
  );

  if (
    !programDataInfo ||
    !programDataInfo.owner.equals(UPGRADEABLE_LOADER) ||
    programDataInfo.data.length < 4 ||
    programDataInfo.data.readUInt32LE(0) !== 3
  ) {
    throw new Error("Invalid or missing ProgramData account.");
  }

  const definitionPreimage = [
    "DONE_SOLANA_PROGRAM_ACCOUNT_DOD_V1",
    `cluster_genesis=${genesisHash}`,
    `expected_program_id=${PROGRAM_ID.toBase58()}`,
    `expected_owner=${UPGRADEABLE_LOADER.toBase58()}`,
    "expected_executable=true",
  ].join("\n");

  const evidencePreimage = [
    "DONE_SOLANA_PROGRAM_ACCOUNT_EVIDENCE_V1",
    `cluster_genesis=${genesisHash}`,
    `program_id=${PROGRAM_ID.toBase58()}`,
    `owner=${programInfo.owner.toBase58()}`,
    `executable=${String(programInfo.executable)}`,
    `program_data=${programDataPda.toBase58()}`,
  ].join("\n");

  return {
    definitionHash: sha256(definitionPreimage),
    evidenceHash: sha256(evidencePreimage),
  };
}

async function start(): Promise<void> {
  const connection = new Connection(RPC_URL, "confirmed");
  const sponsor = loadSponsor();
  const program = loadProgram(connection, sponsor);

  const configPda = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  )[0];

  const config = await program.account.protocolConfig.fetch(configPda);

  if (
    !config.admin.equals(sponsor.publicKey) ||
    !config.paymentMint.equals(USDC_MINT)
  ) {
    throw new Error("Unexpected protocol admin or payment mint.");
  }

  const mint = await getMint(
    connection,
    USDC_MINT,
    "confirmed",
    TOKEN_PROGRAM_ID
  );

  if (mint.decimals !== 6) {
    throw new Error(`Expected six USDC decimals, found ${mint.decimals}.`);
  }

  const sponsorTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    sponsor,
    USDC_MINT,
    sponsor.publicKey,
    false,
    "confirmed",
    undefined,
    TOKEN_PROGRAM_ID
  );

  const sponsorBalance = await getAccount(
    connection,
    sponsorTokenAccount.address,
    "confirmed",
    TOKEN_PROGRAM_ID
  );

  if (sponsorBalance.amount < 1_000_000n) {
    throw new Error("Sponsor has insufficient devnet USDC for 1 USDC funding.");
  }

  const worker = Keypair.generate();

  // The sponsor pays account-rent costs and transaction fees.
  const workerTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    sponsor,
    USDC_MINT,
    worker.publicKey,
    false,
    "confirmed",
    undefined,
    TOKEN_PROGRAM_ID
  );

  const hashes = await makeVerificationHashes(connection);

  // A millisecond timestamp gives this demo a fresh agreement ID.
  const agreementId = new anchor.BN(Date.now());

  const [agreementPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("agreement"),
      sponsor.publicKey.toBuffer(),
      agreementId.toArrayLike(Buffer, "le", 8),
    ],
    PROGRAM_ID
  );

  const [milestonePda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("milestone"),
      agreementPda.toBuffer(),
      new anchor.BN(0).toArrayLike(Buffer, "le", 4),
    ],
    PROGRAM_ID
  );

  const [escrowAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), agreementPda.toBuffer()],
    PROGRAM_ID
  );

  const [escrowTokenAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow-token"), agreementPda.toBuffer()],
    PROGRAM_ID
  );

  console.log("Creating 1 USDC devnet smoke-test agreement...");

  await program.methods
    .createAgreement(
      agreementId,
      AMOUNT,
      Array.from(hashes.definitionHash)
    )
    .accountsStrict({
      sponsor: sponsor.publicKey,
      worker: worker.publicKey,
      paymentMint: USDC_MINT,
      config: configPda,
      agreement: agreementPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  await program.methods
    .createMilestone(
      0,
      AMOUNT,
      Array.from(hashes.definitionHash),
      sponsor.publicKey
    )
    .accountsStrict({
      sponsor: sponsor.publicKey,
      agreement: agreementPda,
      milestone: milestonePda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  // Acceptance is signed by the actual assigned worker.
  await program.methods
    .acceptAgreement()
    .accountsStrict({
      worker: worker.publicKey,
      agreement: agreementPda,
    })
    .signers([worker])
    .rpc();

  await program.methods
    .fundAgreement()
    .accountsStrict({
      sponsor: sponsor.publicKey,
      agreement: agreementPda,
      paymentMint: USDC_MINT,
      sponsorTokenAccount: sponsorTokenAccount.address,
      escrowAuthority,
      escrowTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  // Evidence comes from the verified account-level recipe.
  await program.methods
    .submitEvidence(Array.from(hashes.evidenceHash))
    .accountsStrict({
      worker: worker.publicKey,
      agreement: agreementPda,
      milestone: milestonePda,
    })
    .signers([worker])
    .rpc();

  const agreement = await program.account.agreement.fetch(agreementPda);
  const milestone = await program.account.milestone.fetch(milestonePda);
  const escrow = await getAccount(
    connection,
    escrowTokenAccount,
    "confirmed",
    TOKEN_PROGRAM_ID
  );

  if (!agreement.workerAccepted) {
    throw new Error("Worker acceptance was not recorded.");
  }

  if (!milestone.evidenceSubmitted) {
    throw new Error("Evidence submission was not recorded.");
  }

  if (escrow.amount !== 1_000_000n) {
    throw new Error(`Unexpected escrow balance: ${escrow.amount.toString()}`);
  }

  console.log("\nAgreement created, accepted, funded, and evidence submitted.");
  console.log(`Worker: ${worker.publicKey.toBase58()}`);
  console.log(`Agreement PDA: ${agreementPda.toBase58()}`);
  console.log(`Milestone PDA: ${milestonePda.toBase58()}`);
  console.log(`Escrow token account: ${escrowTokenAccount.toBase58()}`);
  console.log(`Worker USDC account: ${workerTokenAccount.address.toBase58()}`);
  console.log(`Escrow balance: ${Number(escrow.amount) / 1_000_000} USDC`);
  console.log(`Definition hash: ${hashes.definitionHash.toString("hex")}`);
  console.log(`Evidence hash: ${hashes.evidenceHash.toString("hex")}`);

  console.log("\nNext, run verify_solana_program.ts --attest using:");
  console.log(`AGREEMENT_PDA=${agreementPda.toBase58()}`);
  console.log(`MILESTONE_PDA=${milestonePda.toBase58()}`);
}

async function finish(): Promise<void> {
  const agreementValue = process.env.AGREEMENT_PDA;
  const milestoneValue = process.env.MILESTONE_PDA;

  if (!agreementValue || !milestoneValue) {
    throw new Error("Set AGREEMENT_PDA and MILESTONE_PDA before --finish.");
  }

  const connection = new Connection(RPC_URL, "confirmed");
  const sponsor = loadSponsor();
  const program = loadProgram(connection, sponsor);

  const agreementPda = new PublicKey(agreementValue);
  const milestonePda = new PublicKey(milestoneValue);

  const agreement = await program.account.agreement.fetch(agreementPda);
  const milestone = await program.account.milestone.fetch(milestonePda);

  if (!("verified" in milestone.status)) {
    throw new Error(
      "Milestone is not verified. Run the verifier's --attest mode first."
    );
  }

  if (!("active" in agreement.status) && !("funded" in agreement.status)) {
    throw new Error("Agreement is not in a payable status.");
  }

  const [escrowAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), agreementPda.toBuffer()],
    PROGRAM_ID
  );

  const [escrowTokenAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow-token"), agreementPda.toBuffer()],
    PROGRAM_ID
  );

  const workerTokenAccount = await getAssociatedTokenAddress(
    USDC_MINT,
    agreement.worker,
    false,
    TOKEN_PROGRAM_ID
  );

  const signature = await program.methods
    .releaseMilestone()
    .accountsStrict({
      agreement: agreementPda,
      milestone: milestonePda,
      paymentMint: USDC_MINT,
      escrowAuthority,
      escrowTokenAccount,
      workerTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  const finalAgreement = await program.account.agreement.fetch(agreementPda);
  const finalMilestone = await program.account.milestone.fetch(milestonePda);
  const escrow = await getAccount(
    connection,
    escrowTokenAccount,
    "confirmed",
    TOKEN_PROGRAM_ID
  );
  const workerBalance = await getAccount(
    connection,
    workerTokenAccount,
    "confirmed",
    TOKEN_PROGRAM_ID
  );

  if (
    !("completed" in finalAgreement.status) ||
    !("released" in finalMilestone.status) ||
    escrow.amount !== 0n ||
    workerBalance.amount !== 1_000_000n
  ) {
    throw new Error("Final settlement balance or state validation failed.");
  }

  console.log("\nDevnet settlement completed and verified.");
  console.log(`Settlement transaction: ${signature}`);
  console.log("Agreement status: Completed");
  console.log("Milestone status: Released");
  console.log("Escrow remaining: 0 USDC");
  console.log(`Worker received: ${Number(workerBalance.amount) / 1_000_000} USDC`);
}

async function main(): Promise<void> {
  const mode = process.argv[2];

  if (mode === "--start") {
    await start();
  } else if (mode === "--finish") {
    await finish();
  } else {
    console.log(
      "Usage: devnet_smoke_test.ts --start\n" +
      "Then attest with verify_solana_program.ts --attest\n" +
      "Finally: devnet_smoke_test.ts --finish"
    );
  }
}

main().catch((error: unknown) => {
  console.error(
    "Devnet smoke test failed:",
    error instanceof Error ? error.message : error
  );
  process.exitCode = 1;
});
