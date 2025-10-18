use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("DfJJWgdxk5qw8ujuyZQ6FmNVz8Xi6cZStXhbsGrK2LQj");

const ROUND_SEED: &[u8] = b"round";
const ENTRY_SEED: &[u8] = b"entry";
const TREASURY_SEED: &[u8] = b"treasury";
const TREASURY_VAULT_SEED: &[u8] = b"treasury_vault";
const BASIS_POINTS_DIVISOR: u64 = 10_000;
const MAX_BPS: u16 = 10_000;

#[program]
pub mod lotto {
    use super::*;

    pub fn initialize_round(ctx: Context<InitializeRound>, args: InitializeRoundArgs) -> Result<()> {
        require!(args.ticket_price_lamports > 0, LottoError::InvalidTicketPrice);
        require!(args.retained_bps <= MAX_BPS, LottoError::InvalidRetainedBps);

        let authority_key = ctx.accounts.authority.key();
        let clock = Clock::get()?;

        let round = &mut ctx.accounts.round;
        round.authority = authority_key;
        round.round_id = args.round_id;
        round.round_seed = args.round_id.to_le_bytes();
        round.ticket_price_lamports = args.ticket_price_lamports;
        round.max_entries = args.max_entries;
        round.start_slot = clock.slot;
        round.end_slot = clock
            .slot
            .checked_add(args.duration_slots)
            .ok_or(LottoError::MathOverflow)?;
        round.pot_lamports = 0;
        round.treasury_cut_lamports = 0;
        round.winner = None;
        round.status = RoundStatus::Open;
        round.entry_count = 0;
        round.bump = ctx.bumps.round;

        let treasury = &mut ctx.accounts.treasury;
        let treasury_bump = ctx.bumps.treasury;
        let vault_bump = ctx.bumps.treasury_vault;

        if treasury.authority == Pubkey::default() {
            treasury.authority = authority_key;
            treasury.retained_bps = args.retained_bps;
            treasury.vault_bump = vault_bump;
            treasury.last_withdraw_slot = 0;
            treasury.bump = treasury_bump;
        } else {
            require!(treasury.authority == authority_key, LottoError::InvalidAuthority);
            require!(treasury.retained_bps == args.retained_bps, LottoError::RetainedBpsMismatch);
            require!(treasury.bump == treasury_bump, LottoError::InvalidTreasuryBump);
            require!(treasury.vault_bump == vault_bump, LottoError::InvalidTreasuryVault);
        }

        let expected_vault = Pubkey::create_program_address(
            &[TREASURY_VAULT_SEED, authority_key.as_ref(), &[vault_bump]],
            ctx.program_id,
        )
        .map_err(|_| LottoError::InvalidTreasuryVault)?;
        require!(
            ctx.accounts.treasury_vault.key() == expected_vault,
            LottoError::InvalidTreasuryVault
        );

        emit!(RoundInitialized {
            round: round.key(),
            authority: authority_key,
            round_id: args.round_id,
            ticket_price_lamports: args.ticket_price_lamports,
            max_entries: args.max_entries,
            duration_slots: args.duration_slots,
        });

        Ok(())
    }

