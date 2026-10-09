import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DoneProtocol } from "../target/types/done_protocol";
import { assert } from "chai";

describe("done_protocol", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.doneProtocol as Program<DoneProtocol>;

  it("creates an agreement and enforces milestone allocation limits", async () => {
    const sponsor = provider.wallet.publicKey;
    const worker = anchor.web3.Keypair.generate().publicKey;
    const paymentMint = anchor.web3.Keypair.generate().publicKey;

    const agreementId = new anchor.BN(1);
    const totalAmount = new anchor.BN(1_000_000);
    const definitionHash = Array.from(Buffer.alloc(32, 7));

    const [agreementPda] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("agreement"),
          sponsor.toBuffer(),
          agreementId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

    await program.methods
      .createAgreement(agreementId, totalAmount, definitionHash)
      .accounts({
        sponsor,
        worker,
        paymentMint,
        agreement: agreementPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    let agreement = await program.account.agreement.fetch(agreementPda);

    assert.equal(agreement.totalAmount.toString(), "1000000");
    assert.equal(agreement.allocatedAmount.toString(), "0");
    assert.equal(agreement.milestoneCount, 0);
    assert.ok("draft" in agreement.status);

    async function createMilestone(index: number, amount: number) {
      const [milestonePda] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from("milestone"),
            agreementPda.toBuffer(),
            new anchor.BN(index).toArrayLike(Buffer, "le", 4),
          ],
          program.programId
        );

      await program.methods
        .createMilestone(
          index,
          new anchor.BN(amount),
          definitionHash
        )
        .accounts({
          sponsor,
          agreement: agreementPda,
          milestone: milestonePda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      return program.account.milestone.fetch(milestonePda);
    }

    const first = await createMilestone(0, 600_000);
    assert.equal(first.amount.toString(), "600000");
    assert.ok("pending" in first.status);

    const second = await createMilestone(1, 400_000);
    assert.equal(second.amount.toString(), "400000");

    agreement = await program.account.agreement.fetch(agreementPda);
    assert.equal(agreement.allocatedAmount.toString(), "1000000");
    assert.equal(agreement.milestoneCount, 2);

    let rejected = false;

    try {
      await createMilestone(2, 1);
    } catch (error) {
      rejected = true;
      assert.include(
        String(error),
        "Milestone allocation exceeds agreement total"
      );
    }

    assert.isTrue(
      rejected,
      "An allocation exceeding the agreement total must fail"
    );

    agreement = await program.account.agreement.fetch(agreementPda);
    assert.equal(agreement.allocatedAmount.toString(), "1000000");
    assert.equal(agreement.milestoneCount, 2);
  });
});
