# Player money tracking

This release records accounting entries; it never initiates a charge, bank transfer,
refund, or payout. The commissioner confirms external transactions and records a
receipt/confirmation reference. Actual payment processing remains a later integration.

Apply the account/permissions migration before the generated `player_ledger`
migration, initially against a staging clone. Both migrations have been executed
against a disposable representative Postgres schema; the live project still needs
its own schema review and access tests before activation.

## Access and transaction rules

- Only verified commissioners can call `record_league_ledger_entry`.
- Players read only their entries; commissioners read all. Anonymous reads and all
  direct browser inserts, updates, or deletes are denied.
- Entries use integer cents and a stable ID/idempotency key. Repeated identical
  requests return the same record; changed payloads or reused receipt references fail.
- The server serializes changes for a player, validates refund ownership/limits,
  and prevents payouts above recorded awards, including pending commitments.
- Confirmed transfers require a unique receipt reference. A single batch reference
  is not a substitute for the individual recipient transaction reference.
- Refunds reverse received payments. They do not cancel the original fee, and
  winnings never automatically offset fees. Charge/award corrections require a
  reviewed follow-up workflow; this initial UI has no destructive editing.

## Historical records

Existing `player_money` rows mean prizes awarded. They are not proof that money was
paid. `ledgerTrackingComplete` stays false in production until historical records
have been reconciled. Personal money pages show original awards and new ledger
awards separately while coverage is incomplete, preventing duplicate totals.

Do not enable complete coverage simply because the ledger table exists. First
reconcile charges, awards, received payments, refunds, and prize payouts for each
player and the chosen accounting period. Add a server-owned, per-player coverage
record before enabling complete balances in production. The current demo is the
only fully reconciled fixture.

Ledger totals span recorded history. They are deliberately not labeled as a specific
season because this first migration does not yet attach an accounting season to
entries. Period/season filtering must be added before displaying season-specific
balances or combining multiple leagues.

## Checks

Run `node --test tests/ledger.test.mjs` for domain validation and duplicate/retry
coverage. `scripts/verify-auth-migration.mjs` also applies the migration in disposable
Postgres and checks actual permissions, idempotency, receipt reuse, and payout/refund
limits. It never connects to the live league.