    pub fn join_round(ctx: Context<JoinRound>, args: JoinRoundArgs) -> Result<()> {
        require!(args.tickets > 0, LottoError::InvalidTicketCount);

        let round = &mut ctx.accounts.round;
        require!(round.status == RoundStatus::Open, LottoError::RoundNotOpen);
        require!(ctx.accounts.treasury.authority == round.authority, LottoError::InvalidAuthority);

        let clock = Clock::get()?;
        require!(clock.slot >= round.start_slot, LottoError::RoundNotOpen);
        require!(clock.slot <= round.end_slot, LottoError::RoundClosed);

        let tickets_u32 = u32::from(args.tickets);
        let new_count = round
            .entry_count
            .checked_add(tickets_u32)
            .ok_or(LottoError::MathOverflow)?;
        if round.max_entries != 0 {
            require!(new_count <= round.max_entries, LottoError::MaxEntriesReached);
        }
        round.entry_count = new_count;

        let cost = round
            .ticket_price_lamports
            .checked_mul(u64::from(args.tickets))
            .ok_or(LottoError::MathOverflow)?;

        let transfer_accounts = Transfer {
            from: ctx.accounts.entrant.to_account_info(),
            to: ctx.accounts.treasury_vault.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.system_program.to_account_info(), transfer_accounts);
        transfer(cpi_ctx, cost)?;

        round.pot_lamports = round
            .pot_lamports
            .checked_add(cost)
            .ok_or(LottoError::MathOverflow)?;

        let entry = &mut ctx.accounts.entry;
        entry.round = round.key();
        entry.entrant = ctx.accounts.entrant.key();
        entry.tickets = args.tickets;
        entry.lamports_paid = cost;
        entry.claimed = false;
        entry.created_slot = clock.slot;
        entry.bump = ctx.bumps.entry;
        entry.nonce = args.nonce;

        emit!(RoundJoined {
            round: round.key(),
            entrant: entry.entrant,
            tickets: args.tickets,
            lamports_paid: cost,
        });

        Ok(())
    }

    pub fn settle_round(ctx: Context<SettleRound>) -> Result<()> {
        let round = &mut ctx.accounts.round;
        require!(round.status == RoundStatus::Open || round.status == RoundStatus::Closed, LottoError::RoundNotReadyToSettle);
        require!(round.winner.is_none(), LottoError::RoundAlreadySettled);

        let clock = Clock::get()?;
        require!(clock.slot >= round.end_slot, LottoError::RoundStillRunning);
        require!(round.pot_lamports > 0, LottoError::EmptyPot);

        let winning_entry = &ctx.accounts.winning_entry;
        require!(winning_entry.round == round.key(), LottoError::EntryRoundMismatch);

        round.status = RoundStatus::Settled;
        round.winner = Some(winning_entry.entrant);

        let treasury_cut = round
            .pot_lamports
            .checked_mul(ctx.accounts.treasury.retained_bps as u64)
            .ok_or(LottoError::MathOverflow)?
            / BASIS_POINTS_DIVISOR;
        round.treasury_cut_lamports = treasury_cut;

        emit!(RoundSettled {
            round: round.key(),
            winner: winning_entry.entrant,
            pot_lamports: round.pot_lamports,
            treasury_cut_lamports: treasury_cut,
        });

        Ok(())
    }

    pub fn claim_payout(ctx: Context<ClaimPayout>) -> Result<()> {
        let round = &mut ctx.accounts.round;
        require!(round.status == RoundStatus::Settled, LottoError::RoundNotSettled);

        let winner_key = round.winner.ok_or(LottoError::WinnerNotSet)?;
        require!(winner_key == ctx.accounts.winner.key(), LottoError::InvalidWinner);

        let payout = round
            .pot_lamports
            .checked_sub(round.treasury_cut_lamports)
            .ok_or(LottoError::MathOverflow)?;
        require!(payout > 0, LottoError::EmptyPot);

        let bump_seed = [ctx.accounts.treasury.vault_bump];
        let signer_seeds: [&[u8]; 3] = [TREASURY_VAULT_SEED, round.authority.as_ref(), &bump_seed];
        transfer_signed(
            &ctx.accounts.treasury_vault.to_account_info(),
            &ctx.accounts.winner.to_account_info(),
            payout,
            &signer_seeds,
            &ctx.accounts.system_program,
        )?;

        round.pot_lamports = round.treasury_cut_lamports;
        round.status = RoundStatus::ClosedOut;

        emit!(PayoutClaimed {
            round: round.key(),
            winner: winner_key,
            amount: payout,
        });

        Ok(())
    }

    pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
        let round = &mut ctx.accounts.round;
        require!(round.status == RoundStatus::Cancelled, LottoError::RefundUnavailable);
        require!(ctx.accounts.treasury.authority == round.authority, LottoError::InvalidAuthority);

