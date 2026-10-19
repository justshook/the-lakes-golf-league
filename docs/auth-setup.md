# Player accounts and mobile league deployment

This branch is a source-ready beta. Its SQL has been exercised against a disposable representative legacy schema; it has **not** been applied to the live Lakes League project. The connected Supabase projects during development did not include Lakes League. No Shooktoberfest or Delta database was changed.

## Deployment order

1. Identify the Supabase project used by the existing Lakes League deployment. Confirm its project reference with the owner before linking a CLI or applying SQL. Back up the database and export its schema, current RLS policies, grants, functions, views, and constraints.
2. Clone the actual database to staging. The migration assumes the observed legacy table names, numeric player IDs, integer `player_scores.week_id`, and integer-array `birdie_holes` / `eagle_holes`. It deliberately fails when those preconditions are missing. Compare every assumed column type and constraint with the export. The representative test fixture is not the authoritative database schema.
3. Audit existing public views and security-definer functions for ways to read contact information or write protected league records. The migration replaces policies on the named legacy tables; it cannot establish that unrelated existing functions or views are safe without the schema export. Keep `league_private` out of exposed Data API schemas.
4. Review and apply the CLI-created auth migration followed by subsequent ledger migrations to staging. These replace legacy policies and remove anonymous mutations. Deploy the matching app version in the same cutover; the old shared-password and phone-digit writes are intentionally no longer allowed. Do not deploy this app alone against permissive old database policies.
5. Configure Supabase Email Auth, verified-email confirmation, production SMTP, the Site URL, and exact redirect allowlist entries for `https://lakesleague.com/my-week` and the staging preview's `/my-week`. The SPA uses the Supabase browser implicit email-link flow; its client handles the returned fragment. Configure hosting to serve the SPA for `/my-week` and other deep links.
6. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (publishable or legacy anon key) in the appropriate environment. Never put service-role keys into Vite variables. Set `VITE_DEMO_MODE=false` or omit it on live and staging deployments. Demo mode is opt-in, disconnects the client from Supabase, and uses fictional fixture players only.
7. Check roster emails. Exactly one case-insensitive, trimmed roster email must match the confirmed Supabase email to claim an unlinked player. Duplicate/missing emails leave the user signed in but unlinked; they never choose another player's identity. Account-to-player linking is private and unique. To reassign a link, use a reviewed server-side administrative operation after verifying both people; there is no browser override.
8. Create/invite the commissioner through Supabase Auth and set `app_metadata.league_role` to `admin` through a trusted admin interface. Never set this in user metadata or browser code. The database reads fresh `auth.users.raw_app_meta_data` for privilege checks, so removing the flag immediately removes database authority. `claim_league_player` returns a current `is_admin` UI hint; it is not itself authorization.
9. Import old round dates with their existing numeric week IDs only after reconciling them against the real season. No historical dates or cutoff times are guessed by this migration. New rounds are created with `create_league_round` and IDs formatted `YYYYMMDD`, preventing reuse of last season's 1–21 IDs. This first version supports one round per date.
10. Test with a commissioner, two different players, an unlinked account, an unverified account, and a signed-out browser. Confirm that player A cannot read player B's contacts, attendance, private ledger or preferences; cannot change another player's scores; and cannot assign themself admin privileges. Test expired attendance cutoff, withdrawal after publication, malformed/incomplete teams, cancelled/finalized rounds, repeat score submission, and revocation of admin metadata.
11. Run the current Supabase security advisors and review findings against the actual project. Release only after staging email-link login, RLS, real legacy constraints, and mobile browser flows pass. Keep the prior deployment and database backup available; do not undo permissions just to restore unsafe legacy browser mutations.

## API contract

