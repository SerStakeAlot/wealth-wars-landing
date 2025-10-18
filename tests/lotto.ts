// @ts-nocheck
const anchor = require("@coral-xyz/anchor");
const { expect } = require("chai");

const { PublicKey, SystemProgram } = anchor.web3;

anchor.setProvider(anchor.AnchorProvider.env());

const program = anchor.workspace.Lotto as anchor.Program<any>;
const provider = anchor.getProvider() as anchor.AnchorProvider;
const authority = provider.wallet.publicKey;

const ROUND_SEED = Buffer.from("round");
const ENTRY_SEED = Buffer.from("entry");
const TREASURY_SEED = Buffer.from("treasury");

const toU64LE = (value: anchor.BN) => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(value.toString()));
  return buf;
};

const findRoundPda = (roundId: anchor.BN) =>
  PublicKey.findProgramAddressSync(
    [ROUND_SEED, authority.toBuffer(), toU64LE(roundId)],
    program.programId,
  );

const findTreasuryPda = () =>
  PublicKey.findProgramAddressSync(
    [TREASURY_SEED, authority.toBuffer()],
    program.programId,
  );

type PublicKeyType = anchor.web3.PublicKey;

const findEntryPda = (round: PublicKeyType, entrant: PublicKeyType, nonce: number) =>
  PublicKey.findProgramAddressSync(
    [ENTRY_SEED, round.toBuffer(), entrant.toBuffer(), Buffer.from([nonce])],
    program.programId,
  );

const retainedBps = 500;
const ticketPriceLamports = new anchor.BN(1_000_000);
const durationSlots = new anchor.BN(0);

describe("lotto program", () => {
  it("initializes a round and accepts entries", async () => {
    const roundId = new anchor.BN(1);
    const [roundPda] = findRoundPda(roundId);
    const [treasuryPda] = findTreasuryPda();
    const nonce = 0;
    const [entryPda] = findEntryPda(roundPda, authority, nonce);

    await program.methods
      .initializeRound({
        roundId,
        ticketPriceLamports,
        maxEntries: 10,
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

    await program.methods
      .joinRound({ tickets: 1, nonce })
      .accounts({
        entrant: authority,
        round: roundPda,
        treasury: treasuryPda,
        entry: entryPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const roundAccount = await program.account.round.fetch(roundPda);
    expect(roundAccount.potLamports.toString()).to.equal(ticketPriceLamports.toString());
    expect(roundAccount.entryCount).to.equal(1);

    const entryAccount = await program.account.entry.fetch(entryPda);
    expect(entryAccount.lamportsPaid.toString()).to.equal(ticketPriceLamports.toString());
    expect(entryAccount.claimed).to.be.false;
  });

  it("allows admin close and refunds entrants", async () => {
    const roundId = new anchor.BN(2);
    const [roundPda] = findRoundPda(roundId);
    const [treasuryPda] = findTreasuryPda();
    const nonce = 0;
    const [entryPda] = findEntryPda(roundPda, authority, nonce);

    await program.methods
      .initializeRound({
        roundId,
        ticketPriceLamports,
        maxEntries: 0,
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

    await program.methods
      .joinRound({ tickets: 1, nonce })
      .accounts({
        entrant: authority,
        round: roundPda,
        treasury: treasuryPda,
        entry: entryPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .adminClose(1)
      .accounts({
        authority,
        round: roundPda,
      })
      .rpc();

    await program.methods
      .claimRefund()
      .accounts({
        entrant: authority,
        round: roundPda,
        treasury: treasuryPda,
        entry: entryPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const entryAccount = await program.account.entry.fetch(entryPda);
    expect(entryAccount.claimed).to.be.true;
  });

  it("settles a round and pays the winner", async () => {
    const roundId = new anchor.BN(3);
    const [roundPda] = findRoundPda(roundId);
    const [treasuryPda] = findTreasuryPda();
    const nonce = 0;
    const [entryPda] = findEntryPda(roundPda, authority, nonce);

    await program.methods
      .initializeRound({
        roundId,
        ticketPriceLamports,
        maxEntries: 0,
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

    await program.methods
      .joinRound({ tickets: 1, nonce })
      .accounts({
        entrant: authority,
        round: roundPda,
        treasury: treasuryPda,
        entry: entryPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const preBalance = await provider.connection.getBalance(authority);

    await program.methods
      .settleRound()
      .accounts({
        authority,
        round: roundPda,
        treasury: treasuryPda,
        winningEntry: entryPda,
      })
      .rpc();

    await program.methods
      .claimPayout()
      .accounts({
        winner: authority,
        round: roundPda,
        treasury: treasuryPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const postBalance = await provider.connection.getBalance(authority);
    expect(postBalance).to.be.greaterThan(preBalance);

    const roundAccount = await program.account.round.fetch(roundPda);
    expect(roundAccount.status.closedOut).to.be.true;
    expect(roundAccount.winner?.toString()).to.equal(authority.toString());
  });
});
