import assert from "node:assert";
import anchor from "@coral-xyz/anchor";

const { PublicKey, SystemProgram } = anchor.web3;
const { BN } = anchor;

anchor.setProvider(anchor.AnchorProvider.env());

const program = anchor.workspace.Lotto;
const provider = anchor.getProvider();
const authority = provider.wallet.publicKey;

const ROUND_SEED = Buffer.from("round");
const ENTRY_SEED = Buffer.from("entry");
const TREASURY_SEED = Buffer.from("treasury");
const TREASURY_VAULT_SEED = Buffer.from("treasury_vault");

const retainedBps = 500;
const ticketPriceLamports = new BN(1_000_000);
const durationSlots = new BN(1);
const joinTickets = 1;

const toU64LE = (value) => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(value.toString()));
  return buf;
};

const findRoundPda = (roundId) =>
  PublicKey.findProgramAddressSync(
    [ROUND_SEED, authority.toBuffer(), toU64LE(roundId)],
    program.programId,
  );

const findTreasuryPda = () =>
  PublicKey.findProgramAddressSync(
    [TREASURY_SEED, authority.toBuffer()],
    program.programId,
  );

const findTreasuryVaultPda = () =>
  PublicKey.findProgramAddressSync(
    [TREASURY_VAULT_SEED, authority.toBuffer()],
    program.programId,
  );

const findEntryPda = (round, entrant, nonce) =>
  PublicKey.findProgramAddressSync(
    [ENTRY_SEED, round.toBuffer(), entrant.toBuffer(), Buffer.from([nonce])],
    program.programId,
  );

const waitForSlot = async (targetSlot) => {
  for (;;) {
    const current = await provider.connection.getSlot();
    if (current >= targetSlot) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
};

const initializeRound = async (roundId, maxEntries) => {
  const [roundPda] = findRoundPda(roundId);
  const [treasuryPda] = findTreasuryPda();

  await program.methods
    .initializeRound({
      roundId,
      ticketPriceLamports,
      maxEntries,
      durationSlots,
      retainedBps,
    })
    .accounts({
      authority,
      round: roundPda,
      treasury: treasuryPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { roundPda, treasuryPda };
};

const joinRound = async (roundPda, treasuryPda, entrant, nonce = 0) => {
  const [entryPda] = findEntryPda(roundPda, entrant, nonce);
  const [treasuryVaultPda] = findTreasuryVaultPda();

  await program.methods
    .joinRound({ tickets: joinTickets, nonce })
    .accounts({
      entrant,
      round: roundPda,
      treasury: treasuryPda,
      treasuryVault: treasuryVaultPda,
      entry: entryPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return entryPda;
};

const testInitializeAndJoin = async () => {
  const roundId = new BN(1);
  const { roundPda, treasuryPda } = await initializeRound(roundId, 10);
  const entryPda = await joinRound(roundPda, treasuryPda, authority);

  const roundAccount = await program.account.round.fetch(roundPda);
  assert.strictEqual(roundAccount.potLamports.toString(), ticketPriceLamports.toString(), "pot did not match ticket price");
  assert.strictEqual(roundAccount.entryCount, joinTickets, "entry count mismatch");

  const entryAccount = await program.account.entry.fetch(entryPda);
  assert.strictEqual(entryAccount.claimed, false, "entry should start unclaimed");
  assert.strictEqual(entryAccount.lamportsPaid.toString(), ticketPriceLamports.toString(), "entry lamports mismatch");

  return { roundId, roundPda, treasuryPda, entryPda, roundAccount };
};

const testAdminCloseRefund = async () => {
  const roundId = new BN(2);
  const { roundPda, treasuryPda } = await initializeRound(roundId, 0);
  const entryPda = await joinRound(roundPda, treasuryPda, authority);

  await program.methods
    .adminClose(1)
    .accounts({ authority, round: roundPda })
    .rpc();

  const [treasuryVaultPda] = findTreasuryVaultPda();

  await program.methods
    .claimRefund()
    .accounts({
      entrant: authority,
      round: roundPda,
      treasury: treasuryPda,
      treasuryVault: treasuryVaultPda,
      entry: entryPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const entryAccount = await program.account.entry.fetch(entryPda);
  assert.strictEqual(entryAccount.claimed, true, "refund did not mark entry claimed");
};

const testSettleAndPayout = async () => {
  const roundId = new BN(3);
  const { roundPda, treasuryPda } = await initializeRound(roundId, 0);
  const entryPda = await joinRound(roundPda, treasuryPda, authority);

  const roundAccount = await program.account.round.fetch(roundPda);
  await waitForSlot(roundAccount.endSlot.toNumber());

  await program.methods
    .settleRound()
    .accounts({
      authority,
      round: roundPda,
      treasury: treasuryPda,
      winningEntry: entryPda,
    })
    .rpc();

  const preBalance = await provider.connection.getBalance(authority);
  const [treasuryVaultPda] = findTreasuryVaultPda();

  await program.methods
    .claimPayout()
    .accounts({
      winner: authority,
      round: roundPda,
      treasury: treasuryPda,
      treasuryVault: treasuryVaultPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const postBalance = await provider.connection.getBalance(authority);
  assert.ok(postBalance > preBalance, "winner balance did not increase");

  const settledRound = await program.account.round.fetch(roundPda);
  assert.ok(Boolean(settledRound.status.closedOut), "round did not close out");
  assert.strictEqual(settledRound.winner.toString(), authority.toString(), "winner not recorded");
};

const main = async () => {
  console.log("Running lotto program tests...");
  await testInitializeAndJoin();
  console.log("✔ initialize + join");
  await testAdminCloseRefund();
  console.log("✔ admin close + refund");
  await testSettleAndPayout();
  console.log("✔ settle + payout");
  console.log("All tests passed");
};

main().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
