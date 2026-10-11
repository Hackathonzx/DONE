import { PublicKey } from '@solana/web3.js';

// Official standard USDC SPL Token mint on Solana Devnet
export const DEVNET_USDC_MINT = new PublicKey(
  '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
);

// DONE Protocol Deployed Program ID on Solana Devnet
export const DONE_PROGRAM_ID = new PublicKey(
  '82MCkYR3RkcqBcYWDDixbaoi4bWL8w5ohu7UkJTiZXYM'
);

// Protocol Config PDA on Devnet
export const PROTOCOL_CONFIG_PDA = new PublicKey(
  '6HamdMRRAhWZyThM5dpCjyfQBkZaAsLrMVjQenMJPua1'
);

// ProgramData PDA on Devnet
export const PROGRAM_DATA_PDA = new PublicKey(
  '9rraZSR21igaq3pvTwbnoJgtsj5sJoeSXkZBUBafXC4B'
);

// Upgradeable Loader Program ID
export const UPGRADEABLE_LOADER_ID = new PublicKey(
  'BPFLoaderUpgradeab1e11111111111111111111111'
);

// Protocol Admin / Upgrade Authority on Devnet
export const PROTOCOL_ADMIN_PUBKEY = new PublicKey(
  'APCVxcE8EfdnP5bfkbVTb8foLAa2f3RACgbb1uFyUCSB'
);

// Standard Devnet RPC Endpoint
export const DEVNET_RPC_URL = 'https://api.devnet.solana.com';

export const USDC_DECIMALS = 6;

/**
 * Format raw USDC amount (e.g. 5000000 -> 5.00)
 */
export function formatUsdc(rawAmount: number | bigint): string {
  const num = typeof rawAmount === 'bigint' ? Number(rawAmount) : rawAmount;
  const inDollars = num / 10 ** USDC_DECIMALS;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(inDollars);
}

/**
 * Parse human USDC input (e.g. "50.5" -> 50500000)
 */
export function parseUsdc(input: number | string): number {
  const val = typeof input === 'string' ? parseFloat(input) : input;
  if (isNaN(val) || val < 0) return 0;
  return Math.round(val * 10 ** USDC_DECIMALS);
}

/**
 * Format address for UI display (e.g. 8kY4...4sA1)
 */
export function truncateAddress(address: string | PublicKey | undefined, chars = 4): string {
  if (!address) return '';
  const str = typeof address === 'string' ? address : address.toBase58();
  if (str.length <= chars * 2 + 2) return str;
  return `${str.slice(0, chars)}...${str.slice(-chars)}`;
}

/**
 * Generate Solana Explorer link for transaction or address
 */
export function getExplorerUrl(
  hashOrAddr: string,
  type: 'tx' | 'address' = 'tx',
  cluster = 'devnet'
): string {
  return `https://explorer.solana.com/${type}/${hashOrAddr}?cluster=${cluster}`;
}
