// Disposable PostgreSQL integration checks; no network, credentials or production schema.
// PGLITE_MODULE=/tmp/lakes-payment-test/node_modules/@electric-sql/pglite/dist/index.js node scripts/verify-payments.mjs
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
// Reuse the audited legacy table/role/fixture definitions, not a simplified payment schema.
const original = await fs.readFile(new URL('./verify-auth-migration.mjs', import.meta.url), 'utf8');
const fixture = original.slice(original.indexOf('await db.exec(`') + 15, original.indexOf('`);\nconst legacyBefore'));
await db.exec(fixture);
for (const name of (await fs.readdir(new URL('../supabase/migrations/', import.meta.url))).sort()) {
  await db.exec(await fs.readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'));
}
const one = '00000000-0000-0000-0000-000000000001';
const two = '00000000-0000-0000-0000-000000000002';
const admin = '00000000-0000-0000-0000-000000000005';
let checks = 0;
async function ok(fn) { await fn(); checks++; }
async function denied(fn, pattern = /permission denied/) { await assert.rejects(fn, pattern); checks++; }
async function role(name, id='') { await db.exec(`reset role; set role ${name}; select set_config('request.jwt.claim.sub','${id}',false);`); }
const rpc = async (name, args) => (await db.query(`select public.${name}(${args.map((_,i)=>`$${i+1}`).join(',')}) result`,args)).rows[0].result;
for (const id of [one,two]) { await role('authenticated',id); await rpc('claim_league_player',[]); }
await role('authenticated',admin);
const record = entry => rpc('record_league_ledger_entry',[JSON.stringify({ id: 'fee', idempotencyKey:'fee', playerId:1,type:'charge',status:'posted',currency:'USD',amountCents:25000,description:'Fixture league fee',occurredAt:new Date().toISOString(),...entry })]);
await record({});
await denied(()=>record({id:'stripe:payment:reserved',idempotencyKey:'reserved'}),/reserved/);
await role('anon');
await denied(()=>rpc('league_prepare_checkout',[one,'acct_fixture',false]));
await role('authenticated',one);
await denied(()=>rpc('league_prepare_checkout',[one,'acct_fixture',false]));
await denied(()=>db.query('select * from league_private.stripe_orders'));
await denied(()=>db.query("update public.league_ledger_entries set provenance='stripe_verified'"));
await role('service_role');
await denied(()=>db.query('select * from league_private.stripe_orders'));
await denied(()=>rpc('league_payment_history',[one,2]),/Not your account/);
await denied(()=>rpc('league_prepare_checkout',['00000000-0000-0000-0000-000000000004','acct_fixture',false]),/Verified/);
await denied(()=>rpc('league_prepare_checkout',[two,'acct_fixture',false]),/No payable balance/);
let order = await rpc('league_prepare_checkout',[one,'acct_fixture',false]);
await ok(()=>assert.equal(Number(order.amount_cents),25000));
await denied(()=>rpc('league_prepare_checkout',[one,'acct_fixture',false]),/wait/);
await rpc('league_attach_checkout',[order.id,'cs_test_fixture']);
await denied(()=>rpc('league_attach_checkout',[order.id,'cs_test_other']),/mismatch/);
const event = (override={}) => ({event_id:'evt_paid',event_type:'checkout.session.completed',object_id:'cs_test_fixture',order_id:order.id,account_id:'acct_fixture',livemode:false,session_id:'cs_test_fixture',amount_cents:25000,currency:'usd',payment_intent_id:'pi_test_fixture',status:'paid',receipt_url:'https://pay.stripe.com/receipts/fixture',refunds:[],...override});
const apply = value => rpc('league_apply_stripe_event',[JSON.stringify(value)]);
await denied(()=>apply(event({amount_cents:1})),/mismatch/);
await denied(()=>apply(event({livemode:true})),/mismatch/);
await denied(()=>apply(event({account_id:'acct_wrong'})),/mismatch/);
await denied(()=>apply(event({session_id:'cs_other'})),/mismatch/);
await denied(()=>apply(event({receipt_url:'https://evil.example/'})),/receipt/);
await ok(async()=>assert.equal((await apply(event())).processed,true));
await ok(async()=>assert.equal((await apply(event())).duplicate,true));
await ok(async()=>assert.equal((await apply(event({event_id:'evt_async',event_type:'checkout.session.async_payment_succeeded'}))).processed,true));
await role('postgres');
await ok(async()=>assert.equal((await db.query("select count(*)::int n from public.league_ledger_entries where type='payment'")).rows[0].n,0));
await role('service_role');
await apply(event({event_id:'evt_old',status:'expired'}));
await ok(async()=>assert.equal((await rpc('league_payment_history',[one,null])).orders[0].status,'paid'));
await ok(async()=>assert.equal(Number((await rpc('league_payment_history',[one,null])).due_cents),25000));
await apply(event({event_id:'evt_ref_pending',refunds:[{id:'re_partial',amount_cents:5000,status:'pending'}]}));
await ok(async()=>assert.equal(Number((await rpc('league_payment_history',[one,null])).orders[0].refunded_cents),0));
await apply(event({event_id:'evt_ref_success',refunds:[{id:'re_partial',amount_cents:5000,status:'succeeded'}]}));
await apply(event({event_id:'evt_ref_old',refunds:[{id:'re_partial',amount_cents:5000,status:'pending'}]}));
await ok(async()=>assert.equal(Number((await rpc('league_payment_history',[one,null])).orders[0].refunded_cents),5000));
await apply(event({event_id:'evt_ref_failed',refunds:[{id:'re_failed',amount_cents:100,status:'failed'}]}));
await apply(event({event_id:'evt_ref_stale',refunds:[{id:'re_failed',amount_cents:100,status:'pending'}]}));
await ok(async()=>assert.equal((await rpc('league_payment_history',[one,null])).orders[0].refunds.find(r=>r.id==='re_failed').status,'failed'));
await denied(()=>apply(event({event_id:'evt_over',refunds:[{id:'re_extra',amount_cents:25000,status:'succeeded'}]})),/exceeds/);
await ok(async()=>assert.equal((await rpc('league_payment_history',[one,null])).orders[0].refunds.length,2));
await ok(async()=>assert.equal((await rpc('league_prepare_checkout',[one,'acct_fixture',false])).id,order.id));
// Simulated live settlement is disposable SQL only. No live Stripe API is contacted.
order = await rpc('league_prepare_checkout',[one,'acct_fixture',true]);
await rpc('league_attach_checkout',[order.id,'cs_live_fixture']);
await role('authenticated',admin);
await denied(()=>record({id:'manual',idempotencyKey:'manual',type:'payment',reference:'manual-receipt'}),/active Stripe/);
await role('service_role');
const live = override => event({event_id:'evt_live',livemode:true,session_id:'cs_live_fixture',payment_intent_id:'pi_live_fixture',...override});
await apply(live({}));
await apply(live({event_id:'evt_live_duplicate'}));
await role('postgres');
await ok(async()=>assert.equal((await db.query("select count(*)::int n from public.league_ledger_entries where type='payment' and provenance='stripe_verified'")).rows[0].n,1));
await role('service_role');
await ok(async()=>assert.equal(Number((await rpc('league_payment_history',[one,null])).due_cents),0));
await apply(live({event_id:'evt_live_refund',refunds:[{id:'re_live',amount_cents:1000,status:'succeeded'}]}));
await apply(live({event_id:'evt_live_refund_duplicate',refunds:[{id:'re_live',amount_cents:1000,status:'succeeded'}]}));
await ok(async()=>assert.equal(Number((await rpc('league_payment_history',[one,null])).due_cents),1000));
await role('authenticated',admin);
await denied(()=>record({id:'manual-refund',idempotencyKey:'manual-refund',type:'refund',amountCents:100,reference:'manual-refund',relatedEntryId:`stripe:payment:${order.id}`}),/confirmed by Stripe/);
await role('service_role');
await ok(async()=>assert.equal((await rpc('league_payment_history',[admin,1])).orders.length,2));
await ok(async()=>assert.equal((await rpc('league_payment_history',[two,null])).orders.length,0));
await role('postgres');
await ok(async()=>assert.equal((await db.query("select count(*)::int n from public.league_ledger_entries where type='refund'")).rows[0].n,1));
await ok(async()=>assert.equal((await db.query("select count(*)::int n from league_private.stripe_events where id='evt_over'")).rows[0].n,0));
await db.close();
console.log(`Passed ${checks} payment ownership, permissions, isolation, settlement and refund checks on disposable PostgreSQL. No real Stripe processing tested.`);
