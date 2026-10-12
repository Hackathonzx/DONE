# IDL Export and Frontend Setup

## Important: use the IDL that matches the deployed program

The handoff bundle documents the interface, but it does not fabricate a replacement IDL JSON. The exact generated IDL must be exported from the local built program or fetched from Devnet. Use the deployed IDL as the frontend source of truth.

## Fetch the deployed IDL

From your repository root, run these commands in a shell where Anchor CLI 0.32.1 is available:

```bash
cd anchor
anchor idl fetch -o target/idl/done_protocol.devnet.json 82MCkYR3RkcqBcYWDDixbaoi4bWL8w5ohu7UkJTiZXYM --provider.cluster devnet
```

If your installed CLI rejects the placement of `--provider.cluster devnet`, use its help to check the accepted global-option position:

```bash
anchor idl fetch --help
```

Anchor documents `anchor idl fetch -o <out-file.json> <program-id>` as the command to fetch an on-chain IDL. See [Anchor CLI reference](https://www.anchor-lang.com/docs/references/cli).

After fetch succeeds, inspect the instruction list without printing the full IDL:

```bash
cd anchor
node -e "const i=require('./target/idl/done_protocol.devnet.json'); console.log('address:',i.address||i.metadata?.address); console.log(i.instructions.map(x=>x.name).join('\\n'))"
```

Expected instruction names (IDL JSON may display snake_case depending on IDL version): `initialize_config`, `create_agreement`, `create_milestone`, `accept_agreement`, `fund_agreement`, `submit_evidence`, `verify_evidence`, `reject_evidence`, `release_milestone`, `cancel_agreement`.

## Deliver the IDL to the frontend developer

Copy `anchor/target/idl/done_protocol.devnet.json` into the frontend repository, for example `src/idl/done_protocol.devnet.json`, and include the matching generated type if your chosen Anchor client setup requires it. Do not hand-edit fields. Commit this generated IDL as part of the frontend/handoff material or attach it separately to the teammate.

Before integrating, the frontend developer should confirm the IDL's program address equals:

`82MCkYR3RkcqBcYWDDixbaoi4bWL8w5ohu7UkJTiZXYM`

Compare the fetched IDL instruction names with the deployed source. If the IDL on Devnet doesn't include `accept_agreement` and `cancel_agreement`, stop; do not assume the client's interface matches the deployed binary.

## Local workspace setup

```bash
cd anchor
anchor build
anchor test --skip-build
```

Use `--skip-build` only for TypeScript/test-only changes. Rebuild after Rust program changes. Keep local `Anchor.toml`'s provider default in mind: it was configured for `localnet`; use explicit Devnet selection for Devnet operations.

## Secret handling

Never copy `~/.config/solana/id.json` or any secret key into the frontend repository or browser code. Frontend users connect their own wallets. The upgrade authority/admin wallet is for controlled deployment/admin operations only.
