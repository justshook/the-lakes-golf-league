# Personal player profiles and historical seasons

`/profile` uses the authenticated account's verified player link. It never chooses
a player from a browser-supplied ID or creates a duplicate roster record. The page
shows the current recorded **18-hole handicap index**, recorded individual/team
round counts, historical award totals, and cards for each year with source records.
The current index is not a recalculation of earlier round handicaps or an assertion
that an external handicap service has been synced today.

`/results?year=2026` displays scores whose matching league round has a 2026 date.
Gross/net/handicap-used values remain the stored snapshots. Team rounds never enter
individual averages. `year=undated` retains scores without a matched valid date;
`year=all` or no query shows everything linked to that authenticated player.

`/money?year=2026` filters original prize allocations using their round dates.
Payments, refunds, recorded payout activity, and reconciled account balances remain
all-year accounting. Ledger timestamps are **not** used to invent a golf season: an
October payment might settle an earlier year's prize. No legacy awards and new
ledger awards are silently added together.

Only available years appear as profile cards. A direct request for an absent year
shows an explicit empty state; it does not fall back to another year or fabricate
records. Missing dates appear under **Undated records** rather than disappearing.

## Source-data limits

The repository maps the original numbered rounds to the archived 2026 schedule.
New rounds have their stored dates. It contains no verified 2025 score/winnings
dataset. Since this work is being prepared in October 2026, a literal request for
"last year" would mean 2025; the app must not relabel 2026 as 2025.

This implementation is ready to show every available player record once the live
database is connected and account-linking migrations are activated. No live
historical records were imported during this change. A 2025 or other missing season
requires the actual exported scores, awards, round dates, and stable player mapping.
Review duplicate player identities before any import. Keep original player IDs and
score snapshots whenever possible; reconcile unmatched records explicitly.

The ledger unit suite includes year filtering, missing dates, missing years, stored
handicap preservation, and account-scoped history checks. The profile page itself
is protected by the same account gate as My Week, Results, and Money.

## Complete history reads

The mounted league loader retrieves every table in ordered pages, requesting an
exact row count. It advances by the number of rows actually returned, so a project
row cap smaller than the requested page size does not silently truncate history.
Score/money/ledger ID keys, legacy upsert keys, and new migration primary keys define
the stable ordering. A missing count, duplicate key, changed count, or failed later
page discards the refresh; incomplete records never replace the complete totals.
An account change cancels the old refresh before further pages can be published.

This is a read-only multi-request refresh, not a database snapshot transaction.
Detected concurrent changes ask the player to reload. The pagination tests cover
more than 1,000 score rows, smaller server caps, composite keys, late failures, and
account changes. Confirm these known legacy columns against the live schema during
activation, as with the other migration preflight checks.
