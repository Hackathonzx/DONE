
import * as anchor from "@coral-xyz/anchor";
import { getMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { readFileSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";
import type { DoneProtocol } from "../target/types/done_protocol";

const RPC_URL = "https://api.devnet.solana.com";

const PROGRAM_ID = new PublicKey(
  "82MCkYR3RkcqBcYWDDixbaoi4bWL8w5ohu7UkJTiZXYM"
);

const DEVNET_USDC_MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

const EXPECTED_AUTHORITY = new PublicKey(
  "APCVxcE8EfdnP5bfkbVTb8foLAa2f3RACgbb1uFyUCSB"
);

const UPGRADEABLE_LOADER_ID = new PublicKey(
  "BPFLoaderUpgradeab1e11111111111111111111111"
);

async function main(): Promise<void> {
  const connection = new Connection(RPC_URL, "confirmed");

  const secretKey = JSON.parse(
    readFileSync(
      resolve(homedir(), ".config/solana/id.json"),
      "utf8"
    )
  ) as number[];

  const keypair = Keypair.fromSecretKey(
    Uint8Array.from(secretKey)
  );

  if (!keypair.publicKey.equals(EXPECTED_AUTHORITY)) {
    throw new Error(
      "The configured wallet is not the expected upgrade authority. Aborting."
    );
  }

  const wallet = new anchor.Wallet(keypair);

  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });

  const idl = JSON.parse(
    readFileSync(
      resolve(__dirname, "../target/idl/done_protocol.json"),
      "utf8"
    )
  ) as DoneProtocol;

  const program = new anchor.Program<DoneProtocol>(idl, provider);

  if (!program.programId.equals(PROGRAM_ID)) {
    throw new Error(
      `IDL program ID mismatch: ${program.programId.toBase58()}`
    );
  }

  const programInfo = await connection.getAccountInfo(
    PROGRAM_ID,
    "confirmed"
  );

  if (
    !programInfo ||
    !programInfo.executable ||
    !programInfo.owner.equals(UPGRADEABLE_LOADER_ID)
  ) {
    throw new Error(
      "DONE Protocol is not executable under the expected upgradeable loader."
    );
  }

  const mint = await getMint(
    connection,
    DEVNET_USDC_MINT,
    "confirmed",
    TOKEN_PROGRAM_ID
  );

  if (mint.decimals !== 6) {
    throw new Error(
      `Unexpected USDC decimals: ${mint.decimals}. Expected 6.`
    );
  }

  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );

  // Never try to reinitialize an existing config with another mint.
  const existingConfigInfo = await connection.getAccountInfo(
    configPda,
    "confirmed"
  );

  if (existingConfigInfo) {
    const existingConfig =
      await program.account.protocolConfig.fetch(configPda);

    if (
      existingConfig.admin.equals(keypair.publicKey) &&
      existingConfig.paymentMint.equals(DEVNET_USDC_MINT)
    ) {
      console.log("Protocol config is already initialized correctly.");
      console.log(`Config PDA: ${configPda.toBase58()}`);
      console.log(`Admin: ${existingConfig.admin.toBase58()}`);
      console.log(
        `Payment mint: ${existingConfig.paymentMint.toBase58()}`
      );
      return;
    }

    throw new Error(
      "Config PDA already exists with unexpected settings. No changes made."
    );
  }

  const [programDataPda] = PublicKey.findProgramAddressSync(
    [PROGRAM_ID.toBuffer()],
    UPGRADEABLE_LOADER_ID
  );

  console.log("Initializing DONE Protocol on devnet...");
  console.log(`Authority: ${keypair.publicKey.toBase58()}`);
  console.log(`Config PDA: ${configPda.toBase58()}`);
  console.log(`USDC mint: ${DEVNET_USDC_MINT.toBase58()}`);
  console.log(`USDC decimals: ${mint.decimals}`);

  const signature = await program.methods
    .initializeConfig()
     .accountsStrict({
      authority: keypair.publicKey,
      config: configPda,
      paymentMint: DEVNET_USDC_MINT,
      program: PROGRAM_ID,
      programData: programDataPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const config = await program.account.protocolConfig.fetch(configPda);

  if (
    !config.admin.equals(keypair.publicKey) ||
    !config.paymentMint.equals(DEVNET_USDC_MINT)
  ) {
    throw new Error(
      "Post-initialization config verification failed."
    );
  }

  console.log("\nProtocol config initialized and verified.");
  console.log(`Transaction: ${signature}`);
  console.log(`Config PDA: ${configPda.toBase58()}`);
  console.log(`Admin: ${config.admin.toBase58()}`);
  console.log(`Payment mint: ${config.paymentMint.toBase58()}`);
}

main().catch((error: unknown) => {
  console.error(
    "Initialization failed:",
    error instanceof Error ? error.message : error
  );
  process.exitCode = 1;
});
