# Lakes League mobile migration

This branch replaces the shared-password league interface with a player portal and
commissioner workflow. It keeps the forest, cream, and gold identity and uses actual
shadcn/Radix components, a mobile bottom navigation bar, 44px controls, and lazy-loaded
routes. The old unsafe Home/Admin components are removed; historical records remain
available through read-only league pages.

## Implemented

- Email-link accounts linked to a uniquely matching verified roster email. Server-side
  commissioner roles and private contact records replace client passwords/phone checks.
- My Week: next published assignment, teammates, attendance, recorded winnings, and
  a separate pending-score card for previously played rounds.
- My Schedule: future absences and recurring tee-time availability. Cutoffs are enforced
  in the database. A withdrawal updates attendance; the commissioner reviews and republishes
  the affected tee sheet. There are no automatic notifications yet.
- Scheduling: hard availability and capacity constraints, rotation history, explicit
  teams independent of display order, completion-first repair, and a review/publish step.
  Unschedulable players and incomplete teams block publication instead of being silently moved.
- Commissioner: create dated rounds, inspect absences/missing scores, generate and publish,
  refresh current roster preferences, and cancel unscored rounds.
- Results: recorded gross/net scores, with team scores excluded from individual averages.
  Publication freezes team identity and handicap; score submission is transactional.
- Money: immutable charges, awards, received payments, payouts, and refunds with references,
  idempotency, and server-enforced accounting limits. Players see only their own ledger.
  Recording a payment does not initiate a transfer.
- Historical public roster, tee sheets, standings, skins, and 2026 championship archive.
  Reading data never seeds players or rewrites availability. Real roster contacts are removed
  from the client source. New dated round IDs cannot overwrite 2026 week IDs.

## Review and verification

- `npm test`: 63 passing authentication, history/pagination, scheduling, team identity, and ledger tests.
- Disposable Postgres: 89 actual permission and transaction checks across all three SQL migrations
  (55 account/ledger and 34 object-privilege checks), using the audited live column types and constraints.
  Includes ownership, duplicate emails, role checks, withdrawal/score locks, visible/frozen
  team matching, duplicate ledger events, receipt reuse, and refund/payout limits.
- Browser: 11 routes at 320px, 390px, and 1280px, with no page overflow or JavaScript errors.
- Browser workflows: absence/return, availability save, generate/publish, create round, and
  confirmed ledger entry. These use fictional demo data, not a live Supabase project.
- Production build passes. Route splitting reduces initial payload; the shared bundle still
  includes the Supabase SDK and generates a Vite size advisory (~160KB gzip).
- Separate independent source review completed; identified issues were fixed before this PR.

The browser review discovered a case where 12 flexible players were spread into incomplete
teams. The scheduler now prioritizes complete teams before social preferences, and regressions
cover both two- and four-person games without relaxing availability.

### Screenshots

Fictional sample players only. Full-page screenshots include the fixed mobile navigation.

[My Week on mobile](review/screenshots/my-week-mobile.png) ·
[My Schedule](review/screenshots/schedule-mobile.png) ·
[My Money](review/screenshots/money-mobile.png) ·
[Commissioner](review/screenshots/admin-mobile.png) ·
[Desktop](review/screenshots/my-week-desktop.png) ·
[Sign in on mobile](review/screenshots/sign-in-mobile.png) ·
[Player profile](review/screenshots/profile-mobile.png)

## Activation and next work

The Supabase connection now exposes the Lakes League project. The reviewed hardening
migrations are prepared, but two apply attempts failed with `Invalid or expired requestState`.
Follow-up reads confirmed no migration installed and unchanged historical data. The
protections are not active. Detailed live audit metadata is excluded from this repository.
Vercel configuration access is still unavailable, and no production deployment, Auth
configuration, or real payment was performed. Keep this branch a draft until cutover
and live verification.
See [account setup](auth-setup.md), [object permissions](object-privileges.md),
[ledger setup](ledger-setup.md), and [Stripe security](stripe-security.md).

Current automated scoring supports the verified front-nine course settings for individual
stroke play and two-/four-person scramble. Back-nine settings and other game formats need
verified course/rule configuration. Legacy formats remain readable as recorded history.

Further delivery needed before operating the entire league solely in this app:

- A working migration write path, staging rehearsal/cutover, email delivery, and sign-in redirect verification.
- Automated payment collection/payout integration with provider confirmation/webhooks.
- Reconciled historical balances, season-owned ledger coverage, and accounting corrections.
- Commissioner roster/contact maintenance, score correction/finalization, prize allocation,
  and richer game templates; the old direct-write admin panel is intentionally not mounted.
- Substitute waitlist/assignment, targeted late-withdrawal repair UI, reminders, and automatic
  weekly scheduling jobs. The scheduling engine already supports locked groups and repair,
  but these operations are not all exposed as user controls yet.

## Reproduce

```sh
npm ci
npm test
npm run build
npm run dev:demo -- --host 127.0.0.1
```

`VITE_DEMO_MODE=true` is required for fictional demo mode; missing live configuration does
not silently show sample data. All demo changes reset when the page reloads.

For the database checks, use an external disposable dependency installation, as documented
at the top of `scripts/verify-auth-migration.mjs`. For browser checks, install Playwright
outside the project and set `PLAYWRIGHT_MODULE` to its module path; `CHROMIUM_BIN` optionally
selects an installed Chromium executable, then run `node scripts/check-mobile.cjs`.

## Account and history follow-up

- Added Google OAuth handoff (provider activation remains required), email/password
  login, verified first-time password setup, password reset and account password changes.
- Added an explicit callback for implicit tokens, PKCE codes and custom token-hash
  email templates. Legacy callback locations are intercepted before route redirects;
  errors show recovery actions and credentials are removed from the URL.
- Roster/database errors preserve the verified Auth user; password setup can complete
  while profile linking awaits database setup. No phone-derived passwords or bulk
  invitation emails were introduced.
- Added a personal profile with current recorded handicap and available-season score
  and award views. Undated records remain visible; missing years are not fabricated.
- Browser authentication checks use a mocked Supabase endpoint and synthetic player
  data. They cover new-user setup, password reset/login, one-use token handling under
  StrictMode, Google handoff, legacy redirects, refresh during setup, expired links,
  profile linking, and missing migration errors. They do not validate live delivery or OAuth.

The production bundle and connected project both identify Supabase project
`lmmlmyxfadcyugmmvpwa`. Activate the app, provider, redirects, commissioner role, and
reviewed database migrations together after staging verification.
See `auth-setup.md` and `player-history.md`.