| API | Contract |
|---|---|
| `league_public_players` | Read-only sanitized roster: numeric `id`, `name`, `handicap`, `availability`, `type`, blank `cdga_id`. No email, phone, auth ID or CDGA identifier. |
| `claim_league_player()` | Links the currently verified identity to its unique roster email, or returns an unlinked profile. Returns `player_id`, `name`, own `email`, `availability`, `is_admin`. |
| `league_rounds` | `week_id` numeric string, `date`, `attendance_deadline` absolute timestamp, `status`, `published_at`, `score_submission_enabled`, `tee_sheet`, `rule_snapshot`. Public read; mutation only through guarded RPCs. |
| `league_attendance` | Self/admin read. `week_id`, `player_id`, `user_id`, `status` (`in`/`out`), `updated_at`. Only attendance RPC may perform player writes. |
| `set_league_attendance(p_week_id,p_status)` | Uses server identity and clock. Requires configured draft/published round and strictly before deadline. Withdrawal marks attendance; commissioner republishes the affected schedule. |
| `set_league_availability(p_availability)` | Updates self-owned preferences using recognized league tee times. An empty list means no available times, not unrestricted availability. Takes effect for future schedule generation. |
| `create_league_round(p_date,p_attendance_deadline,p_rule_snapshot)` | Admin-only; creates a future draft, one per date. No historical import through this endpoint. |
| `publish_league_round(p_week_id,p_tee_sheet,p_participants,p_rule_snapshot)` | Admin-only atomic publication. Blocks scored/finalized/cancelled rounds, duplicates, absent players, unavailable tee times, missing or incomplete teams and unsupported formats. |
| `submit_league_score(p_week_id,p_gross_score,p_birdie_holes,p_eagle_holes)` | Auth-linked participant only. Uses frozen team/handicap, validates round/date/withdrawals, calculates net on server and records all eligible team members atomically. Does not accept client identity, net score or handicap. Existing scores require an admin correction. |
| `cancel_league_round(p_week_id)` | Admin-only; cannot cancel a scored/finalized round. Sets cancelled and closes scoring. |

`p_tee_sheet` is an array of `{time, players:[numericPlayerId]}` objects (objects with `id` are accepted too). `p_participants` is an array of `{player_id, team_id, handicap_used, tee_time}` with one row per player; individual `team_id` is null. Frozen team members must share the same time and handicap. `p_rule_snapshot` currently supports `scoringMode: individual|scramble`, `teamType: null|2-person|4-person`, `nineHoles: front`, with game name/description and supported handicap settings retained for display.

## Intentional limits of this first migration

- Automated live publication/scoring supports front-nine individual rounds and two-/four-person scrambles. It rejects back-nine and other team formats until course rating data and their scoring rules are verified. Historical legacy results remain viewable.
- No historical team identities are reconstructed by guessing player order. New rounds store explicit participant/team snapshots.
- The database trusts a verified commissioner to approve frozen handicap values. Player score submission cannot change them. A future course/rating schema can move all handicap calculation into the database.
- Self-service scoring does not automatically recalculate season prizes or giant skins, and does not implement independent second-player score confirmation. Those require another reviewed result-finalization workflow. Team cards cannot generate individual birdie/eagle records.
- Finalized historical rounds are protected, but this beta does not expose a full finalization/reopen/correction workflow. Do not invent a `finalized` status from provisional scores.
- Payment integrations, bank transfers, reminder delivery and automated publication jobs are not enabled by this migration.
- The private public-roster function intentionally returns public, noncontact league fields without login. All private data operations verify `auth.uid()`. Private security-definer functions have empty search paths and restricted execute grants; public RPC wrappers run with caller privileges.

## Local verification

JavaScript checks:

```sh
node --test tests/player-service.test.js
```

Disposable PostgreSQL security and transaction checks, without any live credentials:

```sh
npm install --prefix /tmp/lakes-db-test --no-save --no-audit --no-fund @electric-sql/pglite@0.3.14
PGLITE_MODULE=/tmp/lakes-db-test/node_modules/@electric-sql/pglite/dist/index.js node scripts/verify-auth-migration.mjs
```

These exercise actual SQL and role permissions on a representative schema, including public contact isolation, verified linking, duplicate email rejection, player ownership, database cutoffs, publication checks, frozen scoring and duplicate submission. They complement—but do not replace—the staging tests against the actual Supabase Auth, PostgREST, emails, schema and production permissions.
