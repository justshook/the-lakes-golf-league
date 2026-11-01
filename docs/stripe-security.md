# Payment security and Stripe activation

## Implementation and verification boundary

The app implements Stripe-hosted Checkout for a one-time **2027 Lakes League Dues** purchase of **$180 USD**, with no automatic renewal. The catalog, amount, currency, player ownership, and season are resolved on the server. The browser cannot supply those values. Checkout is disabled unless explicitly configured, and live mode additionally requires `STRIPE_LIVE_APPROVED=true`.

The three original account, ledger, and privilege migrations are installed in production. The new Stripe Checkout and annual-dues migrations are separate activation steps. Inspect the live schema and repair the history for the original three versions through the supported CLI workflow before any migration push; never rerun their SQL against production.

Local verification covers server logic with mocked Stripe/Supabase responses, real Stripe SDK signature validation with a local test signing secret, and actual SQL permissions/transactions in a disposable PostgreSQL runtime. Those checks do **not** prove Google sign-in, email delivery, real Stripe Checkout, webhook delivery, receipt availability, or production settlement. Provider configuration, migration activation, a real test-mode purchase, and end-to-end reconciliation must be verified separately before enabling live collection.

## Hosted Checkout and server identity

The server verifies the access token with Supabase Auth `getUser`, requires a confirmed email, and resolves the player through the private account link. It reads the annual product from the trusted database catalog and checks it against the reviewed server product definition. Stable product IDs, price lookup keys, and idempotency keys prevent duplicate catalog creation and Checkout creation during retries. Stripe starts the session lifetime when creation succeeds; a stale database deadline cannot strand a first creation after an outage.

A private unique purchase constraint and per-player transaction lock prevent duplicate outstanding or settled purchases for the same season and mode. Existing unclassified manual money records require season reconciliation before another annual purchase. Refunds and disputes retain the purchase slot for commissioner review. Checkout cancellation returns to the app without treating a return URL as proof of either payment or final cancellation; an open session can be resumed. Failed card attempts remain in Checkout for retry, while final asynchronous failure and session expiration are reconciled through verified webhooks.

Secrets belong in sensitive server environment variables. Never put Stripe secret/restricted keys, webhook signing secrets, Google client secrets, or Supabase privileged keys in `VITE_*`, source control, browser storage, logs, analytics, or error messages. Use a restricted Stripe key with only the required permissions where supported. Checkout routes enforce the configured app origin and fixed return URLs. The application does not accept or store card numbers, CVCs, expiry details, bank credentials, or full provider payloads.

## Verified settlement and immutable accounting

The webhook route reads unchanged request bytes and verifies the Stripe signature and timestamp with the Stripe SDK before processing. It checks test/live and account context, allowlists event types, and re-fetches the current provider objects so a stale event body is not settlement evidence. Both `checkout.session.completed` and `checkout.session.async_payment_succeeded` require a paid session, a matching successful PaymentIntent, and matching charge, amount, currency, order, product, and season metadata.

The processor acknowledges only after the database transaction succeeds. Unique event IDs, unique session/intent identities, stable settlement ledger IDs, per-player locks, and atomic order/ledger writes protect against retries and repeated completion events. Terminal payment and refund states resist older pending snapshots. Only narrowly granted server RPCs can write provider records; browser roles and manual ledger RPCs cannot forge `stripe_verified` provenance.

Test orders and refunds never modify real league balances. A live annual settlement atomically posts both its season charge and its confirmed payment. Player profile/payment history and commissioner views expose limited owner/admin summaries, safe Stripe receipt links, test/live labels, refund state, and dispute state. Manual external records remain visibly distinct from Stripe-confirmed entries.

## Refunds, disputes, and winnings

The app does not initiate Stripe refunds or payouts. Refunds require an explicit authorized action in Stripe, then `refund.created`, `refund.updated`, `refund.failed`, or `charge.refunded` delivery reconciles provider status. Pending and failed refunds are not deducted as completed refunds. Successful refunds are deduplicated by provider refund ID and cannot exceed the original payment. Manual ledger entries cannot refund Stripe-confirmed payments.

Dispute events mark the purchase for commissioner reconciliation. A current won/closed inquiry can restore the payment status; disputes do not automatically create a refund or initiate/reverse prize payouts. The ledger records the historical payment and any verified refunds; disputed funds require separate reconciliation rather than silently changing prize accounting.

Historical winnings are awards, not evidence of money transferred. Collecting dues through Checkout does not provide permission or functionality to pay players. A separate provider-supported payout design, eligibility review, and explicit authorization are required. No payout API is exposed by this implementation.

Stripe's current [prohibited and restricted businesses policy](https://stripe.com/legal/restricted-businesses) includes games of skill with monetary/material prizes and entry/player fees promising prizes. Its [policy FAQ](https://support.stripe.com/questions/prohibited-and-restricted-businesses-list-faqs) explains that legality alone does not establish supportability. Because this league records cash prizes, the actual dues allocation and prize model require written Stripe eligibility confirmation before live collection or winnings disbursement. Do not relabel prize funding as ordinary dues to bypass this review.

If Stripe confirms the use case is eligible, [Global Payouts](https://docs.stripe.com/global-payouts) is the direct-to-recipient option to assess: recipients need not hold Stripe accounts, while the sender must be enabled for that product, satisfy country and recipient requirements, and fund the separate payout flow. Connect is appropriate only for an approved platform/connected-account model with recipient onboarding and active transfer capabilities. [Stripe's comparison](https://docs.stripe.com/connect/cross-border-payouts-to-recipients/compare-global-payouts) distinguishes these flows and their compliance responsibilities. Neither product's availability is implied by Checkout activation; an ordinary payout to the league's own bank is not a third-party player disbursement.

## Activation checks

Configure a Stripe test environment and matching server account/mode, signing secret, app origin, and Supabase credentials. Apply only the new reviewed migrations after reconciling history. Verify a hosted test purchase, cancellation/resumption, declined card retry, asynchronous outcomes where enabled, signed webhook retries, duplicate/concurrent settlement, receipts, partial/full/failed refunds, ownership isolation, and provider-to-database reconciliation. Verify no secrets or payment details reach the client bundle or logs. A fabricated success URL must never change payment status.

Before live collection, complete account/business eligibility checks and explicitly authorize the live configuration. Ask before any real charge, refund, or payout. No live financial transaction is evidence from the local checks described above.

## Official references

- [Stripe integration security guide](https://docs.stripe.com/security/guide)
- [Stripe webhooks: signatures, delivery, and event handling](https://docs.stripe.com/webhooks)
- [Checkout Session creation and expiration](https://docs.stripe.com/api/checkout/sessions/create)
- [Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment)