        let entry = &mut ctx.accounts.entry;
        require!(!entry.claimed, LottoError::EntryAlreadyClaimed);
        require!(entry.round == round.key(), LottoError::EntryRoundMismatch);
        require!(entry.entrant == ctx.accounts.entrant.key(), LottoError::InvalidEntrant);

        round.pot_lamports = round
            .pot_lamports
            .checked_sub(entry.lamports_paid)
            .ok_or(LottoError::MathOverflow)?;

        entry.claimed = true;

        let bump_seed = [ctx.accounts.treasury.vault_bump];
        let signer_seeds: [&[u8]; 3] = [TREASURY_VAULT_SEED, round.authority.as_ref(), &bump_seed];
        transfer_signed(
            &ctx.accounts.treasury_vault.to_account_info(),
            &ctx.accounts.entrant.to_account_info(),
            entry.lamports_paid,
            &signer_seeds,
            &ctx.accounts.system_program,
        )?;

        emit!(RefundClaimed {
            round: round.key(),
            entrant: entry.entrant,
            amount: entry.lamports_paid,
        });

        Ok(())
    }

    pub fn admin_close(ctx: Context<AdminClose>, reason: u8) -> Result<()> {
        let round = &mut ctx.accounts.round;
        require!(round.authority == ctx.accounts.authority.key(), LottoError::InvalidAuthority);
        require!(round.status != RoundStatus::Settled && round.status != RoundStatus::ClosedOut, LottoError::RoundNotCancellable);

        round.status = RoundStatus::Cancelled;

        emit!(RoundClosed {
            round: round.key(),
            authority: ctx.accounts.authority.key(),
            reason,
        });

        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum RoundStatus {
    Pending,
    Open,
    Closed,
    Settled,
    ClosedOut,
    Cancelled,
}

impl Default for RoundStatus {
    fn default() -> Self {
        RoundStatus::Pending
    }
}

#[account]
pub struct Round {
    pub authority: Pubkey,
    pub round_id: u64,
    pub round_seed: [u8; 8],
    pub ticket_price_lamports: u64,
    pub max_entries: u32,
    pub start_slot: u64,
    pub end_slot: u64,
    pub pot_lamports: u64,
    pub treasury_cut_lamports: u64,
    pub winner: Option<Pubkey>,
    pub status: RoundStatus,
    pub entry_count: u32,
    pub bump: u8,
}

impl Round {
    pub const INIT_SPACE: usize = 32 + 8 + 8 + 8 + 4 + 8 + 8 + 8 + 8 + 1 + 32 + 1 + 4 + 1;
}

#[account]
pub struct Entry {
    pub round: Pubkey,
    pub entrant: Pubkey,
    pub tickets: u16,
    pub lamports_paid: u64,
    pub claimed: bool,
    pub created_slot: u64,
    pub bump: u8,
    pub nonce: u8,
}

impl Entry {
    pub const INIT_SPACE: usize = 32 + 32 + 2 + 8 + 1 + 8 + 1 + 1;
}

#[account]
pub struct Treasury {
    pub authority: Pubkey,
    pub retained_bps: u16,
    pub vault_bump: u8,
    pub bump: u8,
    pub last_withdraw_slot: u64,
}

impl Treasury {
    pub const INIT_SPACE: usize = 32 + 2 + 1 + 1 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeRoundArgs {
    pub round_id: u64,
    pub ticket_price_lamports: u64,
    pub max_entries: u32,
    pub duration_slots: u64,
    pub retained_bps: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct JoinRoundArgs {
    pub tickets: u16,
    pub nonce: u8,
}

#[derive(Accounts)]
#[instruction(args: InitializeRoundArgs)]
pub struct InitializeRound<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + Round::INIT_SPACE,
        seeds = [ROUND_SEED, authority.key().as_ref(), &args.round_id.to_le_bytes()],
        bump
    )]
    pub round: Account<'info, Round>,
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + Treasury::INIT_SPACE,
        seeds = [TREASURY_SEED, authority.key().as_ref()],
        bump
    )]
    pub treasury: Account<'info, Treasury>,
    /// CHECK: Treasury vault PDA - program-owned account for holding escrowed SOL  
    #[account(
        init_if_needed,
        payer = authority,
        space = 1,
        seeds = [TREASURY_VAULT_SEED, authority.key().as_ref()],
        bump
    )]
    pub treasury_vault: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(args: JoinRoundArgs)]
