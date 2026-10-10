import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DoneProtocol } from "../target/types/done_protocol";
import { assert } from "chai";

import {
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

describe("done_protocol", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.doneProtocol as Program<DoneProtocol>;

  it("creates, funds, verifies, and settles milestones securely", async () => {
    const sponsor = provider.wallet.publicKey;

    const payer = (
      provider.wallet as unknown as { payer: anchor.web3.Keypair }
    ).payer;

    const worker = anchor.web3.Keypair.generate();
    const verifier = anchor.web3.Keypair.generate();

    const unauthorizedWorker = anchor.web3.Keypair.generate();
    const unauthorizedVerifier = anchor.web3.Keypair.generate();

    const totalAmount = new anchor.BN(1_000_000);

    const definitionHash = Array.from(Buffer.alloc(32, 7));
    const evidenceHash = Array.from(Buffer.alloc(32, 9));

    const paymentMint = await createMint(
      provider.connection,
      payer,
      sponsor,
      null,
      6
    );

const [configPda] =
  anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

const [programDataPda] =
  anchor.web3.PublicKey.findProgramAddressSync(
    [program.programId.toBuffer()],
    new anchor.web3.PublicKey("BPFLoaderUpgradeab1e11111111111111111111111")
  );

await program.methods
  .initializeConfig()
  .accounts({
    authority: sponsor,
    config: configPda,
    paymentMint,
    program: program.programId,
    programData: programDataPda,
    systemProgram: anchor.web3.SystemProgram.programId,
  })
  .rpc();


    // A second valid mint used to test unsupported payment mints.
    const invalidPaymentMint = await createMint(
      provider.connection,
      payer,
      sponsor,
      null,
      6
    );



    const sponsorTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer,
      paymentMint,
      sponsor
    );

    await mintTo(
      provider.connection,
      payer,
      paymentMint,
      sponsorTokenAccount.address,
      payer,
      totalAmount.toNumber()
    );

    const workerTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer,
      paymentMint,
      worker.publicKey
    );


const unauthorizedWorkerTokenAccount =
  await getOrCreateAssociatedTokenAccount(
    provider.connection,
    payer,
    paymentMint,
    unauthorizedWorker.publicKey
  );


    const agreementId = new anchor.BN(1);

    const [agreementPda] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("agreement"),
          sponsor.toBuffer(),
          agreementId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

    // A sponsor cannot also be the worker.
    let invalidWorkerRejected = false;
    try {
      await program.methods
        .createAgreement(agreementId, totalAmount, definitionHash)
        .accounts({
          sponsor,
          worker: sponsor,
          paymentMint,
config: configPda,
agreement: agreementPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
    } catch (error) {
      invalidWorkerRejected = true;
      assert.include(String(error), "Worker must be a nonzero key different from the sponsor");
    }
    assert.isTrue(invalidWorkerRejected);

    // A Definition of Done must have a nonzero commitment.
    let emptyAgreementHashRejected = false;
    try {
      await program.methods
        .createAgreement(
          agreementId,
          totalAmount,
          Array.from(Buffer.alloc(32))
        )
        .accounts({
          sponsor,
          worker: worker.publicKey,
          paymentMint,
config: configPda,
agreement: agreementPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
    } catch (error) {
      emptyAgreementHashRejected = true;
      assert.include(String(error), "Definition of Done hash cannot be empty");
    }
    assert.isTrue(emptyAgreementHashRejected);

    // A different, valid SPL Token mint must be rejected by ProtocolConfig.
    let unsupportedMintRejected = false;

    try {
            await program.methods
        .createAgreement(agreementId, totalAmount, definitionHash)
        .accounts({
          sponsor,
          worker: worker.publicKey,
          paymentMint: invalidPaymentMint,
          config: configPda,
          agreement: agreementPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
    } catch (error) {
      unsupportedMintRejected = true;
      assert.include(
        String(error),
        "Payment mint does not match the agreement"
      );
    }

    assert.isTrue(unsupportedMintRejected);

    // The valid agreement creation should still succeed.
    await program.methods
      .createAgreement(agreementId, totalAmount, definitionHash)
      .accounts({
        sponsor,
        worker: worker.publicKey,
        paymentMint,
        config: configPda,
        agreement: agreementPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    let agreement = await program.account.agreement.fetch(agreementPda);

    assert.equal(agreement.totalAmount.toString(), "1000000");
    assert.equal(agreement.allocatedAmount.toString(), "0");
    assert.equal(agreement.milestoneCount, 0);
    assert.ok("draft" in agreement.status);

    async function createMilestone(
      index: number,
      amount: number,
      milestoneDefinitionHash: number[] = definitionHash,
      milestoneVerifier: anchor.web3.PublicKey = verifier.publicKey
    ) {
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
          milestoneDefinitionHash,
          milestoneVerifier
        )
        .accounts({
          sponsor,
          agreement: agreementPda,
          milestone: milestonePda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      return milestonePda;
    }

    // Reject an empty milestone Definition of Done hash.
    let emptyMilestoneHashRejected = false;
    try {
      await createMilestone(0, 600_000, Array.from(Buffer.alloc(32)));
    } catch (error) {
      emptyMilestoneHashRejected = true;
      assert.include(String(error), "Definition of Done hash cannot be empty");
    }
    assert.isTrue(emptyMilestoneHashRejected);

    // Reject an unset verifier.
    let defaultVerifierRejected = false;
    try {
      await createMilestone(
        0,
        600_000,
        definitionHash,
        anchor.web3.PublicKey.default
      );
    } catch (error) {
      defaultVerifierRejected = true;
      assert.include(String(error), "Verifier public key cannot be the default public key");
    }
    assert.isTrue(defaultVerifierRejected);

    // Valid milestone creation still succeeds after the rejected attempts.
    const firstPda = await createMilestone(0, 600_000);
    let first = await program.account.milestone.fetch(firstPda);

    assert.equal(first.amount.toString(), "600000");
    assert.ok("pending" in first.status);
    assert.equal(first.verifier.toBase58(), verifier.publicKey.toBase58());

    const secondPda = await createMilestone(1, 400_000);
    const second = await program.account.milestone.fetch(secondPda);

    assert.equal(second.amount.toString(), "400000");
    assert.equal(second.verifier.toBase58(), verifier.publicKey.toBase58());

    agreement = await program.account.agreement.fetch(agreementPda);
    assert.equal(agreement.allocatedAmount.toString(), "1000000");
    assert.equal(agreement.milestoneCount, 2);

    // Over-allocation must fail without changing agreement state.
    let allocationRejected = false;

    try {
      await createMilestone(2, 1);
    } catch (error) {
      allocationRejected = true;
      assert.include(
        String(error),
        "Milestone allocation exceeds agreement total"
      );
    }

    assert.isTrue(allocationRejected);

    agreement = await program.account.agreement.fetch(agreementPda);
    assert.equal(agreement.allocatedAmount.toString(), "1000000");
    assert.equal(agreement.milestoneCount, 2);

    const [escrowAuthority] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), agreementPda.toBuffer()],
        program.programId
      );

    const [escrowTokenAccount] =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("escrow-token"), agreementPda.toBuffer()],
        program.programId
      );

    await program.methods
      .fundAgreement()
      .accounts({
        sponsor,
        agreement: agreementPda,
        paymentMint,
        sponsorTokenAccount: sponsorTokenAccount.address,
        escrowAuthority,
        escrowTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    let escrow = await getAccount(
      provider.connection,
      escrowTokenAccount
    );

    assert.equal(escrow.amount.toString(), "1000000");

    const sponsorBalance = await getAccount(
      provider.connection,
      sponsorTokenAccount.address
    );

    assert.equal(sponsorBalance.amount.toString(), "0");

    agreement = await program.account.agreement.fetch(agreementPda);

    assert.ok("funded" in agreement.status);
    assert.equal(agreement.releasedAmount.toString(), "0");

    // Funding the same agreement a second time must fail.
    let secondFundingRejected = false;

    try {
      await program.methods
        .fundAgreement()
        .accounts({
          sponsor,
          agreement: agreementPda,
          paymentMint,
          sponsorTokenAccount: sponsorTokenAccount.address,
          escrowAuthority,
          escrowTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
    } catch {
      secondFundingRejected = true;
    }

    assert.isTrue(secondFundingRejected);

    escrow = await getAccount(provider.connection, escrowTokenAccount);
    assert.equal(escrow.amount.toString(), "1000000");

    // An unassigned worker must not submit evidence.
    let unauthorizedSubmissionRejected = false;

    try {
      await program.methods
        .submitEvidence(evidenceHash)
        .accounts({
          worker: unauthorizedWorker.publicKey,
          agreement: agreementPda,
          milestone: firstPda,
        })
        .signers([unauthorizedWorker])
        .rpc();
    } catch {
      unauthorizedSubmissionRejected = true;
    }

    assert.isTrue(unauthorizedSubmissionRejected);

    // The verifier cannot approve evidence that has not been submitted.
    let prematureVerificationRejected = false;

    try {
      await program.methods
        .verifyEvidence()
        .accounts({
          verifier: verifier.publicKey,
          agreement: agreementPda,
          milestone: firstPda,
        })
        .signers([verifier])
        .rpc();
    } catch {
      prematureVerificationRejected = true;
    }

    assert.isTrue(prematureVerificationRejected);

    // The assigned worker submits evidence for milestone 0.
    await program.methods
      .submitEvidence(evidenceHash)
      .accounts({
        worker: worker.publicKey,
        agreement: agreementPda,
        milestone: firstPda,
      })
      .signers([worker])
      .rpc();

    first = await program.account.milestone.fetch(firstPda);

    assert.ok("evidenceSubmitted" in first.status || first.evidenceSubmitted);
    assert.equal(first.evidenceSubmitted, true);
    assert.deepEqual(first.evidenceHash, evidenceHash);

    // A different verifier must not approve the milestone.
    let unauthorizedVerificationRejected = false;

    try {
      await program.methods
        .verifyEvidence()
        .accounts({
          verifier: unauthorizedVerifier.publicKey,
          agreement: agreementPda,
          milestone: firstPda,
        })
        .signers([unauthorizedVerifier])
        .rpc();
    } catch {
      unauthorizedVerificationRejected = true;
    }

    assert.isTrue(unauthorizedVerificationRejected);

    // Rejection by an unassigned verifier must fail.
    const rejectionReasonHash = Array.from(Buffer.alloc(32, 13));

    let unauthorizedRejectionRejected = false;

    try {
      await program.methods
        .rejectEvidence(rejectionReasonHash)
        .accounts({
          verifier: unauthorizedVerifier.publicKey,
          agreement: agreementPda,
          milestone: firstPda,
        })
        .signers([unauthorizedVerifier])
        .rpc();
    } catch {
      unauthorizedRejectionRejected = true;
    }

    assert.isTrue(unauthorizedRejectionRejected);

    // The assigned verifier rejects the original evidence.
    await program.methods
      .rejectEvidence(rejectionReasonHash)
      .accounts({
        verifier: verifier.publicKey,
        agreement: agreementPda,
        milestone: firstPda,
      })
      .signers([verifier])
      .rpc();

    first = await program.account.milestone.fetch(firstPda);

    assert.ok("pending" in first.status);
    assert.isFalse(first.evidenceSubmitted);
    assert.deepEqual(first.evidenceHash, Array.from(Buffer.alloc(32)));

    // The worker submits revised evidence after rejection.
    const revisedEvidenceHash = Array.from(Buffer.alloc(32, 10));

    await program.methods
      .submitEvidence(revisedEvidenceHash)
      .accounts({
        worker: worker.publicKey,
        agreement: agreementPda,
        milestone: firstPda,
      })
      .signers([worker])
      .rpc();

    first = await program.account.milestone.fetch(firstPda);

    assert.ok("evidenceSubmitted" in first.status);
    assert.isTrue(first.evidenceSubmitted);
    assert.deepEqual(first.evidenceHash, revisedEvidenceHash);

    // The assigned verifier approves the revised evidence.
    await program.methods
      .verifyEvidence()
      .accounts({
        verifier: verifier.publicKey,
        agreement: agreementPda,
        milestone: firstPda,
      })
      .signers([verifier])
      .rpc();

    first = await program.account.milestone.fetch(firstPda);
    assert.ok("verified" in first.status);

    async function releaseMilestone(milestonePda: anchor.web3.PublicKey, destinationTokenAccount = workerTokenAccount.address) {
      await program.methods
        .releaseMilestone()
        .accounts({
          agreement: agreementPda,
          milestone: milestonePda,
          paymentMint,
          escrowAuthority,
          escrowTokenAccount,
          workerTokenAccount: destinationTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
    }


      // An unverified milestone must not be paid.
      let unverifiedReleaseRejected = false;

      try {
        await releaseMilestone(secondPda);
      } catch (error) {
        unverifiedReleaseRejected = true;
        assert.include(
          String(error),
          "Milestone is not in the required status"
        );
      }

      assert.isTrue(unverifiedReleaseRejected);

      // A verified milestone cannot pay an unrelated worker.
      let wrongRecipientRejected = false;

      try {
        await releaseMilestone(
          firstPda,
          unauthorizedWorkerTokenAccount.address
        );
      } catch (error) {
        wrongRecipientRejected = true;
        assert.include(
          String(error),
          "Worker token account does not belong to the assigned worker"
        );
      }

      assert.isTrue(wrongRecipientRejected);

      // Failed payouts must leave escrow and recipient balances unchanged.
      escrow = await getAccount(provider.connection, escrowTokenAccount);
      assert.equal(escrow.amount.toString(), "1000000");

      const workerBalanceBeforeRelease = await getAccount(
        provider.connection,
        workerTokenAccount.address
      );
      assert.equal(workerBalanceBeforeRelease.amount.toString(), "0");

      const unauthorizedWorkerBalance = await getAccount(
        provider.connection,
        unauthorizedWorkerTokenAccount.address
      );
      assert.equal(unauthorizedWorkerBalance.amount.toString(), "0");


    // Release milestone 0 after verification.
    await releaseMilestone(firstPda);

    first = await program.account.milestone.fetch(firstPda);
    assert.ok("released" in first.status);
    assert.equal(first.releasedAmount.toString(), "600000");

    agreement = await program.account.agreement.fetch(agreementPda);
    assert.ok("active" in agreement.status);
    assert.equal(agreement.releasedAmount.toString(), "600000");

    escrow = await getAccount(provider.connection, escrowTokenAccount);
    assert.equal(escrow.amount.toString(), "400000");

    let workerBalance = await getAccount(
      provider.connection,
      workerTokenAccount.address
    );

    assert.equal(workerBalance.amount.toString(), "600000");

    // A released milestone cannot be paid a second time.
    let duplicateReleaseRejected = false;

    try {
      await releaseMilestone(firstPda);
    } catch {
      duplicateReleaseRejected = true;
    }

    assert.isTrue(duplicateReleaseRejected);

    workerBalance = await getAccount(
      provider.connection,
      workerTokenAccount.address
    );

    assert.equal(workerBalance.amount.toString(), "600000");

    // Complete the evidence-verification-release flow for milestone 1.
    await program.methods
      .submitEvidence(evidenceHash)
      .accounts({
        worker: worker.publicKey,
        agreement: agreementPda,
        milestone: secondPda,
      })
      .signers([worker])
      .rpc();

    await program.methods
      .verifyEvidence()
      .accounts({
        verifier: verifier.publicKey,
        agreement: agreementPda,
        milestone: secondPda,
      })
      .signers([verifier])
      .rpc();

    await releaseMilestone(secondPda);

    const finalMilestone = await program.account.milestone.fetch(secondPda);
    assert.ok("released" in finalMilestone.status);
    assert.equal(finalMilestone.releasedAmount.toString(), "400000");

    agreement = await program.account.agreement.fetch(agreementPda);
    assert.ok("completed" in agreement.status);
    assert.equal(agreement.releasedAmount.toString(), "1000000");

    escrow = await getAccount(provider.connection, escrowTokenAccount);
    assert.equal(escrow.amount.toString(), "0");

    workerBalance = await getAccount(
      provider.connection,
      workerTokenAccount.address
    );

    assert.equal(workerBalance.amount.toString(), "1000000");
  });
});
