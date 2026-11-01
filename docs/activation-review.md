# Lakes League activation review — 2026-11-01

## Verified configuration and preservation

- Target: JustShook / Golf League App / `lmmlmyxfadcyugmmvpwa`. No Get Shook LLC Supabase project was used.
- The three SQL Editor migrations were inspected and marked applied using `supabase migration repair --status applied`; their SQL was not rerun. The two new Stripe migrations were then applied with a verified private backup and a dry run that listed only those two files.
- Counts and complete-row fingerprints remained unchanged for 52 players, 402 scores, and 140 prize records. All 13 public tables retain RLS. The security advisor reports zero errors; Free-plan leaked-password protection remains unavailable. Private server-only payment tables have RLS and intentionally no browser policies.
- Live anonymous REST checks return the sanitized 52-player roster without contacts and reject contact reads, checkout RPC access, and forged settlements. Authenticated browser roles cannot invoke server settlement functions or select private order tables.
- The existing verified commissioner identity retains trusted admin metadata. Real Google authorization linked that same identity to original player 22 and preserved the historical profile: 10 rounds, handicap index 8.0, and $177 recorded prize awards. Awards are not proof of payouts.
- Canonical Site URL and exact callback destinations are configured. Google client credentials exist only in the provider configuration; server payment credentials are hidden Vercel secrets, with preview secrets scoped to the reviewed branch. Production collection remains disabled and no live financial approval flag is enabled.

## Actual flow evidence

- Real Google cancellation returns an in-app cancellation message and sign-in link.
- Real Google login returns to the protected branch preview, links the verified original player, and exposes commissioner navigation only after the trusted account check.
- The actual mobile profile at 390px has document width 390px and retains the recorded player history.
- The real Stripe test catalog contains one `lakes-dues-2027` product and one $180 USD one-time price, with no recurring terms.
- Real Checkout initially failed because the account defaults to Managed Payments. The app now explicitly requests standard Checkout for this integration. Stripe cached the first rejected request; it does not permit changing its parameters under the same idempotency key. The API and player UI now return a bounded commissioner-review message for this condition instead of an endless retry suggestion.
- Reconciliation of that single test order, using its exact creation time, found zero matching Checkout sessions and zero PaymentIntents. The owner explicitly approved retiring only that unpaid test attempt; it is now failed. No automatic key rotation or ambiguous order release is performed.
- Actual hosted Stripe test Checkout passed cancellation and resumption of the same session, a synthetic declined card, and a successful $180 payment. The signed completion event settled the order as paid and populated its receipt.
- Actual test refunds of $50 followed by $130 both succeeded. Signed refund events reconciled the order to refunded $180. Player and commissioner views show both successful refunds, the test label, and a working Stripe-hosted receipt with adjusted total $0.
- Stripe Dashboard resent the actual completion event after the refunds. The preview returned HTTP 200 with duplicate=true, preserved the refunded state, and retained one event identity. Real league ledger entries remain zero. Concurrent settlement, failed refunds, asynchronous payment outcomes and disputes are covered by local tests; those specific provider scenarios were not exercised against Stripe.
- Gmail SMTP was configured using a separate owner-provided App Password stored only in Supabase. A fresh setup email was accepted and the owner confirmed actual delivery and completed password setup. A separate reset email was requested successfully; its delivered callback remains an owner verification item. No mailbox inspection or password entry was performed by the agent.

## Automated and deployed checks

- 84 automated tests and the production build pass. Disposable PostgreSQL checks cover 55 auth/ledger, 34 object privileges, and 53 payment checks. Provider mocks in these tests are not evidence of actual email delivery or Stripe processing.
- Twelve preview deep links, including callback, password, privacy, and money return/cancel routes, return the SPA.
- Preview payment APIs reject anonymous history access (401), unsigned webhooks (400), missing checkout authentication (401), wrong origins (403), and browser-supplied amounts (400).
- Sixty-seven fetched public JavaScript assets contain none of the known Supabase/Stripe server secrets and no generic server-key patterns.

## Release and remaining boundaries

PR #92 was merged as `ee61a5bd72a18240503cebe7a7c7a16725700df6` and Vercel production deployment `GF27PUG37nr4JAzCmuXnQAgwtZbs` is READY on `https://www.lakesleague.com`. Google is enabled, demo mode is off, production collection is disabled, and all live financial approval flags are off. The public privacy route is live and the Google basic-identity audience is published as In production. A fresh Google sign-in passed on the canonical domain and opened original player 22 with commissioner access and unchanged historical profile.

Sixteen production deep links return HTTP 200. Anonymous payment history and Checkout calls return 401; unsigned webhooks return 400. Thirty-five deployed public JavaScript assets were scanned with no detected server-secret patterns. The actual Stripe completion event was resent to the production webhook: HTTP 200, duplicate=true; refunded total stays $180 and the real ledger stays empty. The production profile renders the test refunds and working receipt, and explicitly states collection is disabled. Earlier 503 webhook attempts preceded the configured release; later retries are safe to acknowledge as duplicates.

These are actual provider and deployed checks. The original preview payment was in test mode; no live charge or production purchase is implied. This documentation-only follow-up records the released state without changing the tested application code.

Remaining owner/business actions:

1. Confirm the separately requested reset link reaches the password page; a second password change is unnecessary. Actual setup-email delivery and password completion are already confirmed.
2. Obtain written Stripe eligibility confirmation for the actual dues/prize model before live collection or disbursement. Stripe policy includes skill competitions with prizes and certain player fees. Checkout does not authorize player payouts. Global Payouts and Connect require a separately supported model, enablement, recipient eligibility and onboarding.
3. After eligibility is resolved, explicitly authorize any live activation and real charges, refunds or payouts. Test evidence does not prove live processing. No real charge, payout, or refund was made.