pub struct JoinRound<'info> {
    #[account(mut)]
    pub entrant: Signer<'info>,
    #[account(
        mut,
        seeds = [ROUND_SEED, round.authority.as_ref(), &round.round_seed],
        bump = round.bump,
    )]
    pub round: Account<'info, Round>,
    #[account(
        mut,
        seeds = [TREASURY_SEED, round.authority.as_ref()],
        bump = treasury.bump,
        constraint = treasury.authority == round.authority @ LottoError::InvalidAuthority
    )]
    pub treasury: Account<'info, Treasury>,
    /// CHECK: Treasury vault PDA for holding escrowed lamports
    #[account(
        mut,
        seeds = [TREASURY_VAULT_SEED, round.authority.as_ref()],
        bump = treasury.vault_bump,
    )]
    pub treasury_vault: AccountInfo<'info>,
    #[account(
        init,
        payer = entrant,
        space = 8 + Entry::INIT_SPACE,
        seeds = [ENTRY_SEED, round.key().as_ref(), entrant.key().as_ref(), &[args.nonce]],
        bump
    )]
    pub entry: Account<'info, Entry>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleRound<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [ROUND_SEED, round.authority.as_ref(), &round.round_seed],
        bump = round.bump,
        has_one = authority @ LottoError::InvalidAuthority
    )]
    pub round: Account<'info, Round>,
    #[account(
        mut,
        seeds = [TREASURY_SEED, round.authority.as_ref()],
        bump = treasury.bump,
        has_one = authority @ LottoError::InvalidAuthority
    )]
    pub treasury: Account<'info, Treasury>,
    #[account(
        mut,
        has_one = round @ LottoError::EntryRoundMismatch
    )]
    pub winning_entry: Account<'info, Entry>,
}

#[derive(Accounts)]
pub struct ClaimPayout<'info> {
    #[account(mut)]
    pub winner: Signer<'info>,
    #[account(
        mut,
        seeds = [ROUND_SEED, round.authority.as_ref(), &round.round_seed],
        bump = round.bump,
    )]
    pub round: Account<'info, Round>,
    #[account(
        mut,
        seeds = [TREASURY_SEED, round.authority.as_ref()],
        bump = treasury.bump,
        constraint = treasury.authority == round.authority @ LottoError::InvalidAuthority
    )]
    pub treasury: Account<'info, Treasury>,
    /// CHECK: Treasury vault PDA for holding escrowed lamports
    #[account(
        mut,
        seeds = [TREASURY_VAULT_SEED, round.authority.as_ref()],
        bump = treasury.vault_bump,
    )]
    pub treasury_vault: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimRefund<'info> {
    #[account(mut)]
    pub entrant: Signer<'info>,
    #[account(
        mut,
        seeds = [ROUND_SEED, round.authority.as_ref(), &round.round_seed],
        bump = round.bump,
    )]
    pub round: Account<'info, Round>,
    #[account(
        mut,
        seeds = [TREASURY_SEED, round.authority.as_ref()],
        bump = treasury.bump,
        constraint = treasury.authority == round.authority @ LottoError::InvalidAuthority
    )]
    pub treasury: Account<'info, Treasury>,
    /// CHECK: Treasury vault PDA for holding escrowed lamports
    #[account(
        mut,
        seeds = [TREASURY_VAULT_SEED, round.authority.as_ref()],
        bump = treasury.vault_bump,
    )]
    pub treasury_vault: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [ENTRY_SEED, round.key().as_ref(), entrant.key().as_ref(), &[entry.nonce]],
        bump = entry.bump,
        has_one = round @ LottoError::EntryRoundMismatch,
        has_one = entrant @ LottoError::InvalidEntrant
    )]
    pub entry: Account<'info, Entry>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminClose<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [ROUND_SEED, round.authority.as_ref(), &round.round_seed],
        bump = round.bump,
        has_one = authority @ LottoError::InvalidAuthority
    )]
    pub round: Account<'info, Round>,
}

