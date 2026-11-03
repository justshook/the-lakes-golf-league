# Registration and commissioner approval

The signed-out homepage shows only the sign-in card. **Not Registered? Sign Up Here** opens `/register`. Email setup sends a verification link before a password is chosen. Both existing and new accounts use the same response, avoiding an unauthenticated roster-email lookup. A verified email that uniquely matches the roster links the original player ID and history; it does not create a new application or player.

New verified applicants provide first/last name, phone, one **Handicap ID (GHIN or CDGA)**, 18-hole handicap index, available league tee times, and full-time/substitute membership. They submit a private application. Pending and rejected applications are never public roster rows. The commissioner reviews them in `/admin` and confirms approval or rejection. Approval atomically creates and links a new player, records the decision, and queues the applicant email. New IDs use a private allocator seeded above existing IDs; historical players are never overwritten. Repeated submissions and repeated identical decisions return the existing result.

Full-time registration is **$180 for 2027**; substitute registration is **$0**. These amounts are decided in the database. Substitute Checkout is denied server-side, including existing substitutes. Approval does not collect money. Approved full-time applicants are sent to the authenticated `/registration/payment` page; approved substitutes can open their schedule. Live Stripe collection remains disabled pending the existing provider eligibility and explicit live approval requirements. A test payment does not satisfy a real registration fee.

## Notifications

Supabase Auth SMTP continues to send account verification/reset messages. Application/decision emails are sent separately by the Vercel backend using hidden `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASSWORD` values. Use a dedicated App Password or transactional SMTP credential, never a normal Google password. The backend enforces TLS, disables SMTP logging and attachment/file/URL access, and uses fixed sender/subjects. Applicant addresses come from the fresh verified identity; commissioner addresses come from trusted admin metadata.

The private notification outbox is committed with the application or decision, with a unique message per event/recipient. SMTP acceptance is recorded separately from the decision. Transport failure does not lose an application or reverse approval. The dashboard shows queued, sent, failed and unconfirmed delivery, and allows a commissioner to retry queued/failed messages with bounded attempts/backoff. There is no autonomous retry worker in this release. A stale send lease or ambiguous SMTP result becomes unconfirmed and requires review before any resend. SMTP acceptance is not proof that the recipient opened or received the email. Message IDs are stable, but SMTP cannot guarantee exactly-once delivery across a network failure.

## Migration and checks

The five previously installed migration versions have recorded CLI history. Never rerun them. The additive `20261101200447_league_registration_approval.sql` creates private application/notification tables and a private ID allocator, then enforces substitute fee exemption in the existing dues RPCs. Take a private backup and check `supabase db push --linked --dry-run` lists only this new migration before applying it.

`npm test` includes client validation and API/notification tests. `scripts/verify-registrations.mjs` runs isolated PostgreSQL permission, ownership, decision, allocator, delivery-state, fee and preservation checks. The controlled browser regression uses synthetic account/API responses; it is not real email or Stripe evidence. Record actual deployed checks separately and preserve original player/score/prize fingerprints.

## Verification recorded November 1, 2026

- 105 automated tests, production build, and 109 independent disposable PostgreSQL registration checks pass. The existing 55 auth/ledger, 34 object-privilege and 53 payment SQL checks also pass.
- Controlled browser regressions pass account setup/reset, signed-out card-only homepage, full-time/substitute registration and approval routing, commissioner decisions and notification retry states at 320/390/1280 pixels. These use mocked services and do not prove actual notification delivery.
- The protected preview was inspected with real Google sign-in and the existing commissioner account. The new approval dashboard loads and the original player history is preserved.
- The additive migration is installed with recorded history. Original complete-row fingerprints remain unchanged: 52 players, 402 scores, 140 prize records. Public RLS remains enabled and the security advisor reports zero errors.
- Gmail host, port, sender and the approved hidden App Password are configured in Vercel. Actual application/approval notification checks are in progress.
