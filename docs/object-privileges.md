# League object permissions

The account and ledger migrations replace legacy permissive policies with explicit
public sporting reads, private player records, and checked commissioner/player RPCs.
The third migration, `20261019025446_harden_league_object_privileges.sql`, closes the
remaining object privileges addressed by this change. It was applied through the
Supabase SQL Editor on 2026-10-24 after the account and ledger migrations. Live catalog
checks confirmed the intended grants and unchanged historical data. See `auth-setup.md`
for the required CLI migration-history reconciliation before future deployments.

It removes anonymous/authenticated/PUBLIC access to existing public sequences. Table
RLS does not protect `nextval`, `setval`, or sequence reads. Score submission still
works through the checked function owned by the trusted database role. Old direct
browser inserts that depend on a serial sequence are intentionally unsupported.
It also revokes public-schema creation and prevents automatic API grants on future
public tables, sequences, and functions created by `postgres`.

PostgreSQL gives `PUBLIC` function execution globally by default. Revoking it only
within `public` cannot cancel that global grant, so the migration revokes the global
default for future `postgres` functions. This does not change existing function
permissions. Future functions created by `postgres` in any schema will need explicit
execution grants. Existing Auth, Storage, and Realtime objects are untouched.

The managed `supabase_admin` role has separate defaults. The audited `postgres`
connection cannot assume that role, so this migration deliberately leaves its
defaults alone. This is a remaining platform-owner setting, not an application API
grant. Future league migrations must use `postgres`, enable RLS where appropriate,
grant only intended access, and inspect the resulting grants and security advisors.
Objects created through another owner still require review before use.

`service_role` access is retained for trusted server work. Its key must never enter
browser code. A future Stripe integration must verify webhook signatures and event
identity server-side before posting a payment, use event IDs for idempotency, and
obtain player/amount/currency from trusted records. The current commissioner ledger
RPC records external receipts; it does not verify Stripe settlement or move money.

Verification runs against disposable PostgreSQL with the audited permissive grants:

```sh
PGLITE_MODULE=/tmp/lakes-db-test/node_modules/@electric-sql/pglite/dist/index.js node scripts/verify-object-privileges.mjs
```

The checks cover blocked sequence mutation/read, no schema creation, preservation
of rows/sequence state/existing intentional APIs/platform-owner ACLs, private future
objects even before RLS is configured, retained server access, and repeat application.
The separate account migration harness checks ownership, RLS, frozen scoring, and
ledger balance rules. After live application, recheck actual catalog grants and API
behavior; disposable tests are not a substitute for verifying the deployed database.