#[event]
pub struct RoundInitialized {
    pub round: Pubkey,
    pub authority: Pubkey,
    pub round_id: u64,
    pub ticket_price_lamports: u64,
    pub max_entries: u32,
    pub duration_slots: u64,
}

#[event]
pub struct RoundJoined {
    pub round: Pubkey,
    pub entrant: Pubkey,
    pub tickets: u16,
    pub lamports_paid: u64,
}

#[event]
pub struct RoundSettled {
    pub round: Pubkey,
    pub winner: Pubkey,
    pub pot_lamports: u64,
    pub treasury_cut_lamports: u64,
}

#[event]
pub struct PayoutClaimed {
    pub round: Pubkey,
    pub winner: Pubkey,
    pub amount: u64,
}

#[event]
pub struct RefundClaimed {
    pub round: Pubkey,
    pub entrant: Pubkey,
    pub amount: u64,
}

#[event]
pub struct RoundClosed {
    pub round: Pubkey,
    pub authority: Pubkey,
    pub reason: u8,
}

#[error_code]
pub enum LottoError {
    #[msg("Invalid ticket price")] 
    InvalidTicketPrice,
    #[msg("Invalid retained basis points")] 
    InvalidRetainedBps,
    #[msg("Missing PDA bump")] 
    MissingBump,
    #[msg("Invalid authority for this operation")] 
    InvalidAuthority,
    #[msg("Stored treasury bump does not match")] 
    InvalidTreasuryBump,
    #[msg("Invalid treasury vault")] 
    InvalidTreasuryVault,
    #[msg("Retained basis points mismatch")] 
    RetainedBpsMismatch,
    #[msg("Round is not open")] 
    RoundNotOpen,
    #[msg("Round entry window closed")] 
    RoundClosed,
    #[msg("Too many entries for this round")] 
    MaxEntriesReached,
    #[msg("Arithmetic overflow")] 
    MathOverflow,
    #[msg("Round not ready to settle")] 
    RoundNotReadyToSettle,
    #[msg("Round already settled")] 
    RoundAlreadySettled,
    #[msg("Round is still running")] 
    RoundStillRunning,
    #[msg("Round is not settled")]
    RoundNotSettled,
    #[msg("Pot is empty")] 
    EmptyPot,
    #[msg("Entry does not belong to round")] 
    EntryRoundMismatch,
    #[msg("Winner not set")]
    WinnerNotSet,
    #[msg("Invalid winner signer")] 
    InvalidWinner,
    #[msg("Invalid entrant signer")] 
    InvalidEntrant,
    #[msg("Entry already claimed")] 
    EntryAlreadyClaimed,
    #[msg("Refund not available")] 
    RefundUnavailable,
    #[msg("Round cannot be cancelled")] 
    RoundNotCancellable,
    #[msg("Invalid ticket count")] 
    InvalidTicketCount,
}

fn transfer_signed<'info>(
    from: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    amount: u64,
    _signer_seeds: &[&[u8]],
    _system_program: &Program<'info, System>,
) -> Result<()> {
    // For program-owned PDAs, manually adjust lamports
    **from.try_borrow_mut_lamports()? = from
        .lamports()
        .checked_sub(amount)
        .ok_or(ProgramError::InsufficientFunds)?;
    **to.try_borrow_mut_lamports()? = to
        .lamports()
        .checked_add(amount)
        .ok_or(ProgramError::InvalidArgument)?;
    Ok(())
}
