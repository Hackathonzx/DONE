
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  getAccount,
  getMint,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { readFileSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

const RPC_URL = "https://api.devnet.solana.com";
const MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

async function main(): Promise<void> {
  const secretPath = resolve(homedir(), ".config/solana/id.json");
  const secret = JSON.parse(readFileSync(secretPath, "utf8")) as number[];
  const payer = Keypair.fromSecretKey(Uint8Array.from(secret));

  const connection = new Connection(RPC_URL, "confirmed");
  const mint = await getMint(connection, MINT, "confirmed", TOKEN_PROGRAM_ID);

  if (mint.decimals !== 6) {
    throw new Error(`Expected 6 decimals, received ${mint.decimals}`);
  }

  const ata = await getAssociatedTokenAddress(
    MINT,
    payer.publicKey,
    false,
    TOKEN_PROGRAM_ID
  );

  console.log(`Sponsor: ${payer.publicKey.toBase58()}`);
  console.log(`USDC mint: ${MINT.toBase58()}`);
  console.log(`Associated token account: ${ata.toBase58()}`);

  const info = await connection.getAccountInfo(ata, "confirmed");

  if (!info) {
    console.log("USDC token account not found yet. The faucet transfer may still be pending.");
    return;
  }

  const account = await getAccount(
    connection,
    ata,
    "confirmed",
    TOKEN_PROGRAM_ID
  );

  if (
    !account.owner.equals(payer.publicKey) ||
    !account.mint.equals(MINT)
  ) {
    throw new Error("Token account owner or mint does not match.");
  }

  console.log(`USDC balance: ${Number(account.amount) / 1_000_000}`);
  console.log(`Raw token balance: ${account.amount.toString()}`);
}

main().catch((error: unknown) => {
  console.error(
    "Balance check failed:",
    error instanceof Error ? error.message : error
  );
  process.exitCode = 1;
});
