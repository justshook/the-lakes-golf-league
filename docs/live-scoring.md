# Live weekly scoring

Players open their round from My Week or Results, start the round, and save gross scores one hole at a time. Each hole shows its par, stroke index, handicap strokes, and net score. A saved draft resumes after reload. Unsaved edits are retained in the same browser tab for recovery; they do not reach the leaderboard until a save succeeds.

Completing all nine holes opens the full scorecard for review. Players may edit any hole before choosing **Submit score & lock card**. Submission atomically creates the official weekly score and locks the card. Retrying submission is safe. Scrambles use one shared team card, one frozen team handicap, and one official score per team member; they do not create individual birdie/eagle records.

Results defaults to the Monday–Sunday league week in America/Chicago. If that week has no published round, it shows the next published round, or the latest completed week when there is no upcoming round. Players can choose any published/historical week. Personal history is at `/results/history`; existing `/results?year=...` links redirect there.

The leaderboard ranks net score **relative to par on completed holes**, with ties, gross/net totals, holes completed, and submission status. Players who have not started are unranked. It refreshes every 10 seconds while visible, on focus, and when connectivity returns. A refresh failure preserves the last good results with a stale-data warning. Team members appear with the same shared score, explicitly labeled Team.

## Course and permissions

Uses the existing verified Arlington Lakes front-nine configuration and the playing handicap frozen at tee-sheet publication. Positive strokes go to the hardest holes first; plus handicaps give strokes back on the easiest holes first. Course and handicap snapshots cannot change after a round starts. Back-nine/unsupported formats remain unavailable for new automated scoring, as before; historical scores remain readable.

`league_scorecards` is readable only by linked league accounts or commissioners. Direct browser writes are revoked. All mutations go through an authenticated, ownership-checked private function and invoker wrapper. Revision checks reject stale edits and stale review submissions. A round-row lock serializes publication, card creation, edits, legacy total submission, and final submission. Legacy total-only submission cannot bypass a started card. Official scores remain separate from drafts.

## Release

This feature branch is based on production `main`, independently of signup PR #94. Applied on November 1, 2026: `supabase/migrations/20261101205048_live_scorecards.sql` to the verified Lakes League project `lmmlmyxfadcyugmmvpwa` before the matching frontend release. The migration is additive apart from protecting the existing total-score submission function; it does not insert or modify historical results. No emails, payments, or player registrations are triggered.

Live verification confirmed row-level security, linked-player reads, no anonymous access, no direct authenticated writes, and an invoker public API. The security advisor reported no new findings. All 402 historical score rows retained fingerprint `09c13187cc043894589923571dd81e96`. The migration filename matches the applied Supabase migration version. No live rounds or scores were fabricated for testing.

## Verification

- 88 unit/regression tests pass, including frozen stroke allocation, plus handicaps, incomplete rounds, tied rankings, and Chicago week boundaries.
- 85 disposable PostgreSQL permission/transaction checks pass, including the prior auth/ledger suite, anonymous/direct-write denial, ownership, immutable snapshots, input validation, incomplete-card rejection, conflicting revisions, individual/team submission, and retry/lock behavior.
- Browser checks cover start, save, resume, review/edit, team submission, locked cards after reload, history links, and 320/390/1280px layouts.
- A separate real-client/mocked-transport browser test covers failed saves, local draft recovery, stale revisions after refresh, automatic updates on a second page, and stale-data/recovery messages.
- Production build passes with the existing shared-bundle size advisory.

Run `npm test` and `npm run build`. Run the database check with `PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node scripts/verify-live-scoring.mjs`. For browser checks, set `PLAYWRIGHT_MODULE` to an external Playwright installation and optionally `CHROMIUM_BIN` to a Chrome executable. Start the fictional demo at port 5192 for `scripts/check-live-scoring.cjs`; `scripts/check-live-scoring-network.cjs` starts its own mock-connected server at port 5193. These checks do not write live league scores.
