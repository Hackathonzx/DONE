# Devnet Deployment and Smoke-test Log

This file records values copied from the successful command outputs during the team session. Confirm with Solana Explorer before using them in a live demo, as Devnet can be reset and deployments can be upgraded.

## Deployment

- Cluster URL: `https://api.devnet.solana.com`
- Program ID: `82MCkYR3RkcqBcYWDDixbaoi4bWL8w5ohu7UkJTiZXYM`
- ProgramData: `9rraZSR21igaq3pvTwbnoJgtsj5sJoeSXkZBUBafXC4B`
- Upgrade authority: `APCVxcE8EfdnP5bfkbVTb8foLAa2f3RACgbb1uFyUCSB`
- Last deployed slot shown by CLI: `509420296`
- Compiled program byte length shown by CLI: `429048`
- Program account balance shown after deployment: `2.18044268 SOL`
- Deployment transaction: `5toYvUkkLHp6GDGi8fRGXzkhoFFxixDyqPY1RdGRkCPdBYG6jDYmc6WY3HqzP6veH8aQKSRC87UBbwJS4RaKUYPr`
- IDL metadata address printed by deploy: `Bio7ZXi791RrZsS4uSbC1gG2yquQv5D937kEMsxgDjLu`
- [Deployment transaction](https://explorer.solana.com/tx/5toYvUkkLHp6GDGi8fRGXzkhoFFxixDyqPY1RdGRkCPdBYG6jDYmc6WY3HqzP6veH8aQKSRC87UBbwJS4RaKUYPr?cluster=devnet)
- [Program Explorer page](https://explorer.solana.com/address/82MCkYR3RkcqBcYWDDixbaoi4bWL8w5ohu7UkJTiZXYM?cluster=devnet)

## Protocol config initialization

- Config PDA: `6HamdMRRAhWZyThM5dpCjyfQBkZaAsLrMVjQenMJPua1`
- Config admin: `APCVxcE8EfdnP5bfkbVTb8foLAa2f3RACgbb1uFyUCSB`
- Payment mint: Devnet USDC `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (6 decimals)
- Initialization transaction: `3schhcX4kf45wuedWLF9LsQ5qeRxppMPwiAPbmfF2FkaaoybrusyioxKD8Ci1SW1YrWpQaVFAkdEa3N2NgaYAnVh`
- [Initialization transaction](https://explorer.solana.com/tx/3schhcX4kf45wuedWLF9LsQ5qeRxppMPwiAPbmfF2FkaaoybrusyioxKD8Ci1SW1YrWpQaVFAkdEa3N2NgaYAnVh?cluster=devnet)
- [Config PDA](https://explorer.solana.com/address/6HamdMRRAhWZyThM5dpCjyfQBkZaAsLrMVjQenMJPua1?cluster=devnet)

The init script verified the configured authority/mint after the transaction. Config is a singleton PDA; do not rerun the init transaction to try to change the mint.

## Devnet USDC setup

- Sponsor/admin public key: `APCVxcE8EfdnP5bfkbVTb8foLAa2f3RACgbb1uFyUCSB`
- Sponsor associated token account: `5A5gtLvfrrPoRJ52qpQMDa9AjfNu1bL8tWbN7pKXwnr1`
- Reported test USDC received: `20 USDC` (`20,000,000` raw units)
- Faucet: [Circle Testnet Faucet](https://faucet.circle.com/)

## One-USDC lifecycle smoke test

The successful smoke test used the deployed DONE Protocol program as the account-level verification target. Transactions ran through local scripts but were real Devnet transactions.

- Worker public key (ephemeral; private key not saved): `8mxRTwLkh6pPDJKiRViYJfnywUNcTToGsQhHoGkQYz7b`
- Agreement PDA: `5j9ppSy2X759be5ZHYuCgGeSwyZc3bKiAkGtf1Th67dF`
- Milestone PDA: `BYPwokiVFxcLbN6asPPdFhvwGdrnipbyrGByZoUkkosY`
- Escrow token account PDA: `5goTagkh3WhH7BBhPQ2Uyqyj36KmoAaar7aCdb73eEZa`
- Worker USDC token account: `C3UF23HvzWo2dVg8RVvfmfYyvvYJKekCk9GtNRzbqBYF`
- Amount: `1 USDC` (`1,000,000` raw units)
- Definition of Done hash: `98c20aab27c1638fc261dce3f1f2a3db7553bd2522b57f7f0617f6a4ff4cd006`
- Evidence hash: `8c5e5f5d3abe7e03b5d938d2ec756755830d7042e84df18793362ee93913f1b4`
- Verifier: `APCVxcE8EfdnP5bfkbVTb8foLAa2f3RACgbb1uFyUCSB` (same wallet as admin/upgrade authority for this smoke test)
- Attestation transaction: `3UpkcC6ZmspCXR2CUdqMLqixSTVnv9vxZxULbJbHcZCDqinkqaVNRbEq5c59Ep6j4Pzd5ve5pcjBqqLp9wmrCCfM`
- Settlement transaction: `4agy2v8ezKNL4vvFrTPQYxAMsxWgCiirPgxdH6DRTQocNckXc4TExcXf9w1y59HCu1Lt8c1igHM8aMswh9RcRPTV`
- Final confirmed script output: Agreement `Completed`; milestone `Released`; escrow `0 USDC`; worker balance `1 USDC`.
- [Attestation transaction](https://explorer.solana.com/tx/3UpkcC6ZmspCXR2CUdqMLqixSTVnv9vxZxULbJbHcZCDqinkqaVNRbEq5c59Ep6j4Pzd5ve5pcjBqqLp9wmrCCfM?cluster=devnet)
- [Settlement transaction](https://explorer.solana.com/tx/4agy2v8ezKNL4vvFrTPQYxAMsxWgCiirPgxdH6DRTQocNckXc4TExcXf9w1y59HCu1Lt8c1igHM8aMswh9RcRPTV?cluster=devnet)

**Key-handling note:** worker keypair was created in memory and not saved to disk. It should not be expected to sign another transaction. The token account is a demo artifact containing test tokens; the smoke test result remains valid for the executed transaction.

## Previous build/test notes

- Anchor CLI in local WSL setup: `anchor-cli 0.32.1` (AVM 1.2.0).
- Rust dependencies: `anchor-lang = 0.32.1`, `anchor-spl = 0.32.1` with `token` feature.
- `anchor build` succeeded after acceptance/cancellation instruction registration and IDL generation; an `ambiguous glob re-exports` warning was observed before the named exports were fixed for acceptance/cancellation. Verify warning state on the current source before final submission.
- Local integration suite after worker acceptance reported `1 passing` (multiple assertions in one `it` case).
- Devnet smoke test for one USDC completed successfully.
