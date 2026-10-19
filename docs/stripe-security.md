# Payment security and Stripe readiness

## Current status

The app currently records league accounting entries. It does **not** create Stripe Checkout sessions, charge cards, receive Stripe webhooks, or transfer winnings. There is no card-entry form or dedicated card-data storage. Historical winnings are awards, not evidence of transferred money.

The reviewed database changes restrict ledger reads to the linked player or commissioner and ledger writes to an administrator-checked RPC. They validate integer cents, preserve immutable records, deduplicate idempotency keys and posted cash references, serialize per-player writes, prevent refunds above the original recorded payment, and constrain recorded payouts to recorded awards. The source passed the local account, ledger, and privilege checks described in `implementation-review.md`.

**These source protections must not be confused with deployed protections.** The live database was inspected, but two migration attempts failed with `Invalid or expired requestState`. The reviewed migrations were not installed, and the live data was verified unchanged. Database hardening and live access checks remain prerequisites to accepting money.

No unprivileged ledger-write bypass was identified in the reviewed source. This review is not a claim of an independent production penetration test.

## Current verification boundary

The commissioner's recorded payment or payout is a manual assertion. Its receipt reference is free text; a `posted` status or “Confirmed” label does not mean Stripe verified a transaction. This is the material integration gap: an automated payment system must never treat an arbitrary existing manual entry as provider evidence.

Before integrating Stripe, add immutable provenance such as `manual_external` and `stripe_verified`. Only a trusted server processor may create provider-verified entries and assign provider object IDs. Display manual and provider-confirmed evidence distinctly. The current manual ledger must not initiate charges or payouts.

Descriptions and receipt fields must never contain card numbers, CVCs, expiry details, bank credentials, or copied webhook bodies. They are accounting notes, not a place to collect payment credentials.

## Required payment design

1. **Use Stripe-hosted Checkout.** Customers enter payment information on Stripe's hosted page. Do not route card data through app servers, Supabase, browser storage, analytics, error reporting, or application logs. Hosted Checkout reduces exposure; it does not eliminate the merchant's security responsibilities.
2. **Create sessions on the server.** Authenticate the request and derive the player from the verified account link. Resolve the fee, order, amount in integer cents, currency, and league from trusted server records. Do not accept a browser-supplied player ID or payable amount as authoritative. Store an immutable order snapshot and check ownership and existing payment status before creating a session.
3. **Keep secrets server-side.** Use separate test and live environments and appropriately restricted keys. Never put secret keys, webhook secrets, or Supabase privileged credentials in `VITE_*` variables, browser bundles, source control, or logs. Use HTTPS, fixed allowed return URLs, and request rate limits.
4. **Settle only from verified server evidence.** A success-page visit, browser response, or client-supplied session ID is not proof of payment. Verify the webhook signature using the unchanged raw request body, the endpoint signing secret, and Stripe's SDK with timestamp checks. Reject invalid signatures and unexpected account or test/live context. Allowlist handled event types.
5. **Check the business record before posting.** For Checkout completion or asynchronous payment success, require a verified paid state and match the expected order, amount, currency, account context, and provider object IDs. Fetch the relevant Stripe object server-side when necessary. A completed Checkout session with payment still pending must remain unpaid in the ledger.
6. **Make settlement durable and idempotent.** Persist unique event IDs and unique settlement identities tied to the payment/order, so separate events for one payment cannot credit it twice. Update order state and the corresponding ledger entry atomically. Acknowledge delivery only after durable enqueueing or successful processing. Handle concurrent retries and out-of-order events without reversing a newer state.

Refunds must be authorized server-side, tied to the settled original payment, limited to its remaining refundable cents, and issued with stable idempotency keys. Keep requests pending until verified provider status confirms the refund; use unique refund IDs to prevent duplicate deductions. Reconcile failed refunds and disputes separately. Neither a refund request nor a dispute should silently initiate or reverse a prize payout. Automated prize payouts require their own approved, provider-supported design and are outside the current implementation.

## Minimal private payment records

| Record | Store | Access |
| --- | --- | --- |
| Payment order | Internal order/player/league references, immutable amount and currency, status, Checkout session and payment IDs, account/test-live context, timestamps | Server writes; player reads a limited summary of their own orders |
| Event processing receipt | Unique event ID, event type, relevant object ID, account/test-live context, received/processed timestamps, attempts, bounded error code | Private server processing only |
| Refund | Unique provider refund ID, original payment reference, cents, currency, status, timestamps | Server writes; limited owner summary |
| Ledger provenance | Manual/provider source, unique settlement reference, order reference, recording actor | Immutable server-controlled fields; existing self/admin read boundary |

Do not persist full webhook JSON by default. Verify the raw body in memory and retain only fields required for processing, reconciliation, and audit. Do not copy customer addresses, email, card details, or other unrelated provider data into metadata or event logs. Keep the processing queue and operational errors inaccessible to browser clients. Use explicit retention and log-redaction rules.

## Checks required before enabling live payments

Exercise tampered amounts and player IDs, another player's order access, unsigned and replayed webhooks, delayed payments, duplicate and concurrent events, out-of-order events, excessive refunds, test/live mismatches, and fabricated success redirects. Verify that direct database writes cannot forge provider confirmation and that logs, analytics, errors, and client bundles contain neither secrets nor payment credentials. Reconcile the provider's settled totals with the ledger in test mode before enabling live collection.

No live Stripe configuration, charge, refund, or payout was created as part of this work.

## Official references

- [Stripe integration security guide](https://docs.stripe.com/security/guide)
- [Stripe webhooks: signatures, delivery, and event handling](https://docs.stripe.com/webhooks)

The integration direction also follows the installed `stripe-best-practices` skill: hosted Checkout for one-time payments and server-side webhook fulfillment gated on verified payment status.
